// Builds the development extract EU-cities1000.tsv (Aufgabe F15, widened in F20) in the
// GeoNames dump format (19 tab-separated columns), like build.mjs for DACH.
//
// Countries: all of Europe that the product knows (GEO_COUNTRIES in
// packages/domain): Italy without South Tyrol, which DACH-cities1000.tsv
// covers, France, Spain, Portugal, Benelux, Nordics, Baltics, Balkans, Malta,
// Cyprus, Greece, Great Britain, Ireland ... (Aufgabe F20 added Albania to
// Serbia, Finland, Iceland, the Baltics, Malta, Cyprus, Andorra, Monaco,
// Liechtenstein). Settlements from MIN_POPULATION inhabitants (default 1,000,
// so that a small village is found: "meine Tante wohnt dort"), plus the
// smaller catalog places listed in eu-keep-ids.json (Vernazza ...).
// German names (Venedig, Rom, Lissabon …) come from alt-names-eu.json.
//
// Source: npm package all-the-cities@3.1.0 (GeoNames cities1000, CC BY 4.0),
// decoded with pbf@3.2.1. Run manually (operator), not part of CI:
//   npm pack all-the-cities@3.1.0 && tar -xzf all-the-cities-3.1.0.tgz
//   npm install --no-save pbf@3.2.1
//   node data/geonames/dev-extract/build-europe.mjs package/cities.pbf
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Pbf = require('pbf');
const here = dirname(fileURLToPath(import.meta.url));
const altNames = JSON.parse(readFileSync(join(here, 'alt-names-eu.json'), 'utf8'));
const keep = new Set(JSON.parse(readFileSync(join(here, 'eu-keep-ids.json'), 'utf8')));
const MIN_POPULATION = Number(process.env.MIN_POPULATION ?? 1000);

const tz = {
  IT: 'Europe/Rome', FR: 'Europe/Paris', ES: 'Europe/Madrid', PT: 'Europe/Lisbon', NL: 'Europe/Amsterdam', BE: 'Europe/Brussels',
  LU: 'Europe/Luxembourg', DK: 'Europe/Copenhagen', CZ: 'Europe/Prague', PL: 'Europe/Warsaw', HU: 'Europe/Budapest', HR: 'Europe/Zagreb',
  SI: 'Europe/Ljubljana', SK: 'Europe/Bratislava', GR: 'Europe/Athens', GB: 'Europe/London', IE: 'Europe/Dublin', NO: 'Europe/Oslo',
  SE: 'Europe/Stockholm', AL: 'Europe/Tirane', AD: 'Europe/Andorra', BA: 'Europe/Sarajevo', BG: 'Europe/Sofia', CY: 'Asia/Nicosia',
  EE: 'Europe/Tallinn', FI: 'Europe/Helsinki', IS: 'Atlantic/Reykjavik', LV: 'Europe/Riga', LI: 'Europe/Vaduz', LT: 'Europe/Vilnius',
  MT: 'Europe/Malta', MC: 'Europe/Monaco', ME: 'Europe/Podgorica', MK: 'Europe/Skopje', RO: 'Europe/Bucharest', RS: 'Europe/Belgrade',
};

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

const ascii = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const rows = cities
  .filter((c) => c.country in tz && !(c.country === 'IT' && c.muni.startsWith('021')))
  .filter((c) => c.population >= MIN_POPULATION || keep.has(c.id))
  .sort((a, b) => a.country.localeCompare(b.country) || a.id - b.id)
  .map((c) =>
    [
      c.id, c.name, ascii(c.name), (altNames[String(c.id)] ?? []).join(','), c.lat.toFixed(5), c.lng.toFixed(5), 'P', c.featureCode, c.country, '',
      c.admin1, '', c.muni, c.muniSub, c.population, '', '', tz[c.country], '',
    ].join('\t'),
  );
writeFileSync(join(here, process.env.OUT ?? 'EU-cities1000.tsv'), `${rows.join('\n')}\n`);
console.log(`wrote ${rows.length} rows`);
