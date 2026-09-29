// `catalog generate` pipeline (S3.4): catalog skills via the Message Batches
// API → matching every place against geo_localities (exact or trigram hit
// inside the region, else "nicht zugeordnet") → validation (vocabulary,
// length, claims) → duplicate check (same locality, or similar name under
// CATALOG_DUPLICATE_KM) → typography scrubber → YAML drafts with
// verified: false and ai_assisted: true. Coordinates never come from the model.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { productConfig } from '@reiseplaner/config';
import { matchLocality, type Locality, type Queryable } from '@reiseplaner/db';
import {
  THEME_CODES,
  admin1ForName,
  constants,
  findClaimViolations,
  haversineKm,
  normalizeGermanTypography,
  slugify,
  stripDiacritics,
} from '@reiseplaner/domain';
import { runSkillBatch, type SkillRunnerDeps } from '@reiseplaner/skills';
import { Document, parseDocument } from 'yaml';
import { loadCatalog } from './load';
import { catalogCountries, type CatalogCountry } from './schema';
import { BOUNDS } from './validate';

interface RegionOut {
  name: string;
  descriptionDe: string;
  themes: string[];
}
interface PlaceOut {
  name: string;
  subdivision: string;
  themes: Array<{ code: string; strength: number }>;
  descriptionDe: string;
  searchRadiusKm: number;
}

export interface GenerateOptions {
  countries: CatalogCountry[];
  outDir: string;
  sourceDir: string;
  pollIntervalMs: number;
  now: () => Date;
  onProgress?: (line: string) => void;
}

export interface GenerateReport {
  regionsCreated: string[];
  regionsSkipped: string[];
  regionsRejected: string[];
  placesWritten: number;
  exact: number;
  fuzzy: Array<{ place: string; matched: string }>;
  unmatched: string[];
  outsideRegion: string[];
  duplicates: string[];
  rejected: string[];
  failedBatchItems: string[];
  costUsd: number;
  estimateUsd: number;
  files: string[];
}

/** regions/<file>.yaml per catalog country: de, at, …, it-bz. */
const countryFile = (country: CatalogCountry) => country.toLowerCase();

function textProblems(text: string): string[] {
  return findClaimViolations(text, productConfig.compliance.forbidden_claims).map((v) => `verbotene Aussage „${v.claim}“`);
}

function similarName(a: string, b: string): boolean {
  const x = stripDiacritics(a).toLowerCase();
  const y = stripDiacritics(b).toLowerCase();
  return x.includes(y) || y.includes(x);
}

