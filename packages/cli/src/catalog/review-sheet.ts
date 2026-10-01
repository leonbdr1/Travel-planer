// `catalog review-sheet`: the editorial check list for BG-11. Runs the checks a
// machine can do (GeoNames facts against the hand-rated values, plausibility of
// themes and scores) and leaves the human the flagged cases plus a small,
// deterministic sample per region. Offline: reads the YAML catalog and the
// GeoNames development extracts, no database.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogAttractiveness, stripDiacritics } from '@reiseplaner/domain';
import type { LoadedCatalog } from './load';

interface GeoRow {
  name: string;
  /** German names from the extract's alt-name files (Venedig, Bozen …). */
  altDe: string[];
  population: number;
  country: string;
}

const EXTRACTS = ['DACH-cities1000.tsv', 'DACH-cities500-extra.tsv', 'EU-cities3000.tsv'];

export function loadGeoFacts(geoDir: string): Map<number, GeoRow> {
  const facts = new Map<number, GeoRow>();
  const alt = new Map<number, string[]>();
  for (const file of ['alt-names-de.json', 'alt-names-bz.json', 'alt-names-eu.json']) {
    const path = join(geoDir, file);
    if (!existsSync(path)) continue;
    for (const [id, names] of Object.entries(JSON.parse(readFileSync(path, 'utf8')) as Record<string, string[]>)) alt.set(Number(id), [...(alt.get(Number(id)) ?? []), ...names]);
  }
  for (const file of EXTRACTS) {
    const path = join(geoDir, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const c = line.split('\t');
      const id = Number(c[0]);
      if (!id) continue;
      facts.set(id, { name: c[1] ?? '', altDe: alt.get(id) ?? [], population: Number(c[14] ?? 0) || 0, country: c[8] ?? '' });
    }
  }
  return facts;
}

/** Same input, same sample: a hash of the place name decides, not a random number. */
const plain = (t: string) => stripDiacritics(t).toLowerCase().replace(/ß/g, 'ss');
const hash = (text: string) => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

interface Row {
  region: string;
  regionName: string;
  name: string;
  geoName: string;
  population: number | null;
  fame: number | null;
  attractions: number | null;
  score: number;
  level: string;
  themes: string;
  flags: string[];
  sample: boolean;
}

