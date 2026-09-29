// Attractiveness of places and regions (Aufgabe 8, docs/logik/orts-attraktivitaet.md):
// what a traveller can do there, so that a cheap side village without lifts,
// trails or tourists is marked instead of looking like a bargain.
import { ATTRACTIVENESS_LEVELS, ATTRACTIVENESS_NEIGHBOUR_KM, ATTRACTIVENESS_WEIGHTS } from './constants';

export type AttractivenessLevel = 'top' | 'beliebt' | 'ruhig' | 'wenig';

/** The five criteria, each 0–3. */
export interface AttractivenessParts {
  /** B: fame as a holiday destination. */
  fame: number;
  /** A: lifts, ski area or major sights. */
  attractions: number;
  /** W: hiking and cycling routes. */
  trails: number;
  /** V: variety of activities. */
  variety: number;
  /** I: restaurants, shops, tourist information. */
  infrastructure: number;
}

export interface Attractiveness {
  score: number;
  level: AttractivenessLevel;
  parts: AttractivenessParts;
}

export interface CatalogAttractivenessInput {
  /** Curated in data/catalog/attraktivitaet.yaml; null when missing (then 2 and 1). */
  fame: number | null;
  attractions: number | null;
  /** Theme strengths of the catalog place (1–3). */
  themes: Readonly<Record<string, number>>;
  population: number | null;
}

const clamp3 = (v: number) => Math.max(0, Math.min(3, Math.round(v)));

export function infrastructureFromPopulation(population: number | null): number {
  const p = population ?? 0;
  return p < 1_500 ? 1 : p < 10_000 ? 2 : 3;
}

export function varietyFromThemes(themes: Readonly<Record<string, number>>): number {
  const strong = Object.values(themes).filter((s) => s >= 2).length;
  return strong === 0 ? 0 : strong === 1 ? 1 : strong <= 3 ? 2 : 3;
}

export function attractivenessLevel(score: number): AttractivenessLevel {
  if (score >= ATTRACTIVENESS_LEVELS.top) return 'top';
  if (score >= ATTRACTIVENESS_LEVELS.beliebt) return 'beliebt';
  if (score >= ATTRACTIVENESS_LEVELS.ruhig) return 'ruhig';
  return 'wenig';
}

export function attractivenessOf(parts: AttractivenessParts): Attractiveness {
  const w = ATTRACTIVENESS_WEIGHTS;
  const max = 3 * (w.fame + w.attractions + w.trails + w.variety + w.infrastructure);
  const sum = w.fame * parts.fame + w.attractions * parts.attractions + w.trails * parts.trails + w.variety * parts.variety + w.infrastructure * parts.infrastructure;
  const score = Math.round((100 * sum) / max) / 10;
  return { score, level: attractivenessLevel(score), parts };
}

export function catalogAttractiveness(input: CatalogAttractivenessInput): Attractiveness {
  const fame = clamp3(input.fame ?? 2);
  const infrastructure = infrastructureFromPopulation(input.population);
  return attractivenessOf({
    fame,
    attractions: clamp3(input.attractions ?? 1),
    trails: clamp3(Math.max(input.themes['wandern'] ?? 0, input.themes['radfahren'] ?? 0)),
    variety: varietyFromThemes(input.themes),
    // A famous resort village has the infrastructure of a town.
    infrastructure: fame === 3 ? 3 : infrastructure,
  });
}

export interface UserPlaceAttractivenessInput {
  population: number | null;
  /** Nearest catalog place within ATTRACTIVENESS_NEIGHBOUR_KM, with its parts; null without one. */
  neighbour: AttractivenessParts | null;
}

/** Places outside the catalog: from their size and a catalog place nearby. */
export function userPlaceAttractiveness(input: UserPlaceAttractivenessInput): Attractiveness {
  const p = input.population ?? 0;
  const city = p >= 100_000;
  const n = input.neighbour;
  const near = (value: number | undefined) => (value === undefined ? 0 : clamp3(value - 1));
  return attractivenessOf({
    fame: Math.max(city ? 3 : p >= 20_000 ? 2 : 1, near(n?.fame)),
    // A city has sights; a metropolis (Berlin, Köln) as many as a top resort.
    attractions: Math.max(p >= 500_000 ? 3 : city ? 2 : 0, near(n?.attractions)),
    trails: Math.max(1, near(n?.trails)),
    variety: Math.max(city ? 3 : 0, near(n?.variety)),
    infrastructure: infrastructureFromPopulation(input.population),
  });
}

/** A region by its best places: the mean of the top ATTRACTIVENESS_REGION_TOP scores. */
export function regionAttractiveness(placeScores: readonly number[], top = 3): { score: number; level: AttractivenessLevel } | null {
  if (placeScores.length === 0) return null;
  const best = [...placeScores].sort((a, b) => b - a).slice(0, top);
  const score = Math.round((best.reduce((s, v) => s + v, 0) / best.length) * 10) / 10;
  return { score, level: attractivenessLevel(score) };
}

export { ATTRACTIVENESS_NEIGHBOUR_KM };
