// The committed catalog must stay valid against the locality database, and
// the import must be idempotent and respect the approval flag.
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '@reiseplaner/db/node';
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