export function buildReviewSheet(catalog: LoadedCatalog, geo: Map<number, GeoRow>): { markdown: string; flagged: number; total: number } {
  const regionName = new Map(catalog.regions.map((r) => [r.slug, r.name]));
  const rows: Row[] = catalog.places.map(({ region, place }) => {
    const rating = catalog.attractiveness.get(`${region}|${place.name}`) ?? null;
    const facts = place.geonameid ? geo.get(place.geonameid) : undefined;
    const population = facts?.population ?? null;
    const result = catalogAttractiveness({ fame: rating?.[0] ?? null, attractions: rating?.[1] ?? null, themes: place.themes, population });
    const flags: string[] = [];
    if (!place.geonameid) flags.push('nicht mit GeoNames abgeglichen');
    else if (!facts) flags.push('GeoNames-Eintrag nicht im Entwicklungsauszug');
    else if (plain(facts.name) !== plain(place.name) && !facts.altDe.includes(place.name) && !place.match_name) flags.push(`GeoNames heißt „${facts.name}“`);
    if (!rating) flags.push('Bekanntheit/Attraktionen fehlen (Standard 2/1)');
    if (rating && population !== null) {
      if (rating[0] === 1 && population > 50_000) flags.push(`Bekanntheit 1 bei ${population} Einwohnern`);
    }
    const strong = Object.values(place.themes).filter((s) => s === 3).length;
    if (strong > 4) flags.push(`${strong} Themen mit Stärke 3 (zu viel versprochen?)`);
    if (rating && rating[1] === 3 && !place.themes.wintersport && !place.themes.staedte_kultur && !place.themes.bergpanorama && !place.themes.wellness) {
      flags.push('Attraktionen 3, aber kein passendes Thema (Wintersport, Kultur, Bergpanorama, Wellness)');
    }
    return {
      region,
      regionName: regionName.get(region) ?? region,
      name: place.name,
      geoName: facts?.name ?? '',
      population,
      fame: rating?.[0] ?? null,
      attractions: rating?.[1] ?? null,
      score: result.score,
      level: result.level,
      themes: Object.entries(place.themes).sort((a, b) => b[1] - a[1]).map(([c, s]) => `${c} ${s}`).join(', '),
      flags,
      sample: false,
    };
  });

  const byRegion = new Map<string, Row[]>();
  for (const r of rows) byRegion.set(r.region, [...(byRegion.get(r.region) ?? []), r]);
  const regionFlags = new Map<string, string[]>();
  for (const [slug, list] of byRegion) {
    const flags: string[] = [];
    if (Math.max(...list.map((r) => r.score)) < 6) flags.push('kein Ort mit 6 Punkten oder mehr: die Region erscheint bei weiter Entfernung nie');
    if (list.length < 3) flags.push(`nur ${list.length} Ort(e)`);
    regionFlags.set(slug, flags);
    // Sample: the best place (it drives the region) and two more by hash, at least three per region.
    const sorted = [...list].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'de'));
    const picks = new Set(sorted.slice(0, 1));
    for (const r of [...sorted.slice(1)].sort((a, b) => hash(a.name) - hash(b.name)).slice(0, 2)) picks.add(r);
    for (const r of picks) r.sample = true;
  }

  const flaggedRows = rows.filter((r) => r.flags.length > 0);
  const flaggedRegions = [...regionFlags].filter(([, f]) => f.length > 0);
  const out: string[] = [];
  out.push('# Prüfliste Ortskatalog (BG-11)', '');
  out.push('Erzeugt mit `npm run cli -- catalog review-sheet`. Nichts hiervon ist geprüft, solange die Kästchen leer sind. Die Datei enthält nur, was ein Mensch entscheiden muss.', '');
  out.push('## So gehst du vor', '');
  out.push('1. **Auffälligkeiten** (Abschnitt A): für jede Zeile entscheiden, ob der Wert stimmt oder in `data/catalog/attraktivitaet.yaml` bzw. der Ortsdatei geändert werden muss. Sag mir einfach „Ort X: Bekanntheit 2“, ich trage es ein.');
  out.push('2. **Stichprobe** (Abschnitt B): pro Region drei Orte, darunter der beste. Frage: Gibt es den Ort, taugt er als Unterkunftsbasis, passen Themen und Bekanntheit ungefähr?');
  out.push('3. Wenn eine Region durch ist: Sag „Region X geprüft“, ich setze `verified: true` (Runbook `docs/runbooks/katalogpruefung.md`).', '');
  out.push(`Stand: ${rows.length} Orte in ${byRegion.size} Regionen; ${flaggedRows.length} Orte und ${flaggedRegions.length} Regionen mit Auffälligkeit.`, '');
  out.push('## A. Auffälligkeiten', '');
  if (flaggedRegions.length > 0) {
    out.push('### Regionen', '', '| ☐ | Region | Auffälligkeit |', '|---|---|---|');
    for (const [slug, f] of flaggedRegions) out.push(`| ☐ | ${regionName.get(slug) ?? slug} | ${f.join('; ')} |`);
    out.push('');
  }
  out.push('### Orte', '', '| ☐ | Region | Ort | Auffälligkeit | Bekanntheit / Attraktionen | Punkte |', '|---|---|---|---|---|---|');
  for (const r of flaggedRows) out.push(`| ☐ | ${r.regionName} | ${r.name} | ${r.flags.join('; ')} | ${r.fame ?? '–'} / ${r.attractions ?? '–'} | ${r.score} |`);
  const top = (list: Row[]) => Math.max(...list.map((r) => r.score));
  const ordered = [...byRegion].sort((a, b) => top(b[1]) - top(a[1]) || (regionName.get(a[0]) ?? a[0]).localeCompare(regionName.get(b[0]) ?? b[0], 'de'));
  const priority = ordered.filter(([, list]) => top(list) >= 8).length;
  out.push('', '## B. Stichprobe je Region', '');
  out.push(`Sortiert nach dem besten Ort der Region. Die ersten ${priority} Regionen (bester Ort ab 8 Punkten) erscheinen bei weiter Entfernung und im Flugmodus: **hier zuerst prüfen**, die übrigen können warten.`, '');
  for (const [slug, list] of ordered) {
    out.push(`### ${regionName.get(slug) ?? slug}`, '', '| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |', '|---|---|---|---|---|---|---|');
    for (const r of list.filter((x) => x.sample).sort((a, b) => b.score - a.score)) {
      out.push(`| ☐ | ${r.name} | ${r.population ?? '–'} | ${r.fame ?? '–'} / ${r.attractions ?? '–'} | ${r.score} | ${r.level} | ${r.themes} |`);
    }
    out.push('');
  }
  return { markdown: out.join('\n'), flagged: flaggedRows.length, total: rows.length };
}
