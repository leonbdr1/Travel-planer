// Simulated public reference prices: about two thirds of the houses have one;
// it lies between slightly below and clearly above the cheapest refundable
// rate of the same stay, so the comparison can go either way.
import type { ReferencePricePort, ReferencePriceRequest, ReferencePriceResult } from '../reference-price/port';
import { seeded } from './random';
import { hotelById, offersFor } from './world';

const SOURCES = ['Booking.com', 'Expedia'] as const;

export function createFakeReferencePrice(options: { onCall?: (endpoint: string) => void; latencyMs?: number } = {}): ReferencePricePort {
  return {
    configured: true,
    async getReferencePrice(request: ReferencePriceRequest): Promise<ReferencePriceResult> {
      options.onCall?.('reference-price');
      if (options.latencyMs) await new Promise((r) => setTimeout(r, options.latencyMs));
      const hotel = hotelById(request.hotelId);
      if (!hotel) return { status: 'unavailable', reason: 'no_public_price' };
      const r = seeded('reference', hotel.id, request.checkin, request.checkout);
      if (r() >= 0.65) return { status: 'unavailable', reason: 'no_public_price' };
      const occupancies = request.occupancies.map((o) => ({ adults: o.adults, children: [...o.childrenAges] }));
      const offers = offersFor(hotel, request.checkin, request.checkout, occupancies, request.currency).filter((o) => o.rf);
      const cheapest = Math.min(...offers.map((o) => o.t));
      if (!Number.isFinite(cheapest)) return { status: 'unavailable', reason: 'no_public_price' };
      const factor = 0.97 + r() * 0.23;
      return { status: 'ok', totalCents: Math.round(cheapest * factor), currency: request.currency, source: SOURCES[Math.floor(r() * SOURCES.length)] ?? SOURCES[0] };
    },
  };
}
