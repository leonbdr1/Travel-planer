import { describe, expect, it } from 'vitest';
import { createProviders, ProviderError, type ProvidersConfig } from '../src';
import { createLiteApiClient } from '../src/liteapi/client';
import { createFakeLiteApiFetch } from '../src/fake/liteapi-fetch';

const config: ProvidersConfig = {
  mode: 'fake',
  liteapi: { baseUrl: 'https://api.liteapi.travel/v3.0', bookBaseUrl: 'https://book.liteapi.travel/v3.0' },
  ors: { baseUrl: 'https://api.heigit.org/openrouteservice' },
  resend: {},
  anthropic: {},
};
const oberstdorf = { lat: 47.4099, lng: 10.2797 };
const request = {
  ...oberstdorf,
  radiusKm: 10,
  checkin: '2026-10-02',
  checkout: '2026-10-04',
  occupancies: [{ adults: 2, childrenAges: [] }],
  currency: 'EUR',
  guestNationality: 'DE',
  timeoutS: 6,
  limit: 200,
};
const noSleep = async () => {};
const now = () => new Date('2026-09-27T08:00:00Z');

describe('simulated LiteAPI through the real client', () => {
  it('returns deterministic hotels with valid offers', async () => {
    const { liteapi } = createProviders(config, { now });
    const a = await liteapi.searchRates(request);
    const b = await liteapi.searchRates(request);
    expect(a).toEqual(b);
    expect(a.rates.length).toBeGreaterThan(2);
    for (const hotel of a.rates) {
      expect(hotel.options.length).toBeGreaterThan(0);
      for (const option of hotel.options) {
        expect(option.totalCents).toBeGreaterThan(5000);
        expect(option.currency).toBe('EUR');
        expect(option.cancelPolicy.length).toBe(1);
      }
    }
    expect(a.hotels.map((h) => h.id).sort()).toEqual(a.rates.map((r) => r.hotelId).sort());
  });

  it('counts every HTTP attempt and retries 429 twice before succeeding', async () => {
    const calls: string[] = [];
    const { liteapi } = createProviders(config, {
      now,
      sleep: noSleep,
      onCall: (provider, endpoint) => calls.push(`${provider}:${endpoint}`),
      fake: { faults: [{ endpoint: 'hotels/rates', status: 429, times: 2 }] },
    });
    const result = await liteapi.searchRates(request);
    expect(result.rates.length).toBeGreaterThan(0);
    expect(calls).toEqual(['liteapi:hotels/rates', 'liteapi:hotels/rates', 'liteapi:hotels/rates']);
  });

  it('gives up after two retries on persistent 5xx', async () => {
    const { liteapi } = createProviders(config, { now, sleep: noSleep, fake: { faults: [{ endpoint: 'hotels/rates', status: 503, times: 3 }] } });
    await expect(liteapi.searchRates(request)).rejects.toMatchObject({ kind: 'server', status: 503 });
  });

  it('does not retry other client errors and reports malformed JSON and timeouts', async () => {
    const make = (fault: 'malformed' | 'timeout' | 400) =>
      createLiteApiClient({
        apiKey: 'k',
        baseUrl: config.liteapi.baseUrl,
        bookBaseUrl: config.liteapi.bookBaseUrl,
        fetch: createFakeLiteApiFetch({ now, faults: [{ endpoint: 'data/facilities', status: fault, times: 5 }] }),
        sleep: noSleep,
        timeoutMs: 50,
      });
    await expect(make(400).getFacilities()).rejects.toMatchObject({ kind: 'client', status: 400 });
    await expect(make('malformed').getFacilities()).rejects.toMatchObject({ kind: 'bad_response' });
    await expect(make('timeout').getFacilities()).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('fails persistently for configured combinations (failEvery)', async () => {
    const { liteapi } = createProviders(config, { now, sleep: noSleep, fake: { failEvery: 1 } });
    await expect(liteapi.searchRates(request)).rejects.toBeInstanceOf(ProviderError);
  });

  it('runs prebook → book → cancel and rejects a foreign transaction id', async () => {
    const { liteapi } = createProviders(config, { now });
    const offer = (await liteapi.searchRates(request)).rates[0]!.options.find((o) => o.refundable)!;
    const prebook = await liteapi.prebook(offer.offerId);
    expect(prebook.transactionId).toMatch(/^tx_fake_/);
    expect(prebook.secretKey).toMatch(/^fake_sk_/);
    const holder = { firstName: 'Max', lastName: 'Muster', email: 'max@example.org', phone: null };
    const guests = [{ occupancyNumber: 1, firstName: 'Max', lastName: 'Muster' }];
    await expect(
      liteapi.book({ prebookId: prebook.prebookId, transactionId: 'tx_wrong', holder, guests, clientReference: 'ABC' }),
    ).rejects.toMatchObject({ kind: 'client' });
    const booked = await liteapi.book({ prebookId: prebook.prebookId, transactionId: prebook.transactionId!, holder, guests, clientReference: 'ABC' });
    expect(booked.status).toBe('CONFIRMED');
    expect(booked.hotelConfirmationCode).toMatch(/^HCN-\d{6}$/);
    const cancelled = await liteapi.cancelBooking(booked.bookingId);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellationFeeCents).toBe(0);
    expect(cancelled.refundCents).toBe(prebook.totalCents);
  });

  it('serves hotel details, reviews without author names and facilities', async () => {
    const { liteapi } = createProviders(config, { now });
    const hotelId = (await liteapi.searchRates(request)).rates[0]!.hotelId;
    const details = await liteapi.getHotel(hotelId);
    expect(details.id).toBe(hotelId);
    expect(details.photos.length).toBeGreaterThan(0);
    const reviews = await liteapi.getReviews(hotelId, { limit: 100, withSentiment: true });
    expect(reviews.reviews.length).toBeGreaterThan(0);
    expect(reviews.reviews.every((r) => !Object.keys(r).includes('name'))).toBe(true);
    expect((await liteapi.getFacilities()).length).toBeGreaterThan(10);
  });

  it('sends the texts in German on request, as HTML like the real API, and falls back when the language is refused', async () => {
    const { liteapi } = createProviders(config, { now });
    const hotelId = (await liteapi.searchRates(request)).rates[0]!.hotelId;
    const de = await liteapi.getHotel(hotelId, { language: 'de' });
    expect(de.description).toMatch(/^<p><strong>/);
    expect(de.importantInformation).toContain('Junggesellenabschiede');
    expect((await liteapi.getHotel(hotelId)).importantInformation).toContain('This property does not accommodate');
    // ⟂ `language` is unverified against the live API: a 400 must not cost the details.
    const fake = createFakeLiteApiFetch({ now });
    const urls: string[] = [];
    const refusing = createLiteApiClient({
      apiKey: 'key',
      baseUrl: 'https://api.liteapi.travel/v3.0',
      bookBaseUrl: 'https://book.liteapi.travel/v3.0',
      sleep: noSleep,
      fetch: async (url, init) => {
        urls.push(url);
        return url.includes('language=') ? new Response('{"error":{"code":400,"message":"unknown parameter"}}', { status: 400 }) : fake(url, init);
      },
    });
    expect((await refusing.getHotel(hotelId, { language: 'de' })).id).toBe(hotelId);
    expect(urls.map((u) => new URL(u).searchParams.get('language'))).toEqual(['de', null]);
  });

  it('refuses to call a real provider without an API key', async () => {
    const { liteapi } = createProviders({ ...config, mode: 'sandbox' }, { fetch: async () => new Response('{}') });
    await expect(liteapi.getFacilities()).rejects.toMatchObject({ kind: 'not_configured' });
  });
});
