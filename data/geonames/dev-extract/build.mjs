// Builds the development extract DACH-cities1000.tsv in the GeoNames dump
// format (19 tab-separated columns, see https://download.geonames.org/export/dump/readme.txt).
//
// Source: npm package all-the-cities@3.1.0 (GeoNames cities1000, CC BY 4.0),
// decoded with pbf@3.2.1. Run manually (operator), not part of CI:
//   npm pack all-the-cities@3.1.0 && tar -xzf all-the-cities-3.1.0.tgz
//   npm install --no-save pbf@3.2.1
//   node data/geonames/dev-extract/build.mjs package/cities.pbf
//
// German names for South Tyrol are added from the official bilingual
// municipality names (alt-names-bz.json); the real GeoNames import (O3.1)
// brings them from alternateNames and replaces this extract.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Pbf = require('pbf');
const here = dirname(fileURLToPath(import.meta.url));
const altNamesBz = JSON.parse(readFileSync(join(here, 'alt-names-bz.json'), 'utf8'));
// A few large cities carry their English or French exonym as GeoNames main
// name (Munich, Vienna, Genève); their German names are added here.
const altNamesDe = JSON.parse(readFileSync(join(here, 'alt-names-de.json'), 'utf8'));

const pbf = new Pbf(readFileSync(process.argv[2]));
let lastLat = 0;
let lastLon = 0;
const cities = [];
function readCity(tag, c, p) {
  if (tag === 1) c.id = p.readSVarint();
  else if (tag === 2) c.name = p.readString();
  else if (tag === 3) c.country = p.readString();
  else if (tag === 4) c.altName = p.readString();
  else if (tag === 5) c.muni = p.readString();
  else if (tag === 6) c.muniSub = p.readString();
  else if (tag === 7) c.featureCode = p.readString();
  else if (tag === 8) c.admin1 = p.readString();
  else if (tag === 9) c.population = p.readVarint();
  else if (tag === 10) {
    lastLon += p.readSVarint();
    c.lng = lastLon / 1e5;
  } else if (tag === 11) {
    lastLat += p.readSVarint();
    c.lat = lastLat / 1e5;
  }
}
while (pbf.pos < pbf.length) {
  cities.push(pbf.readMessage(readCity, { id: 0, name: '', country: '', altName: '', muni: '', muniSub: '', featureCode: '', admin1: '', population: 0, lat: 0, lng: 0 }));
}

const tz = { DE: 'Europe/Berlin', AT: 'Europe/Vienna', CH: 'Europe/Zurich', IT: 'Europe/Rome' };
const ascii = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const rows = cities
  .filter((c) => ['DE', 'AT', 'CH'].includes(c.country) || (c.country === 'IT' && c.muni.startsWith('021')))
  .sort((a, b) => a.country.localeCompare(b.country) || a.id - b.id)
  .map((c) => {
    const southTyrol = c.country === 'IT';
    const alt = southTyrol
      ? (altNamesBz[String(c.id)] ?? (c.name.includes(' - ') ? [c.name.split(' - ')[1]] : []))
      : (altNamesDe[String(c.id)] ?? []);
    return [
      c.id, c.name, ascii(c.name), alt.join(','), c.lat.toFixed(5), c.lng.toFixed(5), 'P', c.featureCode, c.country, '',
      c.admin1, southTyrol ? 'BZ' : '', c.muni, c.muniSub, c.population, '', '', tz[c.country], '',
    ].join('\t');
  });
writeFileSync(join(here, 'DACH-cities1000.tsv'), `${rows.join('\n')}\n`);
console.log(`wrote ${rows.length} rows`);
