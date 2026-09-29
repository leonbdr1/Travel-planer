// Catalog pipeline with the simulated model: matching, spread check,
// duplicates, typography and drafts that pass the validator.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { productConfig } from '@reiseplaner/config';
import { repoRoot } from '@reiseplaner/db/node';
import { CATALOG_COUNTRIES } from '@reiseplaner/domain';
import { createTestDb, type TestDb } from '@reiseplaner/db/testing';
import { createProviders } from '@reiseplaner/providers';
import { fakeResponders, memorySkillHooks } from '@reiseplaner/skills';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateCatalog, parseCountries } from '../src/catalog/generate';
import { loadCatalog } from '../src/catalog/load';
import { validateCatalog } from '../src/catalog/validate';
import { importGeoNames } from '../src/geonames/import';

let test: TestDb;
beforeAll(async () => {
  test = await createTestDb();
  await importGeoNames(test.db, resolve(repoRoot, 'data/geonames/dev-extract'));
}, 120_000);
afterAll(async () => test.close());

function deps() {
  const llm = createProviders(
    {
      mode: 'fake',
      liteapi: { baseUrl: 'http://x', bookBaseUrl: 'http://x' },
      ors: { baseUrl: 'http://x' },
      resend: {},
      anthropic: {},
    },
    { fake: { llmResponders: fakeResponders } },
  ).llm;
  const hooks = memorySkillHooks(1);
  return { deps: { llm, llmEnabled: true, prices: productConfig.ai, budget: hooks.budget, telemetry: hooks.telemetry }, hooks };
}

describe('catalog generate (fake model)', () => {
  it('parses country lists', () => {
    expect(parseCountries('DE')).toEqual(['DE']);
    expect(parseCountries('de,it-bz')).toEqual(['DE', 'IT-BZ']);
    expect(parseCountries(undefined)).toEqual([...CATALOG_COUNTRIES]);
    expect(parseCountries('fr,it')).toEqual(['FR', 'IT']);
    expect(parseCountries('US')).toBeNull();
  });

  it('knows the same catalog countries as product.config.yaml allows (drift check)', () => {
    for (const c of productConfig.markets.catalog_countries) expect(CATALOG_COUNTRIES).toContain(c);
  });

  it('writes validated drafts and reports unmatched places, outliers and duplicates', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'catalog-gen-'));
    const { deps: d, hooks } = deps();
    const report = await generateCatalog(test.db, d, {
      countries: ['DE', 'IT-BZ'],
      outDir,
      sourceDir: resolve(repoRoot, 'data/catalog'),
      pollIntervalMs: 1,
      now: () => new Date('2026-09-27T00:00:00Z'),
    });
    expect(report.regionsCreated).toEqual(expect.arrayContaining(['Allgäu', 'Schwarzwald', 'Rügen', 'Gröden', 'Meraner Land']));
    expect(report.unmatched).toContain('Allgäu/Alpseewinkel');
    expect(report.duplicates).toContain('Allgäu/Markt Oberstdorf = Allgäu/Oberstdorf');
    expect(report.outsideRegion).toEqual(['Rügen/Sellin → Sellin']);
    expect(report.failedBatchItems).toEqual([]);
    expect(report.costUsd).toBe(0);
    expect(hooks.runs.every((r) => r.batch && r.outcome === 'ok')).toBe(true);

    const allgaeu = readFileSync(join(outDir, 'places/allgaeu.yaml'), 'utf8');
    expect(allgaeu).toContain('verified: false');
    expect(allgaeu).toContain('ai_assisted: true');
    expect(allgaeu).toContain('- Alpseewinkel: nicht zugeordnet');
    expect(allgaeu).not.toMatch(/lat|lng/);

    const catalog = loadCatalog(outDir);
    const result = await validateCatalog(test.db, catalog);
    expect(result.errors).toEqual([]);
    expect(result.stats.matched).toBe(result.stats.places);
    const groeden = catalog.places.filter((p) => p.region === 'groeden').map((p) => p.place.name);
    expect(groeden).toEqual(['St. Ulrich in Gröden', 'Wolkenstein in Gröden', 'St. Christina in Gröden']);

    // A second run skips the regions that already exist in the output.
    const again = await generateCatalog(test.db, deps().deps, {
      countries: ['DE'],
      outDir,
      sourceDir: resolve(repoRoot, 'data/catalog'),
      pollIntervalMs: 1,
      now: () => new Date('2026-09-27T00:00:00Z'),
    });
    expect(again.regionsCreated).toEqual([]);
    expect(again.regionsSkipped).toHaveLength(4);
  });
});
