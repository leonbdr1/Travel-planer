// Extends the development extract (Aufgabe 3, 29.09.2026): smaller places and
// postal codes, because download.geonames.org is blocked in the build session.
// Run manually (operator), not part of CI:
//
//   pip download geonamescache==3.0.2 --no-deps && unzip geonamescache-3.0.2-py3-none-any.whl -d gc
//   npm pack postleitzahlen@1.0.0 plz-ort@1.2018.2 switzerland-postal-codes@5.0.1   (and unpack each)
//   npx tsx data/geonames/dev-extract/build-extra.ts \
//     gc/geonamescache/data/cities500.json \
//     postleitzahlen/package/data/plz.full.json \
//     plz-ort/package/data.js \
//     switzerland-postal-codes/package/data/postal-codes.tsv
//
// Outputs (next to this file):
// - DACH-cities500-extra.tsv: GeoNames cities500 (CC BY 4.0, real geonameids)
//   in DE, AT and CH that are not in DACH-cities1000.tsv (places from 500
//   inhabitants), GeoNames dump format, without alternate names.
// - zip/DE.txt, zip/AT.txt, zip/CH.txt: postal codes in the GeoNames postal
//   format (12 columns). DE: postal code → place names from OpenStreetMap
//   (© OpenStreetMap contributors, ODbL, via npm postleitzahlen); AT: postal
//   code → place (npm plz-ort, MIT); CH: postal code with coordinates (npm
//   switzerland-postal-codes, MIT). DE and AT have no coordinates: a name is
//   matched to the extract; several places of that name are told apart by
//   the places of the neighbouring postal codes (same first digits).
// The real GeoNames import (O3.1) replaces all of this.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { haversineKm, stripDiacritics } from '@reiseplaner/domain';

const here = dirname(fileURLToPath(import.meta.url));
const [cities500Path, plzDePath, plzAtPath, plzChPath] = process.argv.slice(2);
if (!cities500Path || !plzDePath || !plzAtPath || !plzChPath) {
  console.error('usage: build-extra.ts <cities500.json> <plz.full.json> <plz-ort data.js> <postal-codes.tsv>');
  process.exit(2);
}

interface Place {
  id: number;
  name: string;
  ascii: string;
  alt: string[];
  country: string;
  lat: number;
  lng: number;
}

const TZ: Record<string, string> = { DE: 'Europe/Berlin', AT: 'Europe/Vienna', CH: 'Europe/Zurich' };
const ascii = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

// 1. Places of the existing extract.
const base: Place[] = readFileSync(join(here, 'DACH-cities1000.tsv'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const c = line.split('\t');
    return {
      id: Number(c[0]),
      name: c[1] ?? '',
      ascii: c[2] ?? '',
      alt: (c[3] ?? '').split(',').filter(Boolean),
      country: c[8] ?? '',
      lat: Number(c[4]),
      lng: Number(c[5]),
    };
  });
const known = new Set(base.map((p) => p.id));

// 2. cities500 additions (DE, AT, CH; South Tyrol stays as it is).
interface GcCity {
  geonameid: number;
  name: string;
  latitude: number;
  longitude: number;
  countrycode: string;
  population: number;
  admin1code: string;
}
const gc = JSON.parse(readFileSync(cities500Path, 'utf8')) as Record<string, GcCity>;
const extra = Object.values(gc)
  .filter((c) => ['DE', 'AT', 'CH'].includes(c.countrycode) && !known.has(c.geonameid))
  .sort((a, b) => a.countrycode.localeCompare(b.countrycode) || a.geonameid - b.geonameid);
writeFileSync(
  join(here, 'DACH-cities500-extra.tsv'),
  `${extra
    .map((c) =>
      [
        c.geonameid, c.name, ascii(c.name), '', c.latitude.toFixed(5), c.longitude.toFixed(5), 'P', 'PPL', c.countrycode, '',
        c.admin1code, '', '', '', c.population, '', '', TZ[c.countrycode], '',
      ].join('\t'),
    )
    .join('\n')}\n`,
);
const places: Place[] = [
  ...base,
  ...extra.map((c) => ({ id: c.geonameid, name: c.name, ascii: ascii(c.name), alt: [], country: c.countrycode, lat: c.latitude, lng: c.longitude })),
];

/** Name key: diacritics, case, dots and "Sankt"/"St." do not matter ("St. Anton" = "St Anton" = "Sankt Anton"). */
const nameKey = (n: string) =>
  stripDiacritics(n)
    .replace(/\./g, ' ')
    .replace(/\bsankt\b/g, 'st')
    .replace(/\s+/g, ' ')
    .trim();

const byName = new Map<string, Place[]>();
for (const p of places) {
  for (const n of new Set([p.name, p.ascii, ...p.alt].map(nameKey))) {
    const key = `${p.country}|${n}`;
    byName.set(key, [...(byName.get(key) ?? []), p]);
  }
}

