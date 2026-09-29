// The committed catalog must stay valid against the locality database, and
// the import must be idempotent and respect the approval flag.
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '@reiseplaner/db/node';
import { searchLocalities } from '@reiseplaner/db';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { catalogCounts, importCatalog } from '../src/catalog/import';
import { loadCatalog } from '../src/catalog/load';
import { validateCatalog } from '../src/catalog/validate';
import { importGeoNames } from '../src/geonames/import';

let test: TestDb;
beforeAll(async () => {
  test = await createTestDb();
  await importGeoNames(test.db, resolve(repoRoot, 'data/geonames/dev-extract'));
}, 120_000);
afterAll(async () => test.close());

const catalog = () => loadCatalog(resolve(repoRoot, 'data/catalog'));

describe('development extract (Aufgabe 3)', () => {
  it('finds places by postal code in DE, AT and CH', async () => {
    expect((await searchLocalities(test.db, '87629', 5))[0]?.name).toBe('Füssen');
    expect((await searchLocalities(test.db, '10115', 5))[0]?.name).toBe('Berlin');
    expect((await searchLocalities(test.db, '60311', 5))[0]?.name).toBe('Frankfurt am Main');
    expect((await searchLocalities(test.db, '50667', 5))[0]?.name).toBe('Köln');
    expect((await searchLocalities(test.db, '6580', 5))[0]?.name).toBe('St Anton am Arlberg');
    expect((await searchLocalities(test.db, '3920', 5))[0]?.name).toBe('Zermatt');
    // A postal code prefix lists the places of that area.
    expect((await searchLocalities(test.db, '876', 8)).map((l) => l.name)).toContain('Füssen');
  });

  it('knows places from 500 inhabitants', async () => {
    // Balderschwang (Allgäu) is only in GeoNames cities500, not in cities1000.
    expect((await searchLocalities(test.db, 'Balderschwang', 3))[0]?.name).toBe('Balderschwang');
    expect((await searchLocalities(test.db, '87538', 5)).map((l) => l.name)).toContain('Balderschwang');
  });
});

describe('catalog', () => {
  it('validates without errors: vocabulary, texts, matching, coordinates, duplicates', async () => {
    const result = await validateCatalog(test.db, catalog());
    expect(result.errors).toEqual([]);
    expect(result.stats.places).toBeGreaterThanOrEqual(200);
    expect(result.stats.regions).toBeGreaterThanOrEqual(30);
    expect(result.stats.matched).toBe(result.stats.places);
  });

  it('imports only approved entries unless drafts are requested', async () => {
    const stats = await importCatalog(test.db, catalog(), { includeDrafts: false });
    expect(stats.places).toBe(0);
    expect(stats.skippedUnverified).toBeGreaterThan(0);
  });

  it('is idempotent', async () => {
    await importCatalog(test.db, catalog(), { includeDrafts: true });
    const first = await catalogCounts(test.db);
    await importCatalog(test.db, catalog(), { includeDrafts: true });
    expect(await catalogCounts(test.db)).toEqual(first);
    expect(first.places).toBe(catalog().places.length);
  });

  it('flags broken entries', async () => {
    const broken = catalog();
    const first = broken.places[0]!;
    broken.places.push({ ...first, place: { ...first.place, description_de: 'Bestpreis garantiert — jetzt' } });
    broken.places.push({ ...first, place: { ...first.place, name: 'Nirgendwo', geonameid: undefined as unknown as number } });
    const result = await validateCatalog(test.db, broken);
    expect(result.errors.some((e) => e.includes('verbotene Aussage'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Typografie'))).toBe(true);
    expect(result.errors.some((e) => e.includes('dieselbe geonameid'))).toBe(true);
    expect(result.errors.some((e) => e.includes('nicht zugeordnet'))).toBe(true);
  });
});