function inCountry(country: CatalogCountry, l: Locality): boolean {
  const b = BOUNDS[country];
  return l.lat >= b.lat[0] && l.lat <= b.lat[1] && l.lng >= b.lng[0] && l.lng <= b.lng[1];
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

export async function generateCatalog(db: Queryable, deps: SkillRunnerDeps, options: GenerateOptions): Promise<GenerateReport> {
  const log = options.onProgress ?? (() => undefined);
  const report: GenerateReport = {
    regionsCreated: [],
    regionsSkipped: [],
    regionsRejected: [],
    placesWritten: 0,
    exact: 0,
    fuzzy: [],
    unmatched: [],
    outsideRegion: [],
    duplicates: [],
    rejected: [],
    failedBatchItems: [],
    costUsd: 0,
    estimateUsd: 0,
    files: [],
  };
  mkdirSync(join(options.outDir, 'regions'), { recursive: true });
  mkdirSync(join(options.outDir, 'places'), { recursive: true });
  if (!existsSync(join(options.outDir, 'themes.yaml'))) {
    copyFileSync(join(options.sourceDir, 'themes.yaml'), join(options.outDir, 'themes.yaml'));
    report.files.push('themes.yaml');
  }
  const existing = loadCatalog(options.outDir);
  const existingSlugs = new Set(existing.regions.map((r) => r.slug));
  const date = options.now().toISOString().slice(0, 10);

  // Stage 1: regions per country (one batch).
  log(`Regionen: Batch mit ${options.countries.length} Anfrage(n) …`);
  const regionBatch = await runSkillBatch<{ regions: RegionOut[] }>(
    deps,
    'reiseplaner.catalog-regions',
    options.countries.map((c) => ({ customId: c, input: { countryCode: c, themes: [...THEME_CODES] } })),
    { correlationId: `catalog-regions:${date}`, pollIntervalMs: options.pollIntervalMs, onPoll: (s) => log(`  Batch-Status: ${s}`) },
  );
  report.costUsd += regionBatch.costUsd;
  report.estimateUsd += regionBatch.estimateUsd;

  const regions: Array<RegionOut & { slug: string; country: CatalogCountry }> = [];
  for (const item of regionBatch.items) {
    if (!item.ok) {
      report.failedBatchItems.push(`Regionen ${item.customId}: ${item.reason}`);
      continue;
    }
    const country = item.customId as CatalogCountry;
    for (const r of item.output.regions) {
      const slug = slugify(r.name);
      const descriptionDe = normalizeGermanTypography(r.descriptionDe);
      const problems = textProblems(descriptionDe);
      if (problems.length > 0) {
        report.regionsRejected.push(`${r.name}: ${problems.join(', ')}`);
        continue;
      }
      if (existingSlugs.has(slug) || regions.some((x) => x.slug === slug)) {
        report.regionsSkipped.push(r.name);
        continue;
      }
      regions.push({ ...r, descriptionDe, slug, country });
    }
  }

  // Stage 2: places per new region (one batch).
  log(`Orte: Batch mit ${regions.length} Anfrage(n) …`);
  const placeBatch =
    regions.length === 0
      ? { items: [], costUsd: 0, estimateUsd: 0 }
      : await runSkillBatch<{ places: PlaceOut[] }>(
          deps,
          'reiseplaner.catalog-places',
          regions.map((r) => ({
            customId: r.slug,
            input: { region: { name: r.name, countryCode: r.country, descriptionDe: r.descriptionDe }, themes: r.themes },
          })),
          { correlationId: `catalog-places:${date}`, pollIntervalMs: options.pollIntervalMs, onPoll: (s) => log(`  Batch-Status: ${s}`) },
        );
  report.costUsd += placeBatch.costUsd;
  report.estimateUsd += placeBatch.estimateUsd;

  // Known localities for the duplicate check: the existing drafts in outDir.
  const taken: Array<{ label: string; name: string; geonameid: number; lat: number; lng: number }> = [];
  for (const { region, place } of existing.places) {
    if (place.geonameid === undefined) continue;
    const rows = await db.query<{ lat: number; lng: number }>('SELECT lat, lng FROM app.geo_localities WHERE geonameid = $1', [
      place.geonameid,
    ]);
    if (rows[0]) taken.push({ label: `${region}/${place.name}`, name: place.name, geonameid: place.geonameid, ...rows[0] });
  }

  const regionDocs = new Map<CatalogCountry, Document>();
  for (const region of regions) {
    const item = placeBatch.items.find((i) => i.customId === region.slug);
    if (!item?.ok) {
      report.failedBatchItems.push(`Orte ${region.name}: ${item ? item.reason : 'missing'}`);
      continue;
    }
    type Candidate = { place: PlaceOut; locality: Locality; exact: boolean; descriptionDe: string };
    const candidates: Candidate[] = [];
    const notes: string[] = [];
    for (const place of item.output.places) {
      const label = `${region.name}/${place.name}`;
      const descriptionDe = normalizeGermanTypography(place.descriptionDe);
      const problems = textProblems(descriptionDe);
      if (problems.length > 0) {
        report.rejected.push(`${label}: ${problems.join(', ')}`);
        notes.push(`${place.name}: abgelehnt (${problems.join(', ')})`);
        continue;
      }
      const admin1 = region.country === 'IT-BZ' ? null : admin1ForName(region.country, place.subdivision);
      const match =
        (await matchLocality(db, place.name, region.country, admin1)) ??
        (admin1 === null ? null : await matchLocality(db, place.name, region.country, null));
      if (!match || !inCountry(region.country, match.locality)) {
        report.unmatched.push(label);
        notes.push(`${place.name}: nicht zugeordnet`);
        continue;
      }
      candidates.push({ place, locality: match.locality, exact: match.exact, descriptionDe });
    }

    // Region spread: exact matches define the region's centre.
    const anchor = candidates.filter((c) => c.exact);
    const centre =
      anchor.length > 0
        ? { lat: median(anchor.map((c) => c.locality.lat)), lng: median(anchor.map((c) => c.locality.lng)) }
        : null;

    const accepted: Candidate[] = [];
    for (const c of candidates) {
      const label = `${region.name}/${c.place.name}`;
      if (centre && haversineKm(centre, c.locality) > constants.CATALOG_REGION_MAX_SPREAD_KM) {
        report.outsideRegion.push(`${label} → ${c.locality.displayName}`);
        notes.push(`${c.place.name}: ${c.locality.displayName} liegt außerhalb der Region`);
        continue;
      }
      const dup = taken.find(
        (t) =>
          t.geonameid === c.locality.geonameid ||
          (similarName(t.name, c.place.name) && haversineKm(t, c.locality) < constants.CATALOG_DUPLICATE_KM),
      );
      if (dup) {
        report.duplicates.push(`${label} = ${dup.label}`);
        notes.push(`${c.place.name}: Dublette von ${dup.label}`);
        continue;
      }
      taken.push({ label, name: c.place.name, geonameid: c.locality.geonameid, lat: c.locality.lat, lng: c.locality.lng });
      if (c.exact) report.exact += 1;
      else report.fuzzy.push({ place: label, matched: c.locality.displayName });
      accepted.push(c);
    }
    if (accepted.length === 0) {
      report.regionsRejected.push(`${region.name}: kein zugeordneter Ort`);
      continue;
    }

    const placesDoc = new Document({
      region: region.slug,
      places: accepted.map((c) => ({
        name: c.place.name,
        ...(c.exact ? {} : { match_name: c.locality.name }),
        ...(region.country === 'IT-BZ' ? {} : { admin1: c.locality.admin1 }),
        themes: Object.fromEntries(c.place.themes.map((t) => [t.code, t.strength])),
        description_de: c.descriptionDe,
        search_radius_km: c.place.searchRadiusKm,
        ai_assisted: true,
        verified: false,
        geonameid: c.locality.geonameid,
      })),
    });
    placesDoc.commentBefore = ` KI-Entwurf aus \`catalog generate\` (${date}), redaktionelle Prüfung ausstehend (BG-11).`;
    if (notes.length > 0) placesDoc.comment = ` Nicht übernommen, bitte prüfen:\n${notes.map((n) => ` - ${n}`).join('\n')}`;
    writeFileSync(join(options.outDir, 'places', `${region.slug}.yaml`), placesDoc.toString({ lineWidth: 200 }));
    report.files.push(`places/${region.slug}.yaml`);
    report.placesWritten += accepted.length;

    const regionFile = join(options.outDir, 'regions', `${countryFile(region.country)}.yaml`);
    let doc = regionDocs.get(region.country);
    if (!doc) {
      doc = existsSync(regionFile) ? parseDocument(readFileSync(regionFile, 'utf8')) : new Document([]);
      regionDocs.set(region.country, doc);
    }
    doc.add(
      doc.createNode({
        slug: region.slug,
        name: region.name,
        country: region.country,
        description_de: region.descriptionDe,
        themes: region.themes,
        source: 'ai',
        ai_assisted: true,
        verified: false,
      }),
    );
    report.regionsCreated.push(region.name);
  }
  for (const [country, doc] of regionDocs) {
    writeFileSync(join(options.outDir, 'regions', `${countryFile(country)}.yaml`), doc.toString({ lineWidth: 200 }));
    report.files.push(`regions/${countryFile(country)}.yaml`);
  }
  return report;
}

export function parseCountries(value: string | undefined): CatalogCountry[] | null {
  if (!value || value === 'all') return [...catalogCountries];
  const list = value.split(',').map((v) => v.trim().toUpperCase());
  return list.every((v): v is CatalogCountry => (catalogCountries as readonly string[]).includes(v)) ? list : null;
}
