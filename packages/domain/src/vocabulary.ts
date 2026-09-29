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
  'shopping',
  'strand',
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
  staedte_kultur: 'Kultur und Sehenswürdigkeiten',
  wein_kulinarik: 'Wein und Kulinarik',
  familie: 'Familie',
  shopping: 'Shopping und Großstadt',
  strand: 'Strand und Meer',
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
  sauberkeit: 'Nicht sauber',
  schimmel: 'Schimmel',
  ungeziefer: 'Ungeziefer',
  laerm: 'Lautstärke',
  geruch: 'Geruch',
  zustand: 'Baulicher Zustand',
  abweichung_beschreibung: 'Abweichung von Fotos oder Beschreibung',
};

/**
 * What the traveller is after (konzept.md 9.9); one tap in the search form.
 * The UI names them "Günstig und sauber", "Preis-Leistung" and "Komfort"
 * (packages/web/src/i18n/de.ts).
 */
export const GOALS = ['sparen', 'ausgewogen', 'komfort'] as const;
export type Goal = (typeof GOALS)[number];
export const DEFAULT_GOAL: Goal = 'ausgewogen';

export function isGoal(value: unknown): value is Goal {
  return typeof value === 'string' && (GOALS as readonly string[]).includes(value);
}

/** Topics guests praise (konzept.md 9.11); labels appear without any user setting. */
export const PRAISE_TOPICS = ['fruehstueck', 'sauberkeit', 'ruhe', 'personal', 'betten', 'aussicht', 'lage'] as const;
export type PraiseTopic = (typeof PRAISE_TOPICS)[number];

/** Label shown when guests praise the topic; the second text names the topic in the evidence line. */
export const PRAISE_LABELS: Record<PraiseTopic, { label: string; topic: string }> = {
  fruehstueck: { label: 'Gutes Frühstück', topic: 'Frühstück' },
  sauberkeit: { label: 'Besonders sauber', topic: 'Sauberkeit' },
  ruhe: { label: 'Ruhig', topic: 'Ruhe' },
  personal: { label: 'Freundliches Personal', topic: 'Personal' },
  betten: { label: 'Bequeme Betten', topic: 'Betten' },
  aussicht: { label: 'Schöne Aussicht', topic: 'Aussicht' },
  lage: { label: 'Gute Lage', topic: 'Lage' },
};

/** A praise label is withheld while a warning on the matching complaint topic exists. */
export const PRAISE_BLOCKED_BY: Record<PraiseTopic, readonly ReviewTopic[]> = {
  fruehstueck: [],
  sauberkeit: ['sauberkeit', 'schimmel', 'ungeziefer', 'geruch'],
  ruhe: ['laerm'],
  personal: [],
  betten: ['zustand'],
  aussicht: ['abweichung_beschreibung'],
  lage: [],
};

export function isPraiseTopic(value: string): value is PraiseTopic {
  return (PRAISE_TOPICS as readonly string[]).includes(value);
}

export function isThemeCode(value: string): value is ThemeCode {
  return (THEME_CODES as readonly string[]).includes(value);
}
export function isChipCode(value: string): value is ChipCode {
  return (CHIP_CODES as readonly string[]).includes(value);
}
export function isReviewTopic(value: string): value is ReviewTopic {
  return (REVIEW_TOPICS as readonly string[]).includes(value);
}