/** Candidates for a postal place name: the exact name, else the name before a district suffix ("Wien-Parlament", "Berlin Mitte"). */
function candidates(country: string, name: string): Place[] {
  const exact = byName.get(`${country}|${nameKey(name)}`);
  if (exact) return exact;
  const head = name.split(/[-,(/]| Postfach| bei | im | am | an der /)[0]?.trim() ?? '';
  return head && head !== name ? candidates(country, head) : [];
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

type Row = { code: string; name: string; place: Place };

/** Resolves code → names without coordinates: unique names first, then the nearest candidate to its postal neighbourhood. */
function resolve(country: string, pairs: Array<{ code: string; name: string }>, prefixes: number[]): { rows: Row[]; unmatched: number } {
  const unique: Row[] = [];
  const ambiguous: Array<{ code: string; name: string; list: Place[] }> = [];
  let unmatched = 0;
  for (const { code, name } of pairs) {
    const list = candidates(country, name);
    if (list.length === 1) unique.push({ code, name, place: list[0] as Place });
    else if (list.length > 1) ambiguous.push({ code, name, list });
    else {
      unmatched += 1;
      if (process.env.DEBUG_UNMATCHED) console.log(`unmatched ${country} ${code} ${name}`);
    }
  }
  const anchors = new Map<string, { lat: number[]; lng: number[] }>();
  for (const r of unique) {
    for (const len of prefixes) {
      const key = r.code.slice(0, len);
      const a = anchors.get(key) ?? { lat: [], lng: [] };
      a.lat.push(r.place.lat);
      a.lng.push(r.place.lng);
      anchors.set(key, a);
    }
  }
  const rows = [...unique];
  for (const a of ambiguous) {
    const anchor = prefixes.map((len) => anchors.get(a.code.slice(0, len))).find((x) => x && x.lat.length >= 2);
    if (!anchor) {
      unmatched += 1;
      continue;
    }
    const centre = { lat: median(anchor.lat), lng: median(anchor.lng) };
    const best = a.list.map((p) => ({ p, d: haversineKm(centre, p) })).sort((x, y) => x.d - y.d)[0];
    // Neighbouring postal codes lie within a few dozen kilometres.
    if (best && best.d <= 60) rows.push({ code: a.code, name: a.name, place: best.p });
    else unmatched += 1;
  }
  return { rows, unmatched };
}

const postalLine = (country: string, code: string, name: string, lat: number, lng: number) =>
  [country, code, name, '', '', '', '', '', '', lat.toFixed(5), lng.toFixed(5), ''].join('\t');

mkdirSync(join(here, 'zip'), { recursive: true });

// DE: OpenStreetMap postal code areas with their place names.
const plzDe = JSON.parse(readFileSync(plzDePath, 'utf8')) as Record<string, string[]>;
const de = resolve('DE', Object.entries(plzDe).flatMap(([code, names]) => names.map((name) => ({ code, name }))), [3, 2]);
writeFileSync(
  join(here, 'zip/DE.txt'),
  `${de.rows
    .sort((a, b) => a.code.localeCompare(b.code) || a.place.name.localeCompare(b.place.name))
    .map((r) => postalLine('DE', r.code, r.place.name, r.place.lat, r.place.lng))
    .join('\n')}\n`,
);

// AT: postal code → place.
const plzAt = createRequire(import.meta.url)(plzAtPath) as Record<string, string>;
const at = resolve('AT', Object.entries(plzAt).map(([code, name]) => ({ code, name })), [3, 2]);
writeFileSync(
  join(here, 'zip/AT.txt'),
  `${at.rows
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((r) => postalLine('AT', r.code, r.place.name, r.place.lat, r.place.lng))
    .join('\n')}\n`,
);

// CH: postal code with coordinates; the importer matches by name within 10 km, else the nearest place within 3 km.
const ch = readFileSync(plzChPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t'))
  .filter((c) => c[0] && Number.isFinite(Number(c[3])) && Number.isFinite(Number(c[4])));
writeFileSync(join(here, 'zip/CH.txt'), `${ch.map((c) => postalLine('CH', c[0] as string, c[1] ?? '', Number(c[3]), Number(c[4]))).join('\n')}\n`);

console.log(`cities500 extra: ${extra.length} (DE ${extra.filter((c) => c.countrycode === 'DE').length}, AT ${extra.filter((c) => c.countrycode === 'AT').length}, CH ${extra.filter((c) => c.countrycode === 'CH').length})`);
console.log(`DE postal: ${de.rows.length} rows, ${de.unmatched} names without a place`);
console.log(`AT postal: ${at.rows.length} rows, ${at.unmatched} names without a place`);
console.log(`CH postal: ${ch.length} rows`);
