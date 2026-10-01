// "Letzte Suchen" (B3): links to the last searches, kept only in this
// browser (localStorage) so a closed tab does not lose the results. The server
// deletes searches after the retention period; older entries are dropped.
import { z } from 'zod';

export const RECENT_MAX = 5;
const KEY = 'recent-searches-v1';
const DAY_MS = 86_400_000;

const entrySchema = z.object({ id: z.string(), token: z.string().min(20), label: z.string(), createdAt: z.string() });
export type RecentSearch = z.infer<typeof entrySchema>;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(storage: Store | null): RecentSearch[] {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.flatMap((x) => (entrySchema.safeParse(x).success ? [entrySchema.parse(x)] : [])) : [];
  } catch {
    return [];
  }
}

function write(entries: RecentSearch[], storage: Store | null) {
  try {
    storage?.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked (private mode): the list is a convenience only.
  }
}

/** The kept searches, newest first, without those older than `retentionDays`. */
export function loadRecent(now: Date, retentionDays: number, storage: Store | null = browserStorage()): RecentSearch[] {
  return read(storage).filter((e) => now.getTime() - Date.parse(e.createdAt) < retentionDays * DAY_MS);
}

export function rememberSearch(entry: RecentSearch, storage: Store | null = browserStorage()): void {
  write([entry, ...read(storage).filter((e) => e.id !== entry.id)].slice(0, RECENT_MAX), storage);
}

export function forgetSearch(id: string, storage: Store | null = browserStorage()): void {
  write(
    read(storage).filter((e) => e.id !== id),
    storage,
  );
}

const day = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

/** "Füssen, Oberstdorf · 05.10.–15.11.2026": up to three places, then "+n". */
export function recentLabel(placeNames: readonly string[], window: { start: string; end: string }): string {
  const shown = placeNames.slice(0, 3).join(', ');
  const more = placeNames.length > 3 ? ` +${placeNames.length - 3}` : '';
  const sameYear = window.start.slice(0, 4) === window.end.slice(0, 4);
  const from = sameYear ? day(window.start) : `${day(window.start)}${window.start.slice(0, 4)}`;
  return `${shown}${more} · ${from}–${day(window.end)}${window.end.slice(0, 4)}`;
}
