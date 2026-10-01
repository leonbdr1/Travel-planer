// German number, money and date formatting (display in Europe/Berlin).
const euro0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const one = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export const formatEuro = (v: number) => euro0.format(v);
export const formatEuroCents = (v: number) => euro2.format(v);
export const formatScore = (v: number) => one.format(v);
/** "+0,5" or "−0,4" (quality differences). */
export const formatSignedScore = (v: number) => `${v > 0 ? '+' : '−'}${one.format(Math.abs(v))}`;

/** "Fr 02.10." */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
}

/** "Fr 02.10. – So 04.10." */
export function formatStay(checkin: string, checkout: string): string {
  return `${formatDay(checkin)} – ${formatDay(checkout)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}

/** "19.09.2026" for an ISO date (YYYY-MM-DD). */
export function formatDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

/** Nights between two ISO dates. */
export function nightsBetween(checkin: string, checkout: string): number {
  return Math.round((Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000);
}

/** true when the dates hold several stays with the same arrival (night range, Aufgabe 4). */
export function hasNightVariants(dates: ReadonlyArray<{ checkin: string }>): boolean {
  return new Set(dates.map((d) => d.checkin)).size < dates.length;
}
