// Builds EU-cities500-extra.tsv (Aufgabe F20, Ben 30.09.2026: "any place must be
// findable, free and quick"): the European places of 500 to 999 inhabitants
// from GeoNames cities500 (CC BY 4.0, real geonameids, package geonamescache),
// in the GeoNames dump format. The real import (O3.1) replaces all of this.
// Run manually (operator), not part of CI:
//   pip download geonamescache==3.0.2 --no-deps && unzip geonamescache-3.0.2-py3-none-any.whl -d gc
//   node data/geonames/dev-extract/build-europe-small.mjs gc/geonamescache/data/cities500.json
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const countries = new Set('IT FR ES PT NL BE LU DK CZ PL HU HR SI SK GR GB IE NO SE AL AD BA BG CY EE FI IS LV LI LT MT MC ME MK RO RS TR'.split(' '));
const known = new Set();
for (const file of ['DACH-cities1000.tsv', 'DACH-cities500-extra.tsv', 'EU-cities1000.tsv']) {
  for (const line of readFileSync(join(here, file), 'utf8').split('\n')) if (line) known.add(line.slice(0, line.indexOf('\t')));
}
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const all = Array.isArray(raw) ? raw : Object.values(raw);
const ascii = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const rows = all
  .filter((c) => countries.has(c.countrycode) && c.population < 1000 && !known.has(String(c.geonameid)))
  // South Tyrol lives in the DACH extract with its German names.
  .filter((c) => !(c.countrycode === 'IT' && c.admin1code === '17' && c.latitude > 46.2 && c.longitude > 10.3 && c.longitude < 12.5))
  .sort((a, b) => a.countrycode.localeCompare(b.countrycode) || a.geonameid - b.geonameid)
  .map((c) => [c.geonameid, c.name, ascii(c.name), '', c.latitude.toFixed(5), c.longitude.toFixed(5), 'P', 'PPL', c.countrycode, '', c.admin1code, '', '', '', c.population, '', '', c.timezone, ''].join('\t'));
writeFileSync(join(here, 'EU-cities500-extra.tsv'), `${rows.join('\n')}\n`);
console.log(`wrote ${rows.length} rows`);
