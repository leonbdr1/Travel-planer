// "Letzte Suchen" (B3): the browser keeps the links to the last searches,
// newest first, without duplicates, only as long as the server keeps them.
import { describe, expect, it } from 'vitest';
import { forgetSearch, loadRecent, recentLabel, rememberSearch, RECENT_MAX } from '../src/features/search/recent';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const now = new Date('2026-10-01T10:00:00Z');
const entry = (id: string, createdAt = now.toISOString()) => ({ id, token: `token-${id}-${'x'.repeat(20)}`, label: `Suche ${id}`, createdAt });

describe('recent searches', () => {
  it('keeps the newest first, without duplicates, at most RECENT_MAX', () => {
    const storage = memoryStorage();
    for (let i = 0; i < RECENT_MAX + 2; i += 1) rememberSearch(entry(`s${i}`), storage);
    rememberSearch(entry('s3'), storage);
    const ids = loadRecent(now, 30, storage).map((e) => e.id);
    expect(ids[0]).toBe('s3');
    expect(ids).toHaveLength(RECENT_MAX);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops searches the server has deleted (older than the retention) and forgets on request', () => {
    const storage = memoryStorage();
    rememberSearch(entry('old', '2026-08-01T10:00:00Z'), storage);
    rememberSearch(entry('new'), storage);
    expect(loadRecent(now, 30, storage).map((e) => e.id)).toEqual(['new']);
    forgetSearch('new', storage);
    expect(loadRecent(now, 30, storage)).toEqual([]);
  });

  it('survives broken or foreign data', () => {
    const storage = memoryStorage();
    storage.setItem('recent-searches-v1', '{broken');
    expect(loadRecent(now, 30, storage)).toEqual([]);
    storage.setItem('recent-searches-v1', JSON.stringify([{ id: 1 }, entry('ok')]));
    expect(loadRecent(now, 30, storage).map((e) => e.id)).toEqual(['ok']);
  });

  it('names places and window briefly', () => {
    expect(recentLabel(['Füssen', 'Oberstdorf'], { start: '2026-10-05', end: '2026-11-15' })).toBe('Füssen, Oberstdorf · 05.10.–15.11.2026');
    expect(recentLabel(['A', 'B', 'C', 'D', 'E'], { start: '2026-12-20', end: '2027-01-06' })).toBe('A, B, C +2 · 20.12.2026–06.01.2027');
  });
});
