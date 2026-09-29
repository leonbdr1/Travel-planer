// Simulated LiteAPI at the HTTP level: a `fetch` replacement that answers the
// v3.0 endpoints with deterministic data from ./world. The real client code
// (schemas, mapping, retries) runs unchanged on top of it.
import type { FetchLike } from '../http/request';
import { base64UrlDecode, base64UrlEncode, hashString, seeded } from './random';
import {
  addDays,
  anchorOf,
  decodeOffer,
  encodeOffer,
  FAKE_FACILITIES,
  hotelById,
  hotelsAt,
  offersFor,
  reviewsFor,
  sentimentFor,
  type FakeHotel,
  type FakeOccupancy,
  type FakeOffer,
  type PricedOffer,
} from './world';

export interface FakeFault {
  endpoint: string;
  status: number | 'timeout' | 'malformed';
  times: number;
}

export interface FakeLiteApiOptions {
  now?: () => Date;
  /** Average simulated latency per call in ms (0 = none). */
  latencyMs?: number;
  /** Every n-th (place, check-in) combination fails persistently with HTTP 500. 0 disables. */
  failEvery?: number;
  /** One-off faults consumed in order (tests, demos). */
  faults?: FakeFault[];
}

interface FakePrebook extends FakeOffer {
  tx: string;
}

const eur = (cents: number) => Math.round(cents) / 100;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function error(status: number, message: string): Response {
  return json({ error: { code: status, message } }, status);
}

function hotelInfo(h: FakeHotel) {
  return {
    id: h.id,
    name: h.name,
    main_photo: h.photo,
    address: h.address,
    city: null,
    country: null,
    latitude: h.lat,
    longitude: h.lng,
    stars: h.stars,
    rating: h.rating,
    reviewCount: h.reviewCount,
    hotelType: h.kind,
    facilityIds: h.facilityIds,
  };
}

function rateFor(offer: PricedOffer, hotel: FakeHotel, share: number, occupancyNumber: number) {
  const total = offer.t * share;
  const board = { RO: 'Nur Übernachtung', BB: 'Frühstück inklusive', HB: 'Halbpension' }[offer.b];
  const taxes = hotel.taxesKnown
    ? [
        { included: true, description: 'MwSt. 7 %', amount: eur((total * 0.07) / 1.07), currency: offer.c },
        ...(offer.cityTaxCents > 0
          ? [{ included: false, description: 'Kurtaxe (vor Ort zu zahlen)', amount: eur(offer.cityTaxCents * share), currency: offer.c }]
          : []),
      ]
    : null;
  const cancel = offer.rf
    ? {
        cancelPolicyInfos: [
          { cancelTime: `${addDays(offer.ci, -2)} 16:00:00`, amount: eur(offer.firstNightCents * share), currency: offer.c, type: 'amount', timezone: 'GMT' },
        ],
        refundableTag: 'RFN',
      }
    : {
        cancelPolicyInfos: [{ cancelTime: `${addDays(offer.ci, -400)} 00:00:00`, amount: eur(total), currency: offer.c, type: 'amount', timezone: 'GMT' }],
        refundableTag: 'NRFN',
      };
  return {
    rateId: `${offer.r}-${offer.b}-${offer.rf ? 'flex' : 'nr'}-${occupancyNumber}`,
    occupancyNumber,
    name: offer.room.name,
    maxOccupancy: offer.room.maxOccupancy,
    boardType: offer.b,
    boardName: board,
    retailRate: {
      total: [{ amount: eur(total), currency: offer.c }],
      suggestedSellingPrice: [{ amount: eur(total * 1.04), currency: offer.c, source: 'fake' }],
      ...(taxes ? { taxesAndFees: taxes } : {}),
    },
    cancellationPolicies: cancel,
  };
}

/** Description (HTML) and important information (lines) as the real API sends them. */
function hotelTexts(hotel: FakeHotel, language: 'de' | 'en'): { description: string; important: string | null } {
  const flat = hotel.kind === 'Ferienwohnung' || hotel.kind === 'Apartments';
  if (language === 'de') {
    const notes = [
      'Junggesellenabschiede und ähnliche Feiern sind in dieser Unterkunft nicht gestattet.',
      ...(hotel.cityTaxCentsPerPersonNight > 0 ? ['Die Kurtaxe wird vor Ort erhoben.'] : []),
      ...(flat ? ['Die Unterkunft wird von privaten Gastgebern geführt.', 'Vor Ort kann eine Kaution verlangt werden.'] : []),
    ];
    return {
      description:
        `<p><strong>${hotel.name}</strong></p><p>Das ${flat ? 'Ferienquartier' : 'Haus'} bietet ${hotel.rooms.length} Zimmerkategorien und liegt im Ort. ` +
        `Die Beschreibung ist simuliert (Entwicklungsmodus).</p><p><strong>Ausstattung</strong><br />Kostenloses WLAN &amp; Parkplatz.</p>`,
      important: notes.join('\n'),
    };
  }
  const notes = [
    'This property does not accommodate bachelor(ette) or similar parties.',
    ...(hotel.cityTaxCentsPerPersonNight > 0 ? ['The city tax is collected at the property.'] : []),
    ...(flat ? ['Managed by a private host', 'A deposit may be required at the property.'] : []),
  ];
  return {
    description:
      `<p><strong>Charming accommodation: ${hotel.name}</strong></p><p>The ${flat ? 'holiday home' : 'property'} offers ${hotel.rooms.length} room types and is located in the town. ` +
      `This description is simulated (development mode).</p><p><strong>Amenities</strong><br />Free WiFi &amp; parking.</p>`,
    important: notes.join('\n'),
  };
}

