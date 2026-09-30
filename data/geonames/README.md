# GeoNames – Ortsdatenbank

Quelle der Tabelle `app.geo_localities` (Startort-Autovervollständigung, Abgleich des Ortskatalogs). Lizenz: **CC BY 4.0**, Quellenangabe „Ortsdaten: GeoNames“ ist Pflicht (steht in `product.config.yaml` → `attribution` und in der Fußzeile jeder Seite).

## Produktivdaten (O3.1, Operator-Lane)

Die Rohdaten kommen **nicht** ins Repository.

1. Laden: `https://download.geonames.org/export/dump/<Land>.zip` für DE, AT, CH, IT und seit F15 FR, ES, PT, NL, BE, LU, DK, CZ, PL, HU, HR, SI, SK, GR, GB, IE, NO, SE, seit F20 AL, AD, BA, BG, CY, EE, FI, IS, LV, LI, LT, MT, MC, ME, MK, RO, RS (für Orte unter 1.000 Einwohner die Dateien `cities500` bzw. den Vollabzug verwenden), dazu `https://download.geonames.org/export/zip/<Land>.zip`; entpacken nach `<dir>/<Land>.txt` und `<dir>/zip/<Land>.txt`.
2. Prüfsummen und Abrufdatum hier in `SHA256SUMS` bzw. unten eintragen.
3. Import: `npm run cli -- geonames import <dir>` (nur Feature-Klasse `P` in den Produktländern, deutsche Alternativnamen, Postleitzahlen zugeordnet; idempotent). Südtirol (admin2 `BZ`) bleibt im Katalog `IT-BZ`, das übrige Italien ist `IT`.

| Datei | Abrufdatum | SHA-256 |
|---|---|---|
| (noch kein Produktivimport) | | |

## Entwicklungs-Auszug (`dev-extract/`)

In der Bau-Sitzung war `download.geonames.org` über den Netzwerk-Proxy gesperrt. Für die lokale Entwicklung liegt deshalb ein **Auszug der GeoNames-Datei `cities1000`** (Orte ab 1.000 Einwohnern) im Repository:

- `dev-extract/DACH-cities1000.tsv`: 11.056 Siedlungen in DE, AT, CH und Südtirol im Original-Dump-Format (19 Spalten). Herkunft: npm-Paket `all-the-cities@3.1.0` (abgeleitet aus GeoNames `cities1000`, CC BY 4.0), erzeugt mit `dev-extract/build.mjs`. Geonameids und Koordinaten stammen aus GeoNames, nicht aus einer KI.
- `dev-extract/DACH-cities500-extra.tsv` (seit 29.09.2026, Aufgabe 3): 5.926 weitere Orte in DE, AT und CH **ab 500 Einwohnern** aus GeoNames `cities500` (CC BY 4.0, echte Geonameids; Quelle: PyPI-Paket `geonamescache@3.0.2`, Datenstand 2020), ohne Alternativnamen.
- `dev-extract/zip/{DE,AT,CH}.txt` (seit 29.09.2026, Aufgabe 3): **Postleitzahlen** im GeoNames-Postleitzahlenformat, damit die Suche nach Postleitzahl lokal funktioniert. DE: Postleitzahl → Ortsnamen aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL; npm-Paket `postleitzahlen@1.0.0`), 7.684 von 8.168 Postleitzahlen einem Ort zugeordnet; AT: npm `plz-ort@1.2018.2` (MIT); CH: npm `switzerland-postal-codes@5.0.1` (MIT, mit Koordinaten). DE und AT haben keine Koordinaten: Der Name wird dem Auszug zugeordnet, gleichnamige Orte werden über die Orte der benachbarten Postleitzahlen (gleiche Anfangsziffern) unterschieden. Nicht zugeordnet sind vor allem Sammelgemeinden aus kleinen Dörfern (z. B. „Nuthe-Urstromtal“). Erzeugt mit `dev-extract/build-extra.ts` (Anleitung im Dateikopf).
- `dev-extract/EU-cities1000.tsv` (seit F20, vorher `EU-cities3000.tsv` aus F15): 39.407 Orte in Italien (ohne Südtirol, das steht im DACH-Auszug), Frankreich, Spanien, Portugal, den Benelux-Ländern, Dänemark, Tschechien, Polen, Ungarn, Kroatien, Slowenien, der Slowakei, Griechenland, Großbritannien, Irland, Norwegen, Schweden und (neu) Albanien, Andorra, Bosnien und Herzegowina, Bulgarien, Estland, Finnland, Island, Lettland, Liechtenstein, Litauen, Malta, Monaco, Montenegro, Nordmazedonien, Rumänien, Serbien und Zypern **ab 1.000 Einwohnern** (also die ganze Quelle `cities1000`), dazu 18 kleinere Katalogorte (`dev-extract/eu-keep-ids.json`, z. B. Vernazza). Quelle wie beim DACH-Auszug (`all-the-cities@3.1.0`, GeoNames CC BY 4.0), erzeugt mit `dev-extract/build-europe.mjs` (`MIN_POPULATION` einstellbar). Deutsche Namen (Venedig, Rom, Bukarest, Belgrad, Lissabon, Krakau …) stehen in `dev-extract/alt-names-eu.json`; ohne Postleitzahlen.
- **Einschränkungen:** keine Orte unter 500 Einwohnern (Europa: unter 3.000), Postleitzahlen nur so weit zuordenbar wie oben beschrieben, Datenstand der Pakete. Der Produktivimport (O3.1) ersetzt alles.
- Bestehende lokale Datenbanken werden beim nächsten `npm run dev` automatisch nachimportiert, wenn der Auszug mehr Orte oder Postleitzahlen enthält (`packages/cli/src/seed.ts`).
- **Südtirol:** GeoNames führt die Orte mit italienischem Hauptnamen. Die deutschen Namen (amtliche zweisprachige Gemeindenamen) sind in `dev-extract/alt-names-bz.json` ergänzt; beim Produktivimport kommen sie aus den GeoNames-Alternativnamen.
- Prüfsummen: `SHA256SUMS` (`sha256sum -c data/geonames/SHA256SUMS` im Ordner `data/geonames`).

Lokale Datenbank befüllen: geschieht automatisch beim ersten `npm run dev`; manuell mit `npm run cli -- geonames import data/geonames/dev-extract`.
