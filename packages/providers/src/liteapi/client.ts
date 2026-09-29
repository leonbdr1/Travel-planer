// LiteAPI v3.0 adapter (architektur.md 8.1). The same client runs against the
// real API (sandbox/live) and against the simulated LiteAPI (fake transport),
// so schemas, mapping and retries are exercised in every mode.
import type { HotelDetails, HotelRates, HotelSummary, Occupancy, ReviewsResult } from '@reiseplaner/domain';
import { ProviderError } from '../http/errors';
import { requestJson, type FetchLike } from '../http/request';
import { mapHotelDetails, mapRatesResponse, mapReviews, toCents } from './map';
import {
  bookingStatusResponseSchema,
  bookResponseSchema,
  facilitiesResponseSchema,
  hotelDetailsResponseSchema,
  prebookResponseSchema,
  ratesResponseSchema,
  reviewsResponseSchema,
} from './schemas';

export interface RatesRequest {
  lat: number;
  lng: number;
  radiusKm: number;
  checkin: string;
  checkout: string;
  occupancies: Occupancy[];
  currency: string;
  guestNationality: string;
  timeoutS: number;
  limit: number;
  /** Margin in percent, if configured (BG-12). */
  marginPercent?: number;
}

/** Rates of one known hotel for exactly one stay (re-quote right before booking). */
export interface HotelRatesRequest {
  hotelId: string;
  checkin: string;
  checkout: string;
  occupancies: Occupancy[];
  currency: string;
  guestNationality: string;
  timeoutS: number;
  marginPercent?: number;
}

export interface RatesResult {
  rates: HotelRates[];
  hotels: HotelSummary[];
}

export interface PrebookResult {
  prebookId: string;
  hotelId: string;
  totalCents: number;
  currency: string;
  priceDifferencePercent: number;
  cancellationChanged: boolean;
  boardChanged: boolean;
  transactionId: string | null;
  secretKey: string | null;
}

