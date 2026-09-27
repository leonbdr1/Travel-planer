// Fixed vocabularies (architektur.md 6.3, 6.10). Skills may only emit these
// codes; their JSON schemas are checked against this file by a drift test.

export const THEME_CODES = [
  'wandern',
  'bergpanorama',
  'seen',
  'natur_ruhe',
  'radfahren',
  'wellness',
  'wintersport',
  'staedte_kultur',
  'wein_kulinarik',
  'familie',
] as const;
export type ThemeCode = (typeof THEME_CODES)[number];

/** German labels, identical to data/catalog/themes.yaml (drift test). */
export const THEME_LABELS: Record<ThemeCode, string> = {
  wandern: 'Wandern',
  bergpanorama: 'Bergpanorama',
  seen: 'Seen',
  natur_ruhe: 'Natur und Ruhe',
  radfahren: 'Radfahren',
  wellness: 'Wellness',
  wintersport: 'Wintersport',
  staedte_kultur: 'Städte und Kultur',
  wein_kulinarik: 'Wein und Kulinarik',
  familie: 'Familie',
};

export function themeLabel(code: string): string {
  return isThemeCode(code) ? THEME_LABELS[code] : code;
}

export const CHIP_CODES = [
  'sauber',
  'ruhig',
  'fruehstueck',
  'kostenlos_stornierbar',
  'parkplatz',
  'hund_erlaubt',
  'sauna_wellness',
  'wlan',
  'kueche',
  'barrierefrei',
  'familienzimmer',
] as const;
export type ChipCode = (typeof CHIP_CODES)[number];

export const REVIEW_TOPICS = [
  'sauberkeit',
  'schimmel',
  'ungeziefer',
  'laerm',
  'geruch',
  'zustand',
  'abweichung_beschreibung',
] as const;
export type ReviewTopic = (typeof REVIEW_TOPICS)[number];

export const REVIEW_TOPIC_LABELS: Record<ReviewTopic, string> = {
  sauberkeit: 'Sauberkeit',
  schimmel: 'Schimmel',
  ungeziefer: 'Ungeziefer',
  laerm: 'Lärm',
  geruch: 'Geruch',
  zustand: 'Baulicher Zustand',
  abweichung_beschreibung: 'Abweichung von Fotos oder Beschreibung',
};

export function isThemeCode(value: string): value is ThemeCode {
  return (THEME_CODES as readonly string[]).includes(value);
}
export function isChipCode(value: string): value is ChipCode {
  return (CHIP_CODES as readonly string[]).includes(value);
}
export function isReviewTopic(value: string): value is ReviewTopic {
  return (REVIEW_TOPICS as readonly string[]).includes(value);
}