function strip(offer: PricedOffer): FakeOffer {
  return { h: offer.h, ci: offer.ci, co: offer.co, o: offer.o, r: offer.r, b: offer.b, rf: offer.rf, t: offer.t, c: offer.c };
}

export function createFakeLiteApiFetch(options: FakeLiteApiOptions = {}): FetchLike {
  const now = options.now ?? (() => new Date());
  const faults = [...(options.faults ?? [])];
  const failEvery = options.failEvery ?? 0;

  const takeFault = (endpoint: string): FakeFault | undefined => {
    const fault = faults.find((f) => f.endpoint === endpoint && f.times > 0);
    if (fault) fault.times -= 1;
    return fault;
  };

  return async (input, init) => {
    const url = new URL(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/v3\.0/, '');
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    const endpoint =
      path === '/hotels/rates'
        ? 'hotels/rates'
        : path.startsWith('/bookings/')
          ? method === 'PUT'
            ? 'bookings/cancel'
            : 'bookings/get'
          : path.slice(1);

    if (options.latencyMs) {
      const r = seeded('latency', input, String(init?.body ?? ''))();
      await new Promise((resolve) => setTimeout(resolve, options.latencyMs! * (0.5 + r)));
    }

    const fault = takeFault(endpoint);
    if (fault) {
      if (fault.status === 'timeout') {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        });
      }
      if (fault.status === 'malformed') return new Response('{"data": [ {"hotelId": 1', { status: 200 });
      return error(fault.status, `injected fault ${fault.status}`);
    }

    switch (endpoint) {
      case 'hotels/rates': {
        const lat = Number(body.latitude);
        const lng = Number(body.longitude);
        const checkin = String(body.checkin);
        const checkout = String(body.checkout);
        const currency = String(body.currency ?? 'EUR');
        const margin = typeof body.margin === 'number' ? body.margin : 0;
        const occupancies = (body.occupancies as Array<{ adults: number; children?: number[] }>).map(
          (o): FakeOccupancy => ({ adults: o.adults, children: o.children ?? [] }),
        );
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !/^\d{4}-\d{2}-\d{2}$/.test(checkin)) {
          return error(400, 'invalid request');
        }
        const { latE2, lngE2 } = anchorOf(lat, lng);
        if (failEvery > 0 && hashString(`fail|${latE2}|${lngE2}|${checkin}`) % failEvery === 0) {
          return error(500, 'supplier timeout');
        }
        const hotels = hotelsAt(lat, lng);
        const data: unknown[] = [];
        const infos: unknown[] = [];
        for (const hotel of hotels) {
          const offers = offersFor(hotel, checkin, checkout, occupancies, currency).map((o) => ({
            ...o,
            t: Math.round(o.t * (1 + margin / 100)),
          }));
          if (offers.length === 0) continue;
          infos.push(hotelInfo(hotel));
          data.push({
            hotelId: hotel.id,
            roomTypes: offers.map((offer) => {
              const shares = occupancies.map(() => 1 / occupancies.length);
              return {
                roomTypeId: offer.r,
                offerId: encodeOffer(strip(offer)),
                rates: shares.map((share, i) => rateFor(offer, hotel, share, i + 1)),
                offerRetailRate: { amount: eur(offer.t), currency },
                suggestedSellingPrice: { amount: eur(offer.t * 1.04), currency, source: 'fake' },
              };
            }),
          });
        }
        return json({ data, hotels: infos, sandbox: true });
      }
      case 'data/hotel': {
        const hotel = hotelById(url.searchParams.get('hotelId') ?? '');
        if (!hotel) return error(404, 'hotel not found');
        const r = seeded('details', hotel.id);
        const facilities = FAKE_FACILITIES.filter((f) => hotel.facilityIds.includes(f.id)).map((f) => f.name);
        // Like the real API: HTML descriptions, notes as lines, English unless `language=de`.
        const text = hotelTexts(hotel, url.searchParams.get('language') === 'de' ? 'de' : 'en');
        return json({
          data: {
            id: hotel.id,
            name: hotel.name,
            hotelDescription: text.description,
            hotelImportantInformation: text.important,
            main_photo: hotel.photo,
            hotelImages: [1, 2, 3].map((k) => ({ url: `/fake/hotel-${((hashString(hotel.id) + k) % 8) + 1}.svg`, defaultImage: k === 1 })),
            address: hotel.address,
            city: null,
            country: null,
            location: { latitude: hotel.lat, longitude: hotel.lng },
            starRating: hotel.stars,
            rating: hotel.rating,
            reviewCount: hotel.reviewCount,
            hotelType: hotel.kind,
            hotelFacilities: facilities,
            facilityIds: hotel.facilityIds,
            phone: `+49 000 ${String(hashString(hotel.id) % 1_000_000).padStart(6, '0')}`,
            email: `rezeption@${hotel.id}.example`,
            checkinCheckoutTimes: { checkin: r() < 0.5 ? '15:00' : '14:00', checkout: '10:30' },
          },
        });
      }
      case 'data/reviews': {
        const hotel = hotelById(url.searchParams.get('hotelId') ?? '');
        if (!hotel) return error(404, 'hotel not found');
        const limit = Number(url.searchParams.get('limit') ?? 100);
        const today = now().toISOString().slice(0, 10);
        const withSentiment = url.searchParams.get('getSentiment') === 'true';
        return json({
          data: reviewsFor(hotel, today, limit),
          ...(withSentiment && hotel.reviewCount > 0 ? { sentimentAnalysis: { categories: sentimentFor(hotel) } } : {}),
        });
      }
      case 'data/facilities':
        return json({ data: FAKE_FACILITIES.map((f) => ({ facility_id: f.id, facility: f.name })) });
      case 'rates/prebook': {
        const offer = decodeOffer(String(body.offerId ?? ''));
        const hotel = offer ? hotelById(offer.h) : null;
        if (!offer || !hotel) return error(400, 'offer expired or unknown');
        const hash = hashString(`prebook|${String(body.offerId)}`);
        const changed = hash % 12 === 0;
        const total = changed ? Math.round(offer.t * 1.05) : offer.t;
        const tx = `tx_fake_${hash.toString(36)}`;
        const prebook: FakePrebook = { ...offer, t: total, tx };
        return json({
          data: {
            prebookId: base64UrlEncode(prebook),
            offerId: body.offerId,
            hotelId: offer.h,
            currency: offer.c,
            price: eur(total),
            priceDifferencePercent: changed ? 5 : 0,
            cancellationChanged: false,
            boardChanged: false,
            transactionId: tx,
            secretKey: `fake_sk_${hash.toString(36)}`,
          },
        });
      }
      case 'rates/book': {
        let prebook: FakePrebook;
        try {
          prebook = base64UrlDecode<FakePrebook>(String(body.prebookId ?? ''));
        } catch {
          return error(400, 'unknown prebook');
        }
        const payment = body.payment as { method?: string; transactionId?: string } | undefined;
        if (payment?.method !== 'TRANSACTION_ID' || payment.transactionId !== prebook.tx) {
          return error(400, 'payment not completed');
        }
        const holder = body.holder as { lastName?: string } | undefined;
        if (holder?.lastName?.toLowerCase().includes('fehler')) return error(409, 'room no longer available');
        const code = `HCN-${(hashString(`hcn|${prebook.tx}`) % 900_000) + 100_000}`;
        const booking = { ...prebook, hc: code };
        return json({
          data: {
            bookingId: `FKB${base64UrlEncode(booking)}`,
            status: 'CONFIRMED',
            hotelConfirmationCode: code,
            checkin: prebook.ci,
            checkout: prebook.co,
            price: eur(prebook.t),
            currency: prebook.c,
            hotel: { hotelId: prebook.h, name: hotelById(prebook.h)?.name ?? null },
          },
        });
      }
      case 'bookings/get':
      case 'bookings/cancel': {
        const id = decodeURIComponent(path.slice('/bookings/'.length));
        let booking: FakePrebook & { hc: string };
        try {
          booking = base64UrlDecode(id.replace(/^FKB/, ''));
        } catch {
          return error(404, 'booking not found');
        }
        if (endpoint === 'bookings/get') {
          return json({
            data: {
              bookingId: id,
              status: 'CONFIRMED',
              hotelConfirmationCode: booking.hc,
              checkin: booking.ci,
              checkout: booking.co,
              price: eur(booking.t),
              currency: booking.c,
            },
          });
        }
        const freeUntil = Date.parse(`${addDays(booking.ci, -2)}T16:00:00Z`);
        const hotel = hotelById(booking.h);
        const firstNight = hotel
          ? (offersFor(hotel, booking.ci, booking.co, booking.o, booking.c).find((o) => o.r === booking.r)?.firstNightCents ?? booking.t)
          : booking.t;
        const fee = !booking.rf ? booking.t : now().getTime() < freeUntil ? 0 : Math.min(firstNight, booking.t);
        return json({
          data: { bookingId: id, status: 'CANCELLED', cancellation_fee: eur(fee), refund_amount: eur(booking.t - fee), currency: booking.c },
        });
      }
      default:
        return error(404, `unknown endpoint ${method} ${path}`);
    }
  };
}
