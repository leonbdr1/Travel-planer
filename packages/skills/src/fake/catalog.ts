// Fake models for the catalog skills: a small table of real regions and
// places (enough for `catalog generate --fake` and the eval datasets), plus a
// generic answer for unknown regions. One invented place ("Alpseewinkel") and
// one duplicate ("Markt Oberstdorf") exercise the pipeline's matching and
// duplicate checks.
import type { FakeLlmResponder } from '@reiseplaner/providers';
import { extractTag, fold } from './text';

type Themes = Record<string, 1 | 2 | 3>;
interface FakeRegion {
  name: string;
  descriptionDe: string;
  themes: string[];
}
interface FakePlace {
  name: string;
  subdivision: string;
  themes: Themes;
  descriptionDe: string;
  searchRadiusKm: number;
}

const regions: Record<string, FakeRegion[]> = {
  DE: [
    { name: 'Allgäu', descriptionDe: 'Voralpenland im Süden Bayerns mit Bergen, Seen und Almen, erschlossen durch Wander- und Radwege.', themes: ['wandern', 'bergpanorama', 'seen', 'wintersport', 'radfahren'] },
    { name: 'Schwarzwald', descriptionDe: 'Mittelgebirge im Südwesten mit dichten Wäldern, Wasserfällen, Thermen und traditionellen Höfen.', themes: ['wandern', 'natur_ruhe', 'wellness', 'wein_kulinarik'] },
    { name: 'Rügen', descriptionDe: 'Ostseeinsel mit Kreidefelsen, Seebädern und Buchenwäldern im Nationalpark Jasmund.', themes: ['natur_ruhe', 'radfahren', 'familie'] },
    { name: 'Sächsische Schweiz', descriptionDe: 'Elbsandsteingebirge südöstlich von Dresden mit Felsformationen, Schluchten und Aussichtspunkten.', themes: ['wandern', 'natur_ruhe', 'bergpanorama'] },
  ],
  AT: [
    { name: 'Salzkammergut', descriptionDe: 'Seenlandschaft zwischen Salzburg und Dachstein mit Wolfgangsee, Traunsee und historischen Salzorten.', themes: ['seen', 'wandern', 'bergpanorama', 'staedte_kultur'] },
    { name: 'Zillertal', descriptionDe: 'Tiroler Tal mit Skigebieten, Almen und dem Gletscher am Talschluss bei Hintertux.', themes: ['wintersport', 'wandern', 'bergpanorama', 'familie'] },
    { name: 'Wachau', descriptionDe: 'Donautal zwischen Melk und Krems mit Weinterrassen, Marillengärten und Donauradweg.', themes: ['wein_kulinarik', 'radfahren', 'staedte_kultur'] },
  ],
  CH: [
    { name: 'Berner Oberland', descriptionDe: 'Alpenregion um Interlaken mit Eiger, Mönch und Jungfrau sowie Thuner- und Brienzersee.', themes: ['bergpanorama', 'wandern', 'seen', 'wintersport'] },
    { name: 'Engadin', descriptionDe: 'Hochtal am Inn in Graubünden mit Seenplatte, Nationalpark und Wintersportorten.', themes: ['wintersport', 'seen', 'wandern', 'bergpanorama', 'wellness'] },
  ],
  'IT-BZ': [
    { name: 'Gröden', descriptionDe: 'Dolomitental mit Langkofel, Seiser Alm und Anschluss an die Sellaronda.', themes: ['wintersport', 'wandern', 'bergpanorama'] },
    { name: 'Vinschgau', descriptionDe: 'Tal im Westen Südtirols mit Apfelgärten, Waalwegen und Radweg entlang der Etsch.', themes: ['wandern', 'radfahren', 'wein_kulinarik'] },
    { name: 'Meraner Land', descriptionDe: 'Gebiet um die Kurstadt Meran mit Weinbergen, Gärten und Wegen bis ins Hochgebirge.', themes: ['wellness', 'wein_kulinarik', 'wandern', 'staedte_kultur'] },
  ],
  IT: [
    { name: 'Gardasee', descriptionDe: 'Größter See Italiens mit Zitronengärten, Burgen und Radwegen zwischen Riva und Sirmione.', themes: ['seen', 'radfahren', 'wandern', 'familie'] },
    { name: 'Toskana', descriptionDe: 'Hügelland mit Weingütern und den Kunststädten Florenz, Siena und Pisa.', themes: ['staedte_kultur', 'wein_kulinarik', 'radfahren'] },
    { name: 'Cinque Terre', descriptionDe: 'Fünf Dörfer an der ligurischen Steilküste mit Küstenwanderweg und Badebuchten.', themes: ['wandern', 'staedte_kultur', 'strand'] },
  ],
  ES: [
    { name: 'Mallorca', descriptionDe: 'Baleareninsel mit Palma, Buchten, Tramuntana-Gebirge und langen Sandstränden.', themes: ['strand', 'wandern', 'familie'] },
    { name: 'Andalusien', descriptionDe: 'Sevilla, Granada und Córdoba mit maurischem Erbe, dazu die Strände der Costa del Sol.', themes: ['staedte_kultur', 'strand', 'shopping'] },
  ],
};

