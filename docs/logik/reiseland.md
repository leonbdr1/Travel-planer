# Reiseland und ganz Europa (Aufgabe F20)

Stand 30.09.2026. Ergänzt `ziel-qualitaet.md` (F19). Nicht in `architektur.md` übernommen (Änderungen dort sind ein BEN-GATE).

## Wunsch (Ben)

Das Produkt soll nicht nach „Wandern in DACH“ aussehen, sondern in ganz Europa universell funktionieren: „Ich will nach Spanien an den Strand“ soll die schönsten Orte liefern. Spanien war nur ein Beispiel. Außerdem soll **jeder** Ort auffindbar und suchbar sein, auch ein unbekanntes Dorf (die Tante wohnt dort), ohne dass unser Katalog ihn kennt. Unser Katalog bewertet nur Hotspots und Highlights; das reine Finden von Unterkünften läuft über die Anbieter-Daten.

## Regeln

1. **Reiseland (optional, mehrere möglich).** In „Wohin soll es gehen?“ gibt es ein aufklappbares Feld „Reiseland“ mit den Ländern, in denen der Katalog Ziele kennt (aus der Datenbank, `meta/config.countries`). Ohne Häkchen gilt wie bisher „überall“. Italien schließt Südtirol ein.
2. **Nur dieses Land.** Regionsvorschläge und Ortsvorschläge kommen ausschließlich aus den gewählten Ländern, bei Auto und Flug.
3. **Kein Mindestwert, wenn ein Land gewählt ist.** Die Entfernungsregel aus F19 („je weiter, desto bekannter“) entfällt: Wer Spanien sagt, hat die Auswahl schon eingegrenzt. Sortiert wird nach Qualität (Top-Ziele zuerst, innerhalb einer Stufe beim Auto der nähere Ort), bis zu 8 Regionen. Nicht geändert: keine Inlandsflüge, nichts unter 500 km beim Flug, Fahr- bzw. Flugzeit-Grenze.
4. **Jeder Ort ist suchbar.** „Orte selbst wählen“ findet jeden Ort der Ortsdatenbank (GeoNames), auch ohne Katalogeintrag. Solche Orte sind „eigene Orte“ (`kind = user`): Fahrzeit wird angezeigt, nie gefiltert; Attraktivität wird aus der Einwohnerzahl und bekannten Urlaubsorten in der Nähe geschätzt. Die Unterkünfte kommen per Umkreis (Koordinaten + Radius) vom Anbieter.

## Länder

Die Ortsdatenbank kennt jetzt alle europäischen Länder mit Urlaubsverkehr (`GEO_COUNTRIES`, 40 Länder): zu den bisherigen kamen Albanien, Andorra, Bosnien und Herzegowina, Bulgarien, Estland, Finnland, Island, Lettland, Liechtenstein, Litauen, Malta, Monaco, Montenegro, Nordmazedonien, Rumänien, Serbien und Zypern. Der Entwicklungsauszug enthält Orte **ab 1.000 Einwohnern** (vorher 3.000): 40.499 Orte in Europa außerhalb DACH.

Die **Türkei zählt als Europa** (Ben, 30.09.2026): Land 40 in der Liste, Kontinent Europa, Migration `20261020a_turkey` (nur lokal); ein Katalog für türkische Regionen ist bewusst nicht angelegt, Orte sind manuell auffindbar (Ben: Vorschläge nur, wo der Katalog dicht ist).

Nicht enthalten: Ukraine, Belarus, Russland, Moldau, Kosovo, San Marino, Vatikan.

## Katalog (Entwurf)

16 neue Regionen mit 57 Orten (alle KI-Entwurf, `verified: false`, BG-11): Malta und Gozo, Zypern Südküste, Bulgarische Schwarzmeerküste, Montenegro Küste, Albanische Riviera, Hohe Tatra, Siebenbürgen, Island, Finnisch-Lappland, Helsinki und Südfinnland, Estland, Lettland, Litauen; in Spanien Ibiza und Menorca, Costa Dorada und Nordspanien. Spanien hat damit 9 Regionen.

## Code

`packages/domain/src/countries.ts` (`countrySelected`, `destinationCountryOptions`, Länderlisten), `packages/worker/src/services/suggestions.ts` (Filter, Gate entfällt), `packages/worker/src/routes/meta.ts` (Länderliste), `packages/db/src/repos/catalog.ts` (`listCatalogCountries`), Oberfläche `packages/web/src/features/search/SearchBar.tsx` (`CountryFields`). Migration `supabase/migrations/20261019a_more_countries.sql` (nur lokal, nicht auf Staging/Produktion angewendet: BEN-GATE).

## Komfort-Wünsche und Strand (F21, Ben 30.09.2026)

- **Chips Pool, Klimaanlage, Meerblick** stehen unten im Suchrahmen bei den übrigen Wünschen und **filtern hart** wie Parkplatz oder Sauna. Ohne Häkchen zeigt jede Unterkunft, die es hat, ein positives Label (Preisleiter, Detail), kein K.-o.-Kriterium. Die Rangfolge und die Ziele „Preis-Leistung“ und „Komfort“ sind nicht angefasst (`PREMIUM_FEATURES` unverändert).
- **Ausstattungsnummern** (Pool 18 und 24, Klima 25, Meerblick 26) stammen aus der simulierten Welt (⟂ gegen die echte Liste prüfen, Drift 8). Ob die LiteAPI Meerblick als Ausstattung führt, ist offen.
- **KI-Wunschübersetzung** `reiseplaner.wish-parse` 1.3.0 (Chips `pool`, `klimaanlage`, `meerblick`; Pool gehört nicht mehr zu `sauna_wellness`); Fake-Evals 43/43, echter Lauf braucht BG-07.
- **Strandentfernung:** Gehminuten zum nächsten Strand (OSM `natural=beach`, gemessen bis zum Rand der Fläche, nicht zur Mitte; höchstens 20 min) als Lage-Fakt in der Preisleiter und im Detail, „Strand 10 min“. Der Zwischenspeicher alter Lage-Fakten bleibt gültig.
- Anreisekosten (L3) gestrichen.
