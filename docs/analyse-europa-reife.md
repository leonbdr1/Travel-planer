# Reifebericht: ist das Produkt universell für Europa? (30.09.2026, F20)

Anlass: Das Produkt wurde zuerst für Wandern in Österreich und Deutschland gebaut. Es soll in ganz Europa wie ein normales Reiseportal funktionieren („Spanien, Strand“; „das Dorf, in dem meine Tante wohnt“). Geprüft wurde am laufenden Stack (`npm run demo -- f19|f20`, Walkthroughs), nicht nur im Code.

## Funktionale Reife

| Bereich | Stand | Bemerkung |
|---|---|---|
| Suchrahmen (Zeitfenster, Nächte, Wochentage, Personen, Zimmer, Budget, Ziel, Wünsche) | reif | Themenunabhängig, gilt für jedes Land. |
| Themen | reif | 12 Themen, darunter Strand, Kultur, Shopping (F14), nicht nur Wandern. |
| Regions- und Ortsvorschläge | reif, **Lücke behoben** | Vorher gab es keine Möglichkeit, ein Reiseland zu nennen: „Flug, Strand“ lieferte 6 Regionen aus ganz Europa, davon 2 in Spanien. Jetzt Feld „Reiseland“ (F20). |
| Jeder Ort suchbar | **Lücke teilweise behoben** | Vorher fehlten 17 Länder ganz (Bulgarien, Malta, Zypern, Finnland, Island, Baltikum, Balkan …) und in Europa alle Orte unter 3.000 Einwohnern. Jetzt 39 Länder, Orte ab 1.000 Einwohnern. Rest siehe „Offen“. |
| Unterkunftssuche und Preise | reif (simuliert) | Suche per Koordinaten und Umkreis, unabhängig vom Katalog; mit dem Simulator getestet, echte LiteAPI-Antworten nur für die Sandbox-Prebook-Stufe belegt. |
| Bewertung, Schnäppchen, Rezensionscheck | reif | Rezensionen in 15 Sprachen (F18), Stichwörter und KI. |
| Preisvergleich, Finale, Lob-Labels | reif für „Günstig und sauber“ | „Preis-Leistung“ und „Komfort“ bleiben unfertig (Bens Vorgabe). |
| Buchung | wired | Nur Sandbox-Prebook belegt; Zahlung, Buchung, Storno im Browser stehen aus (Ben). |
| Flug | nur Anzeige | Flugzeit als Schätzung, keine Flugpreise, keine Flughäfen. |
| Sprache, Währung | Deutsch, Euro | Fest; für andere Märkte nicht vorbereitet (nicht gefordert). |

## Was ein Buchungsportal hat und uns fehlt

- **Karte mit den Unterkünften** in den Ergebnissen (es gibt die Regionskarte und im Detail einen Link zu einer externen Karte, aber keine eigene Unterkunftskarte).
- **Strandentfernung** als Lage-Fakt (die Lage-Fakten kennen nur Bahnhof, Bus, Lift, Supermarkt, Restaurants; für Strandurlaub ist die Entfernung zum Strand der wichtigste Wert).
- **Wünsche** „Pool“, „Klimaanlage“, „Meerblick“ (Filter und Chips; die Anbieter-Ausstattungsnummern sind noch nicht gegen die echte Liste geprüft, siehe Drift 8 in `HANDOFF.md`).
- **Jahreszeit** (L2 in `analyse-suche-buchung.md`): Strand im Januar an der Ostsee wird wie im Juli vorgeschlagen.
- **Anreisekosten** (L3): Flug- und Fährkosten fehlen im Vergleich.
- **Inseln und Fähren beim Auto** (L4).
- **Sortierung** gibt es nach „Beste“, Preis und Qualität; nach Entfernung zum Zentrum oder Strand nicht.

## Code-Reife

- **Struktur:** TypeScript strikt, Workspaces (domain rein, contracts, providers mit Fakes, db, worker, web, cli). Externe Dienste nur über Ports; alles ist mit Fakes lokal lauffähig. Länderlisten stehen an vier Stellen (Domain, Konfigurationsschema, CLI-Schema, SQL), mit Drift-Tests abgesichert; ein neues Land braucht vier Änderungen (F20 hat sie mit der Migration `20261019a` gemacht). Empfehlung: Schema aus der Domain-Liste ableiten.
- **Tests:** 77 Testdateien, rund 500 Tests (alle hermetisch); Walkthroughs für alle Nutzerflächen; pgTAP für die Datenbank.
- **Nicht getestet gegen die Wirklichkeit:** echte LiteAPI-Antworten (Contract), echte KI-Evals (BG-07), echtes Routing (ORS), Katalog ist KI-Entwurf ohne redaktionelle Freigabe (BG-11), nichts ist deployt.
- **Schwächen:** (a) Der Katalog ist Handarbeit und ungleich dicht: DACH 33 + 11 + 6 Regionen, Spanien jetzt 9, übrige Länder 1 bis 4. (b) Die simulierte Welt ist alpin gefärbt (Namen, Ausstattung wie Skiraum und Wandern), deshalb sagen Demos wenig über Strandhotels. (c) Ortssuche hängt an einer Datenbank, die lokal nur ein Auszug ist.

## Offen (groß, bewusst nicht angefasst)

1. **Orte unter 1.000 Einwohnern.** Die Tante im Weiler: braucht entweder den Vollimport von GeoNames (`cities500` oder alle besiedelten Orte; Download und Import sind Operator-Schritte, O3.1, BEN-GATE) **oder** eine Ortssuche über die Anbieter-Daten. Die LiteAPI hat nach meiner Kenntnis eine Orte-Suche (Text → Ort mit Koordinaten) und bietet Hotels auch nach Ort an; **der Vertrag ließ sich hier nicht prüfen** (Doku-Host im Netz gesperrt), deshalb nicht gebaut (`CLAUDE.md`: nie einen Contract aus dem Gedächtnis nachbauen). Vorschlag: Doku prüfen, dann die Ortssuche als zweite Quelle hinter GeoNames setzen; jeder Treffer wird ein eigener Ort. Entscheidung Ben.
2. **Jahreszeit je Ort/Region** (Migration, BEN-GATE).
3. **Strandentfernung und Lage-Fakten für Küste** (OSM `natural=beach`, Änderung an Port, Fakes, Finale).
4. **Katalog verdichten und freigeben:** Türkei (Kontinentfrage), Baltikum als Reiseziel über mehrere Länder, Katalog für Italien Süd, Frankreich Atlantik, Kroatien Inseln usw.; redaktionelle Prüfung BG-11.
5. **Fähren/Inseln, Flugkosten, Flughäfen** (L3, L4, L7).
6. Migration `20261019a_more_countries` (und die davor) auf Staging/Produktion anwenden (BEN-GATE).