const p = (name: string, subdivision: string, themes: Themes, descriptionDe: string, searchRadiusKm = 10): FakePlace => ({
  name,
  subdivision,
  themes,
  descriptionDe,
  searchRadiusKm,
});

const places: Record<string, FakePlace[]> = {
  'allgau': [
    p('Oberstdorf', 'Bayern', { wandern: 3, bergpanorama: 3, wintersport: 3 }, 'Markt am Fuß von Nebelhorn und Fellhorn mit Breitachklamm und Loipen.'),
    p('Füssen', 'Bayern', { staedte_kultur: 3, seen: 3, radfahren: 2 }, 'Stadt am Forggensee mit Altstadt, nahe den Königsschlössern.'),
    p('Pfronten', 'Bayern', { wandern: 2, bergpanorama: 2, familie: 2 }, 'Streusiedlung im Vilstal mit Burgruine Falkenstein und Bergbahn auf den Breitenberg.', 12),
    p('Immenstadt im Allgäu', 'Bayern', { seen: 3, wandern: 2, radfahren: 2 }, 'Kleinstadt am Großen Alpsee mit Zugang zur Nagelfluhkette.'),
    p('Sonthofen', 'Bayern', { wandern: 2, radfahren: 2, familie: 1 }, 'Stadt im Illertal mit Ausgangspunkten ins Oberallgäu und zum Grünten.'),
    p('Alpseewinkel', 'Bayern', { seen: 2 }, 'Ruhiger Ort am Ufer eines Bergsees mit Badestelle und Rundweg.'),
    p('Markt Oberstdorf', 'Bayern', { wandern: 3 }, 'Ortskern von Oberstdorf mit Fußgängerzone und Kurpark.'),
  ],
  'schwarzwald': [
    p('Titisee-Neustadt', 'Baden-Württemberg', { seen: 3, wandern: 2, familie: 2 }, 'Stadt am Titisee mit Uferpromenade und Wegen zum Feldberg.'),
    p('Baiersbronn', 'Baden-Württemberg', { wein_kulinarik: 3, wandern: 3, natur_ruhe: 2 }, 'Gemeinde im Nordschwarzwald mit Sterneküche und Wegen zu Karseen.', 15),
    p('Hinterzarten', 'Baden-Württemberg', { wandern: 3, wintersport: 2, wellness: 2 }, 'Höhenluftkurort mit Loipen, Moorlandschaft und Ravennaschlucht.'),
    p('Triberg', 'Baden-Württemberg', { natur_ruhe: 2, wandern: 2, staedte_kultur: 1 }, 'Stadt an den Triberger Wasserfällen mit Schwarzwaldmuseum.'),
    p('Todtnau', 'Baden-Württemberg', { wintersport: 2, wandern: 2, familie: 2 }, 'Stadt im Wiesental mit Wasserfall, Sommerrodelbahn und Skilift.'),
  ],
  'rugen': [
    p('Binz', 'Mecklenburg-Vorpommern', { familie: 3, radfahren: 2, natur_ruhe: 1 }, 'Ostseebad mit Bäderarchitektur, Seebrücke und langem Sandstrand.'),
    p('Sellin', 'Mecklenburg-Vorpommern', { familie: 2, radfahren: 2, natur_ruhe: 2 }, 'Seebad mit Seebrücke, Wilhelmstraße und Zugang zur Granitz.'),
    p('Putbus', 'Mecklenburg-Vorpommern', { staedte_kultur: 2, radfahren: 2 }, 'Klassizistische Residenzstadt mit Circus, Schlosspark und Anschluss an den Rasenden Roland.'),
    p('Bergen auf Rügen', 'Mecklenburg-Vorpommern', { staedte_kultur: 1, radfahren: 1 }, 'Inselhauptort mit Marienkirche und Aussichtsturm auf dem Rugard.'),
  ],
  'sachsische schweiz': [
    p('Bad Schandau', 'Sachsen', { wandern: 3, natur_ruhe: 2, wellness: 2 }, 'Kurort an der Elbe mit Toskana-Therme und Wegen zu den Schrammsteinen.'),
    p('Königstein', 'Sachsen', { wandern: 2, staedte_kultur: 2 }, 'Kleinstadt unterhalb der Festung Königstein an der Elbe.'),
    p('Pirna', 'Sachsen', { staedte_kultur: 3, radfahren: 2 }, 'Altstadt an der Elbe mit Marktplatz und Elberadweg.'),
    p('Hohnstein', 'Sachsen', { wandern: 3, natur_ruhe: 3 }, 'Burgstadt über dem Polenztal mit Zugang zum Malerweg.'),
  ],
  'salzkammergut': [
    p('Bad Ischl', 'Oberösterreich', { staedte_kultur: 3, wellness: 2, wandern: 2 }, 'Kurstadt an der Traun mit Kaiservilla und Therme.'),
    p('St. Wolfgang im Salzkammergut', 'Oberösterreich', { seen: 3, wandern: 2, bergpanorama: 2 }, 'Ort am Wolfgangsee mit Wallfahrtskirche und Schafbergbahn.'),
    p('Gmunden', 'Oberösterreich', { seen: 3, staedte_kultur: 2 }, 'Stadt am Traunsee mit Seeschloss Ort und Keramiktradition.'),
    p('Bad Aussee', 'Steiermark', { seen: 2, wandern: 2, wellness: 2 }, 'Kurort im steirischen Salzkammergut nahe Altausseer See und Grundlsee.'),
    p('Mondsee', 'Oberösterreich', { seen: 3, radfahren: 2 }, 'Marktgemeinde am Mondsee mit Basilika und Seepromenade.'),
  ],
  'zillertal': [
    p('Mayrhofen', 'Tirol', { wintersport: 3, wandern: 3, bergpanorama: 3 }, 'Hauptort im hinteren Zillertal mit Penken- und Ahornbahn.'),
    p('Zell am Ziller', 'Tirol', { wintersport: 2, wandern: 2, familie: 2 }, 'Marktgemeinde mit Zugang zur Zillertal Arena.'),
    p('Fügen', 'Tirol', { familie: 3, wintersport: 2, wellness: 2 }, 'Ort am Taleingang mit Erlebnistherme und Spieljoch.'),
    p('Tux', 'Tirol', { wintersport: 3, bergpanorama: 3 }, 'Gemeinde im Tuxertal mit Ganzjahresskigebiet am Hintertuxer Gletscher.', 12),
  ],
  'wachau': [
    p('Krems an der Donau', 'Niederösterreich', { staedte_kultur: 3, wein_kulinarik: 3, radfahren: 2 }, 'Altstadt am Tor zur Wachau mit Kunstmeile und Weingütern.'),
    p('Dürnstein', 'Niederösterreich', { wein_kulinarik: 3, wandern: 2 }, 'Weinort mit Stiftskirche und Burgruine über der Donau.'),
    p('Spitz', 'Niederösterreich', { wein_kulinarik: 3, radfahren: 2 }, 'Marktgemeinde am Tausendeimerberg mit Schiffsstation.'),
    p('Melk', 'Niederösterreich', { staedte_kultur: 3, radfahren: 2 }, 'Stadt unter dem Stift Melk am westlichen Ende der Wachau.'),
  ],
  'berner oberland': [
    p('Interlaken', 'Bern', { bergpanorama: 3, seen: 2, staedte_kultur: 2 }, 'Ort zwischen Thuner- und Brienzersee mit Bahnen zur Jungfrauregion.'),
    p('Grindelwald', 'Bern', { bergpanorama: 3, wandern: 3, wintersport: 3 }, 'Gletscherdorf unter der Eigernordwand mit Bahn auf den First.'),
    p('Lauterbrunnen', 'Bern', { wandern: 3, bergpanorama: 3 }, 'Talort mit Staubbachfall und Zugang nach Wengen und Mürren.'),
    p('Spiez', 'Bern', { seen: 3, wein_kulinarik: 2 }, 'Ort am Thunersee mit Schloss, Rebbergen und Schiffsanlegestelle.'),
    p('Brienz', 'Bern', { seen: 3, wandern: 2, familie: 2 }, 'Holzschnitzerdorf am Brienzersee mit Rothornbahn.'),
  ],
  'engadin': [
    p('St. Moritz', 'Graubünden', { wintersport: 3, seen: 2, wellness: 2 }, 'Kurort am St. Moritzersee mit Skigebieten Corviglia und Corvatsch.'),
    p('Pontresina', 'Graubünden', { wandern: 3, bergpanorama: 3, wintersport: 2 }, 'Bergdorf am Eingang zum Val Roseg und zur Berninagruppe.'),
    p('Scuol', 'Graubünden', { wellness: 3, wandern: 2, wintersport: 2 }, 'Unterengadiner Ort mit Mineralbad und Engadiner Häusern.', 12),
    p('Zernez', 'Graubünden', { natur_ruhe: 3, wandern: 3 }, 'Dorf am Schweizerischen Nationalpark mit Besucherzentrum.', 15),
    p('Samedan', 'Graubünden', { wandern: 2, wintersport: 2 }, 'Oberengadiner Ort mit Bergbahn auf Muottas Muragl in der Nähe.'),
  ],
  'groden': [
    p('St. Ulrich in Gröden', 'Südtirol', { wintersport: 3, wandern: 3, staedte_kultur: 2 }, 'Hauptort des Tals mit Schnitzkunst und Seilbahn zur Seiser Alm.'),
    p('Wolkenstein in Gröden', 'Südtirol', { wintersport: 3, bergpanorama: 3 }, 'Talschluss unter dem Sellastock mit Anschluss an die Sellaronda.'),
    p('St. Christina in Gröden', 'Südtirol', { wandern: 3, bergpanorama: 3 }, 'Dorf unter dem Langkofel mit Zugang zum Monte Pana.'),
  ],
  'vinschgau': [
    p('Mals', 'Südtirol', { wandern: 2, radfahren: 2, natur_ruhe: 2 }, 'Markt im Obervinschgau mit Kloster Marienberg in der Nähe.', 12),
    p('Schlanders', 'Südtirol', { wandern: 2, radfahren: 2 }, 'Hauptort des Vinschgaus mit Waalwegen und Marmortradition.'),
    p('Latsch', 'Südtirol', { wandern: 2, radfahren: 2 }, 'Ort im Mittelvinschgau mit Zugang ins Martelltal.'),
    p('Naturns', 'Südtirol', { wandern: 3, radfahren: 2, wein_kulinarik: 2 }, 'Sonniger Ort am Eingang des Schnalstals mit Prokulus-Kirche.'),
  ],
  'meraner land': [
    p('Meran', 'Südtirol', { staedte_kultur: 3, wellness: 3, wein_kulinarik: 2 }, 'Kurstadt mit Therme, Laubengasse und den Gärten von Schloss Trauttmansdorff.'),
    p('Dorf Tirol', 'Südtirol', { wandern: 3, bergpanorama: 2 }, 'Dorf über Meran mit Schloss Tirol und Zugang zum Meraner Höhenweg.'),
    p('Schenna', 'Südtirol', { wandern: 3, familie: 2 }, 'Ferienort über dem Passeiertal mit Seilbahn nach Taser.'),
    p('Lana', 'Südtirol', { wein_kulinarik: 2, radfahren: 2, wandern: 2 }, 'Marktgemeinde zwischen Obstgärten und Weinbergen am Fuß des Vigiljochs.'),
  ],
};

function parseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text.replaceAll('‹', '<').replaceAll('›', '>')) as T;
  } catch {
    return fallback;
  }
}

export const fakeCatalogRegions: FakeLlmResponder = ({ user }) => {
  const country = extractTag(user, 'land');
  const wanted = parseJson<string[]>(extractTag(user, 'themen'), []);
  const list = regions[country] ?? [];
  const score = (r: FakeRegion) => r.themes.filter((t) => wanted.includes(t)).length;
  const hits = list.filter((r) => score(r) > 0);
  return {
    regions: (hits.length > 0 ? hits : list)
      .slice()
      .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
      .map((r) => ({ name: r.name, descriptionDe: r.descriptionDe, themes: r.themes.slice(0, 5) })),
  };
};

export const fakeCatalogPlaces: FakeLlmResponder = ({ user }) => {
  const region = parseJson<{ name?: string; countryCode?: string }>(extractTag(user, 'region'), {});
  const key = fold(region.name ?? '');
  const known = places[key];
  const list =
    known ??
    [1, 2, 3].map((i) =>
      p(`${region.name ?? 'Region'} Ort ${i}`, 'unbekannt', { wandern: 1 }, `Platzhalter-Ort ${i} der Region ${region.name ?? ''} (Fake-Modell).`.slice(0, 160)),
    );
  return {
    places: list.map((pl) => ({
      name: pl.name,
      subdivision: pl.subdivision,
      themes: Object.entries(pl.themes).map(([code, strength]) => ({ code, strength })),
      descriptionDe: pl.descriptionDe,
      searchRadiusKm: pl.searchRadiusKm,
    })),
  };
};
