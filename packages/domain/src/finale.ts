// Finale (konzept.md 9.10, architektur.md 6.15): the finalists side by side,
// the cheapest first. For every other finalist the surcharge against the
// cheapest and what it brings or costs. No recommendation: whether 10 € are
// worth the sauna is the traveller's decision.
import { CENTER_DISTANCE_CORE_KM, CENTER_DISTANCE_TOWN_KM, FINALE_QUALITY_DELTA_MIN } from './constants';
import { offerFeatures, type FeatureHotel, type OfferFeature } from './features';
import { haversineKm, type LatLng } from './geo';
import type { EvaluatedOffer } from './ranking';
import type { PraiseTopic } from './vocabulary';

export type LocationClass = 'kern' | 'ort' | 'ausserhalb';

export interface FinalistInput {
  offer: EvaluatedOffer;
  hotel: FeatureHotel & { location: LatLng | null };
  place: LatLng | null;
  labels: readonly PraiseTopic[];
}

export interface FinaleEntry {
  offer: EvaluatedOffer;
  /** Everything this offer brings (facilities, meals, free cancellation, praise labels). */
  features: OfferFeature[];
  /** Surcharge against the cheapest finalist (0 for the cheapest itself). */
  priceDeltaCents: number;
  /** Brings, compared with the cheapest finalist. */
  gains: OfferFeature[];
  /** Lacks, compared with the cheapest finalist. */
  losses: OfferFeature[];
  /** Quality difference to the cheapest finalist, when it is large enough to mention. */
  qualityDelta: number | null;
  otherPlace: boolean;
  otherDates: boolean;
  centerDistanceKm: number | null;
  location: LocationClass | null;
}

export function locationClass(km: number | null): LocationClass | null {
  if (km === null) return null;
  if (km <= CENTER_DISTANCE_CORE_KM) return 'kern';
  if (km <= CENTER_DISTANCE_TOWN_KM) return 'ort';
  return 'ausserhalb';
}

function centerDistance(f: FinalistInput): number | null {
  if (!f.hotel.location || !f.place) return null;
  return Math.round(haversineKm(f.hotel.location, f.place) * 10) / 10;
}

/** `finalists` cheapest first (as `preselect` returns them). */
function featuresOf(f: FinalistInput, km: number | null): OfferFeature[] {
  return offerFeatures({ ...f.hotel, inCore: locationClass(km) === 'kern' }, f.offer, f.labels);
}

export function compareFinalists(finalists: readonly FinalistInput[]): FinaleEntry[] {
  const base = finalists[0];
  if (!base) return [];
  const baseFeatures = featuresOf(base, centerDistance(base));
  const baseCodes = new Set(baseFeatures.map((f) => f.code));
  return finalists.map((f, index) => {
    const km = centerDistance(f);
    const features = index === 0 ? baseFeatures : featuresOf(f, km);
    const codes = new Set(features.map((x) => x.code));
    const delta = f.offer.quality !== null && base.offer.quality !== null ? Math.round((f.offer.quality - base.offer.quality) * 10) / 10 : null;
    return {
      offer: f.offer,
      features,
      priceDeltaCents: f.offer.totalCents - base.offer.totalCents,
      gains: index === 0 ? [] : features.filter((x) => !baseCodes.has(x.code)),
      losses: index === 0 ? [] : baseFeatures.filter((x) => !codes.has(x.code)),
      qualityDelta: index === 0 || delta === null || Math.abs(delta) < FINALE_QUALITY_DELTA_MIN ? null : delta,
      otherPlace: index !== 0 && f.offer.placeId !== base.offer.placeId,
      otherDates: index !== 0 && f.offer.checkin !== base.offer.checkin,
      centerDistanceKm: km,
      location: locationClass(km),
    };
  });
}
