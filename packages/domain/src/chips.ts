// Wishes about the accommodation ("Chips", architektur.md 6.3). Each chip has
// a fixed effect: a score weight, a stricter warning count, or a filter.
//
// ⟂ The facility IDs below belong to the provider's facility list
// (/data/facilities). They are taken from the simulated LiteAPI world
// (packages/providers/src/fake/world.ts) because the real list could not be
// fetched in the build session; re-map them against the recorded fixture in
// S4.1 before sandbox use (see HANDOFF.md).
import type { BoardType } from './types';
import type { ChipCode } from './vocabulary';

export type ChipEffect =
  | { kind: 'score_cleanliness' }
  | { kind: 'noise_double' }
  | { kind: 'board'; boards: readonly BoardType[] }
  | { kind: 'refundable' }
  | { kind: 'facility'; anyOf: readonly number[]; orHotelTypes?: readonly string[] };

export interface ChipDefinition {
  code: ChipCode;
  label: string;
  effect: ChipEffect;
}

export const CHIPS: readonly ChipDefinition[] = [
  { code: 'sauber', label: 'Besonders sauber', effect: { kind: 'score_cleanliness' } },
  { code: 'ruhig', label: 'Ruhig', effect: { kind: 'noise_double' } },
  { code: 'fruehstueck', label: 'Mit Frühstück', effect: { kind: 'board', boards: ['BB', 'HB', 'FB', 'AI'] } },
  { code: 'kostenlos_stornierbar', label: 'Kostenlos stornierbar', effect: { kind: 'refundable' } },
  { code: 'parkplatz', label: 'Parkplatz', effect: { kind: 'facility', anyOf: [1] } },
  { code: 'hund_erlaubt', label: 'Hund erlaubt', effect: { kind: 'facility', anyOf: [3] } },
  { code: 'sauna_wellness', label: 'Sauna oder Wellness', effect: { kind: 'facility', anyOf: [4, 5] } },
  { code: 'wlan', label: 'WLAN', effect: { kind: 'facility', anyOf: [2] } },
  {
    code: 'kueche',
    label: 'Küche',
    effect: { kind: 'facility', anyOf: [6], orHotelTypes: ['Apartments', 'Ferienwohnung', 'Apartment'] },
  },
  { code: 'barrierefrei', label: 'Barrierefrei', effect: { kind: 'facility', anyOf: [7] } },
  { code: 'familienzimmer', label: 'Familienzimmer', effect: { kind: 'facility', anyOf: [8] } },
];

export function chipDefinition(code: ChipCode): ChipDefinition {
  const chip = CHIPS.find((c) => c.code === code);
  if (!chip) throw new Error(`unknown chip ${code}`);
  return chip;
}
