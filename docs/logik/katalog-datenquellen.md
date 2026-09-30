# Woher kommen die Orte und ihre Bewertung? (Stand 30.09.2026)

## Heute

| Was | Quelle | Aufwand pro Ort |
|---|---|---|
| Name, Koordinaten, Einwohner, deutsche Namen | GeoNames (offene Datenbank, importiert; im Entwicklungsauszug ca. 30.000 Orte in 22 Ländern) | keiner |
| Welche Orte gehören zu welcher Region, Themenstärken, Beschreibung | KI-Entwurf (Skills `catalog-regions`, `catalog-places`), 109 Regionen, 520 Orte | eine Zeile in einer YAML-Datei |
| Bekanntheit und Attraktionen (0–3) | von Hand geschätzt (`data/catalog/attraktivitaet.yaml`) | zwei Zahlen |
| Wander-/Strand-/Shopping-Stärke, Vielfalt, Infrastruktur | aus den Themenstärken und der Einwohnerzahl berechnet | keiner |

Das ist ein **kuratierter Katalog**: Jeder Ort wurde einzeln angelegt. Für 520 Orte geht das, für mehrere tausend nicht.

## Ehrliche Grenze

Von den 520 Orten sind 157 „Top-Urlaubsort“, und 84 von 109 Regionen haben mindestens einen. Die von Hand geschätzten Bekanntheitswerte sind zu großzügig (151 Orte mit der Höchstwertung 3). Darum trennt die Stufe „Top“ noch nicht scharf genug zwischen Hotspot und gutem Ort.

## Vorschlag: Bewertung aus offenen Daten statt von Hand

| Kriterium | Datenquelle | Status |
|---|---|---|
| Bekanntheit | Anzahl der Sprachversionen des Wikipedia-Artikels (Wikidata „sitelinks“), Aufrufe pro Monat (Wikimedia-API); Anzahl Unterkünfte und Bewertungen im Ort aus LiteAPI | Wikidata/Wikimedia: **neue Quelle, braucht Freigabe**; LiteAPI vorhanden |
| Attraktionen | OpenStreetMap: Bergbahnen (`aerialway`), Sehenswürdigkeiten (`tourism=attraction`, Museen, Denkmäler) im Umkreis | Overpass ist freigegeben (BG-20) |
| Strand | OSM `natural=beach` im Umkreis | Overpass |
| Wandern / Rad | OSM-Routen (`route=hiking`, `route=bicycle`) je km² | Overpass |
| Wintersport | OSM `piste:type` und Lifte | Overpass |
| Wellness, Wein, Kultur, Shopping | OSM `leisure=spa`, `landuse=vineyard`, `historic`, `shop` (Zahl) | Overpass |
| Einwohner | GeoNames | vorhanden |

Ablauf: Kandidaten sind alle GeoNames-Orte ab einer Mindestgröße oder mit vielen Touristen-Objekten. Die Werte werden **einmal gerechnet und gespeichert** (kein Live-Abruf pro Suche). Die KI schreibt weiterhin nur die deutsche Kurzbeschreibung und gruppiert Orte zu Regionen; die Zahlen kommen aus den Daten. Ein Mensch prüft Ausreißer und die Top-Liste, nicht jeden Ort.

## Was dafür nötig ist

1. Freigabe für Wikidata/Wikimedia als Quelle (Regel: keine Anbieter außerhalb von `architektur.md` ohne Freigabe).
2. Zugang zu Overpass und Wikidata aus einer Umgebung mit Internet (diese Sitzung erreicht beide nicht; Test am 30.09.2026: keine Verbindung).
3. Ein Berechnungslauf `catalog score` (neu), der die Werte in eine Datei schreibt, und die Kalibrierung der Schwellen an einer Rangliste: „Top“ = die obersten ca. 10–15 % der Orte, nicht ein fester Punktewert.
