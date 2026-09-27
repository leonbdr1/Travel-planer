// Contract tests: schemas and mapping against the (synthetic) sample
// responses in fixtures/. Replace the samples with recorded sandbox
// responses in O2.2; these tests must keep passing.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapRatesResponse, mapReviews } from '../src/liteapi/map';
import { bookResponseSchema, prebookResponseSchema, ratesResponseSchema, reviewsResponseSchema } from '../src/liteapi/schemas';

const fixture = (name: string): unknown => JSON.parse(readFileSync(resolve(import.meta.dirname, '../fixtures', name), 'utf8'));

describe('LiteAPI contract (synthetic fixtures)', () => {
  it('parses and maps /hotels/rates', () => {
    const { rates, hotels } = mapRatesResponse(ratesResponseSchema.parse(fixture('liteapi/rates.json')));
    expect(hotels).toEqual([
      expect.objectContaining({ id: 'lp1a2b3c', stars: 3, rating: 8.6, ratingScale: 10, reviewCount: 412, countryCode: 'DE' }),
    ]);
    const [flex, nonref] = rates[0]!.options;
    expect(flex).toMatchObject({
      offerId: 'offer-flex-1',
      totalCents: 21200,
      suggestedSellingCents: 22050,
      boardType: 'BB',
      refundable: true,
      cancelPolicy: [{ from: '2026-09-30T16:00:00Z', penaltyCents: 10600, currency: 'EUR' }],
    });
    expect(flex!.taxes).toEqual([
      { amountCents: 1387, currency: 'EUR', included: true, description: 'VAT' },
      { amountCents: 640, currency: 'EUR', included: false, description: 'City tax' },
    ]);
    expect(nonref).toMatchObject({ totalCents: 18800, boardType: 'RO', refundable: false, taxes: null });
  });

  it('drops reviewer names and keeps the sentiment categories', () => {
    const result = mapReviews(reviewsResponseSchema.parse(fixture('liteapi/reviews.json')));
    expect(JSON.stringify(result)).not.toContain('REDACTED');
    expect(result.reviews[1]).toMatchObject({ id: 'r1', score: 5, date: '2026-06-02', language: 'nl' });
    expect(result.sentiment?.categories).toContainEqual({ name: 'Cleanliness', rating: 7.9 });
  });

  it('parses prebook and book responses', () => {
    expect(prebookResponseSchema.parse(fixture('liteapi/prebook.json')).data.transactionId).toBe('tx-abc');
    expect(bookResponseSchema.parse(fixture('liteapi/book.json')).data.hotelConfirmationCode).toBe('HC-4711');
  });
});
