// Theme matching (architektur.md 6.2 point 3 and 6.3): a place fits the
// selection when at least one selected theme has strength ≥ THEME_MIN_STRENGTH;
// its score is the sum of the selected themes' strengths.
import { THEME_MIN_STRENGTH } from './constants';

export type PlaceThemes = Readonly<Record<string, number>>;

export function matchingThemes(themes: PlaceThemes, selected: readonly string[], minStrength = THEME_MIN_STRENGTH): string[] {
  return selected.filter((code) => (themes[code] ?? 0) >= minStrength);
}

export function fitsThemes(themes: PlaceThemes, selected: readonly string[], minStrength = THEME_MIN_STRENGTH): boolean {
  return selected.length === 0 || matchingThemes(themes, selected, minStrength).length > 0;
}

export function themeScore(themes: PlaceThemes, selected: readonly string[]): number {
  if (selected.length === 0) return Object.values(themes).reduce((a, b) => a + b, 0);
  return selected.reduce((sum, code) => sum + (themes[code] ?? 0), 0);
}
