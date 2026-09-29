// Comparison features of an offer (konzept.md 9.10): what a finalist brings
// that another does not. Facility features reuse the chip mapping; the extra
// facility IDs below carry the same ⟂ note as chips.ts (taken from the
// simulated world, to be re-mapped against the real /data/facilities list,
// HANDOFF drift 8).
import { chipDefinition } from './chips';
import { hasManyReviews } from './comparison';
import { hasGastroNearby, WALK_KINDS, type LocationFacts, type WalkKind } from './location';
import type { PropertyKind } from './property-kind';
import type { BoardType } from './types';
import { PRAISE_LABELS, type ChipCode, type PraiseTopic } from './vocabulary';

export interface FeatureHotel {
  facilityIds: readonly number[];
  hotelType: string | null;
  /** From OpenStreetMap, only known for likely finalists (S11.5). */
  facts?: LocationFacts | null | undefined;
  /** Within CENTER_DISTANCE_CORE_KM of the place's centre. */
  inCore?: boolean | undefined;
  /** Reviews in total and as they count (older ones weigh less): "viele Bewertungen" is a plus like a sauna. */
  reviewCount?: number | null | undefined;
  effectiveReviews?: number | null | undefined;
  /** Kind of accommodation: "viele Bewertungen" is relative to it (Aufgabe 6). */
  propertyKind?: PropertyKind | undefined;
}

const WALK_LABELS: Record<WalkKind, (min: number) => string> = {
  lift: (min) => `${min} min zum Lift`,
  bahn: (min) => `${min} min zum Bahnhof`,
  bus: (min) => `${min} min zur Bushaltestelle`,
  supermarkt: (min) => `${min} min zum Supermarkt`,
};

/** Location as comparable features: the code says whether, the label how far. */
function locationFeatures(hotel: FeatureHotel): OfferFeature[] {
  const out: OfferFeature[] = [];
  const facts = hotel.facts;
  if (facts) {
    for (const kind of WALK_KINDS) {
      const min = facts.walk[kind];
      if (min !== null) out.push({ code: `lage_${kind}`, label: WALK_LABELS[kind](min), minutes: min });
    }
  }
  if (hotel.inCore) out.push({ code: 'lage_ortskern', label: 'Ortskern' });
  if (facts && hasGastroNearby(facts)) out.push({ code: 'lage_gastro', label: 'Restaurants in der Nähe' });
  return out;
}

export interface OfferFeature {
  code: string;
  label: string;
  /** Walking minutes for location features. */
  minutes?: number;
  /** Number of reviews for `viele_bewertungen`. */
  count?: number;
}

const count = new Intl.NumberFormat('de-DE');

function reviewFeature(hotel: FeatureHotel): OfferFeature[] {
  const total = hotel.reviewCount ?? 0;
  return hasManyReviews(hotel.effectiveReviews ?? total, hotel.propertyKind) ? [{ code: 'viele_bewertungen', label: `${count.format(total)} Bewertungen`, count: total }] : [];
}

interface FacilityFeature {
  code: string;
  label: string;
  anyOf: readonly number[];
  orHotelTypes?: readonly string[];
}

function fromChip(code: ChipCode, label?: string): FacilityFeature {
  const chip = chipDefinition(code);
  if (chip.effect.kind !== 'facility') throw new Error(`chip ${code} is no facility`);
  return {
    code,
    label: label ?? chip.label,
    anyOf: chip.effect.anyOf,
    ...(chip.effect.orHotelTypes ? { orHotelTypes: chip.effect.orHotelTypes } : {}),
  };
}

export const FACILITY_FEATURES: readonly FacilityFeature[] = [
  fromChip('sauna_wellness', 'Sauna oder Wellness'),
  { code: 'schwimmbad', label: 'Schwimmbad', anyOf: [18] },
  fromChip('parkplatz'),
  fromChip('kueche'),
  fromChip('hund_erlaubt'),
  fromChip('familienzimmer'),
  fromChip('barrierefrei'),
  { code: 'restaurant', label: 'Restaurant im Haus', anyOf: [9] },
  { code: 'e_ladestation', label: 'E-Ladestation', anyOf: [16] },
];

const lower = (v: string | null) => (v ?? '').toLocaleLowerCase('de-DE');

const BREAKFAST: readonly BoardType[] = ['BB', 'HB', 'FB', 'AI'];
const HALF_BOARD: readonly BoardType[] = ['HB', 'FB', 'AI'];
/** Facilities a surcharge most often pays for; they come before the praise labels. */
const LEADING_FACILITIES: readonly string[] = ['sauna_wellness', 'schwimmbad'];

/**
 * Everything an offer brings, most decisive first (the finale shows the first
 * few): meals, free cancellation, sauna and pool, many reviews, location,
 * praise labels, the other facilities.
 */
export function offerFeatures(
  hotel: FeatureHotel,
  offer: { boardType: BoardType; refundable: boolean },
  labels: readonly PraiseTopic[] = [],
): OfferFeature[] {
  const facilities = FACILITY_FEATURES.filter(
    (f) => f.anyOf.some((id) => hotel.facilityIds.includes(id)) || (f.orHotelTypes ?? []).some((t) => lower(t) === lower(hotel.hotelType)),
  ).map((f) => ({ code: f.code, label: f.label }));
  const features: OfferFeature[] = [];
  if (BREAKFAST.includes(offer.boardType)) features.push({ code: 'fruehstueck_inklusive', label: 'Frühstück inklusive' });
  if (HALF_BOARD.includes(offer.boardType)) features.push({ code: 'halbpension', label: 'Halbpension' });
  if (offer.refundable) features.push({ code: 'kostenlos_stornierbar', label: 'kostenlos stornierbar' });
  features.push(...facilities.filter((f) => LEADING_FACILITIES.includes(f.code)));
  features.push(...reviewFeature(hotel));
  features.push(...locationFeatures(hotel));
  for (const topic of labels) features.push({ code: `lob_${topic}`, label: PRAISE_LABELS[topic].label });
  features.push(...facilities.filter((f) => !LEADING_FACILITIES.includes(f.code)));
  return features;
}
