// German text templates produced by the domain (reasons, durations). They
// are checked by `npm run check:claims` like the UI texts.

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** "Wandern", "Wandern und Seen", "Wandern, Seen und Wellness". */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;
}

/** Region reason (architektur.md 6.2 point 7): "{n} passende Orte für {Themen}, {min}–{max} Fahrt". */
export function regionReason(args: { places: number; themeLabels: readonly string[]; minMinutes: number; maxMinutes: number; estimated: boolean }): string {
  const count = args.places === 1 ? '1 passender Ort' : `${args.places} passende Orte`;
  const themes = args.themeLabels.length > 0 ? ` für ${formatList(args.themeLabels)}` : '';
  const span =
    args.minMinutes === args.maxMinutes
      ? formatDuration(args.minMinutes)
      : `${formatDuration(args.minMinutes)}–${formatDuration(args.maxMinutes)}`;
  return `${count}${themes}, ${args.estimated ? 'geschätzt ' : ''}${span} Fahrt`;
}

/** Shown when the wish translation is unavailable (LLM off, budget used up, error). */
export const WISH_FALLBACK_NOTICE =
  'Die automatische Übersetzung deiner Wünsche ist gerade nicht verfügbar. Bitte wähle die passenden Chips direkt aus.';

/** Bargain reasons (architektur.md 6.8): the only allowed savings statements. */
export function bargainReasonValue(percent: number): string {
  return `Preis-Leistung ${percent} % besser als der Durchschnitt deiner Suche`;
}
export function bargainReasonDate(percent: number): string {
  return `${percent} % günstiger als dieselbe Unterkunft an deinen anderen Terminen`;
}
export function bargainReasonPlace(percent: number, place: string): string {
  return `${percent} % günstiger als vergleichbare Unterkünfte in ${place}`;
}
