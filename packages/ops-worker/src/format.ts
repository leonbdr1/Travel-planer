// German formatting for alert texts; times shown in the product's time zone.
import { productConfig } from '@reiseplaner/config';

const dateTime = new Intl.DateTimeFormat('de-DE', { timeZone: productConfig.markets.timezone, dateStyle: 'medium', timeStyle: 'short' });

export function formatTime(iso: string | Date): string {
  return `${dateTime.format(typeof iso === 'string' ? new Date(iso) : iso)} Uhr`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 120) return `${minutes} Min.`;
  if (minutes < 72 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
  }
  return `${Math.floor(minutes / 1440)} Tage`;
}