export interface BookHolder {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface BookRequest {
  prebookId: string;
  transactionId: string;
  holder: BookHolder;
  /** LiteAPI requires an e-mail per guest (the holder's is used when a guest has none of their own). */
  guests: Array<{ occupancyNumber: number; firstName: string; lastName: string; email: string }>;
  clientReference: string;
}

export interface BookResult {
  bookingId: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  hotelConfirmationCode: string | null;
  totalCents: number | null;
  currency: string | null;
}

export interface CancelResult {
  bookingId: string;
  status: string;
  cancellationFeeCents: number | null;
  refundCents: number | null;
  currency: string | null;
}

export interface Facility {
  id: number;
  name: string;
}

export interface HotelDetailsOptions {
  /** ISO 639-1 language of description, important information and facilities (e.g. `de`). */
  language?: string;
}

export interface LiteApiPort {
  searchRates(request: RatesRequest): Promise<RatesResult>;
  searchHotelRates(request: HotelRatesRequest): Promise<RatesResult>;
  getHotel(hotelId: string, options?: HotelDetailsOptions): Promise<HotelDetails>;
  getReviews(hotelId: string, options: { limit: number; withSentiment: boolean }): Promise<ReviewsResult>;
  getFacilities(): Promise<Facility[]>;
  prebook(offerId: string): Promise<PrebookResult>;
  book(request: BookRequest): Promise<BookResult>;
  getBooking(bookingId: string): Promise<BookResult>;
  cancelBooking(bookingId: string): Promise<CancelResult>;
}

export interface LiteApiClientOptions {
  apiKey: string | undefined;
  baseUrl: string;
  bookBaseUrl: string;
  fetch: FetchLike;
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  onCall?: (endpoint: string) => void;
}

const PROVIDER = 'liteapi';

function normaliseStatus(status: string): BookResult['status'] {
  const upper = status.toUpperCase();
  if (upper === 'CONFIRMED' || upper === 'PENDING' || upper === 'CANCELLED') return upper;
  if (upper === 'CANCELLED_WITH_CHARGES') return 'CANCELLED';
  return 'FAILED';
}

export function createLiteApiClient(options: LiteApiClientOptions): LiteApiPort {
  const call = <S extends Parameters<typeof requestJson>[0]['schema']>(
    endpoint: string,
    url: string,
    schema: S,
    init: { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; timeoutMs?: number } = {},
  ) => {
    if (!options.apiKey) throw new ProviderError(PROVIDER, 'not_configured', 'LITEAPI_API_KEY is not set');
    return requestJson({
      provider: PROVIDER,
      endpoint,
      url,
      schema,
      fetch: options.fetch,
      headers: { 'X-API-Key': options.apiKey },
      timeoutMs: init.timeoutMs ?? options.timeoutMs ?? 15_000,
      maxRetries: options.maxRetries ?? 2,
      ...(init.method ? { method: init.method } : {}),
      ...(init.body === undefined ? {} : { body: init.body }),
      ...(options.sleep ? { sleep: options.sleep } : {}),
      ...(options.onCall ? { onAttempt: options.onCall } : {}),
    });
  };
  const data = (path: string) => `${options.baseUrl}${path}`;
  const book = (path: string) => `${options.bookBaseUrl}${path}`;

  return {
    async searchRates(request) {
      const raw = await call('hotels/rates', data('/hotels/rates'), ratesResponseSchema, {
        body: {
          latitude: request.lat,
          longitude: request.lng,
          radius: Math.round(request.radiusKm * 1000),
          checkin: request.checkin,
          checkout: request.checkout,
          occupancies: request.occupancies.map((o) => ({ adults: o.adults, children: o.childrenAges })),
          currency: request.currency,
          guestNationality: request.guestNationality,
          timeout: request.timeoutS,
          limit: request.limit,
          includeHotelData: true,
          ...(request.marginPercent === undefined ? {} : { margin: request.marginPercent }),
        },
        // Network timeout = vendor timeout + headroom for transfer.
        timeoutMs: (request.timeoutS + 6) * 1000,
      });
      return mapRatesResponse(raw);
    },
    async searchHotelRates(request) {
      const raw = await call('hotels/rates', data('/hotels/rates'), ratesResponseSchema, {
        body: {
          hotelIds: [request.hotelId],
          checkin: request.checkin,
          checkout: request.checkout,
          occupancies: request.occupancies.map((o) => ({ adults: o.adults, children: o.childrenAges })),
          currency: request.currency,
          guestNationality: request.guestNationality,
          timeout: request.timeoutS,
          includeHotelData: true,
          ...(request.marginPercent === undefined ? {} : { margin: request.marginPercent }),
        },
        timeoutMs: (request.timeoutS + 6) * 1000,
      });
      return mapRatesResponse(raw);
    },
    async getHotel(hotelId, detailsOptions = {}) {
      const url = (language?: string) => data(`/data/hotel?${new URLSearchParams({ hotelId, ...(language ? { language } : {}) })}`);
      try {
        return mapHotelDetails(await call('data/hotel', url(detailsOptions.language), hotelDetailsResponseSchema));
      } catch (err) {
        // ⟂ Contract unverified (HANDOFF drift 38): `language` follows the LiteAPI
        // reference, not yet seen live. Should the API reject it, the details
        // come in the default language instead of not at all.
        if (!detailsOptions.language || !(err instanceof ProviderError) || err.kind !== 'client') throw err;
        return mapHotelDetails(await call('data/hotel', url(), hotelDetailsResponseSchema));
      }
    },
    async getReviews(hotelId, { limit, withSentiment }) {
      const qs = new URLSearchParams({ hotelId, limit: String(limit), getSentiment: String(withSentiment) });
      const raw = await call('data/reviews', data(`/data/reviews?${qs}`), reviewsResponseSchema);
      return mapReviews(raw);
    },
    async getFacilities() {
      const raw = await call('data/facilities', data('/data/facilities'), facilitiesResponseSchema);
      return raw.data.map((f) => ({ id: f.facility_id, name: f.facility }));
    },
    async prebook(offerId) {
      const raw = await call('rates/prebook', book('/rates/prebook'), prebookResponseSchema, {
        body: { offerId, usePaymentSdk: true },
      });
      const d = raw.data;
      return {
        prebookId: d.prebookId,
        hotelId: d.hotelId,
        totalCents: toCents(d.price),
        currency: d.currency,
        priceDifferencePercent: d.priceDifferencePercent ?? 0,
        cancellationChanged: d.cancellationChanged ?? false,
        boardChanged: d.boardChanged ?? false,
        transactionId: d.transactionId ?? null,
        secretKey: d.secretKey ?? null,
      };
    },
    async book(request) {
      const raw = await call('rates/book', book('/rates/book'), bookResponseSchema, {
        body: {
          prebookId: request.prebookId,
          clientReference: request.clientReference,
          holder: {
            firstName: request.holder.firstName,
            lastName: request.holder.lastName,
            email: request.holder.email,
            ...(request.holder.phone ? { phone: request.holder.phone } : {}),
          },
          payment: { method: 'TRANSACTION_ID', transactionId: request.transactionId },
          guests: request.guests,
        },
        timeoutMs: 60_000,
      });
      const d = raw.data;
      return {
        bookingId: d.bookingId,
        status: normaliseStatus(d.status),
        hotelConfirmationCode: d.hotelConfirmationCode ?? null,
        totalCents: d.price === null || d.price === undefined ? null : toCents(d.price),
        currency: d.currency ?? null,
      };
    },
    async getBooking(bookingId) {
      const raw = await call('bookings/get', book(`/bookings/${encodeURIComponent(bookingId)}`), bookResponseSchema);
      const d = raw.data;
      return {
        bookingId: d.bookingId,
        status: normaliseStatus(d.status),
        hotelConfirmationCode: d.hotelConfirmationCode ?? null,
        totalCents: d.price === null || d.price === undefined ? null : toCents(d.price),
        currency: d.currency ?? null,
      };
    },
    async cancelBooking(bookingId) {
      const raw = await call('bookings/cancel', book(`/bookings/${encodeURIComponent(bookingId)}`), bookingStatusResponseSchema, {
        method: 'PUT',
      });
      const d = raw.data;
      return {
        bookingId: d.bookingId,
        status: d.status,
        cancellationFeeCents: d.cancellation_fee === null || d.cancellation_fee === undefined ? null : toCents(d.cancellation_fee),
        refundCents: d.refund_amount === null || d.refund_amount === undefined ? null : toCents(d.refund_amount),
        currency: d.currency ?? null,
      };
    },
  };
}
