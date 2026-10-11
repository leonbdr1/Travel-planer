# Ziel-Qualität nach Entfernung, Auto oder Flugzeug (Aufgabe F19)

Stand 30.09.2026. Ergänzt `architektur.md` 6.2 (Vorschläge); Übernommen in `architektur.md` 6.16 (Freigabe 30.09.2026).

## Wunsch (Ben)

Wer wandern will und 2 bis 4 Stunden fährt, ist nicht wählerisch: mehr Vorschläge, oben die Highlights, dazu ruhigere Gebiete. Wer einen Strandurlaub sucht, will die Hotspots (Barcelona, Cinque Terre, Sardinien), wie bei Booking.com, keine Nachbarorte. Je weiter weg, desto besser müssen die Orte sein, sonst sind es bei großem Radius zu viele. Bei einem Flugurlaub in Europa sollen die Hotspots kommen. Dazu ein Schalter Auto/Flugzeug, im Flugmodus Kontinente zum Ankreuzen, Flugzeit nur optional. Nicht auf Krampf nur das Highlight: auch etwas unbekanntere Orte dürfen dabei sein. Norwegen soll irgendwie hineinpassen.

## Regel

**1. Benötigte Attraktivität wächst mit der Entfernung.** Grundlage ist die Orts-Attraktivität (0–10, `orts-attraktivitaet.md`). Für jeden passenden Ort gilt eine Mindestpunktzahl:

| „gefühlte“ Fahrzeit | Mindestpunkte |
|---|---|
| bis 4 h | keine (alles ist willkommen) |
| über 4 h bis 7 h | 4 (ruhig) |
| über 7 h bis 12 h | 6 (beliebt) |
| über 12 h | 8 (Top-Urlaubsort) |

**2. Strand, Kultur und Shopping sind wählerischer.** Passt der Ort nur über diese Themen (`strand`, `staedte_kultur`, `shopping`), zählt die Fahrzeit doppelt: Ein Strandziel in 3 Stunden Entfernung wird schon wie 6 Stunden behandelt. Passt der Ort auch über ein ruhiges Thema (Wandern, Seen, Natur), gilt das ruhige Thema. Daher fehlt Norwegen beim Strand und kommt bei Bergpanorama und Natur.

**3. Ein Flug führt nur zu Top-Zielen** (mindestens 8 Punkte), unabhängig vom Thema.

**4. Nicht nur der Hotspot.** Eine Region erscheint, wenn mindestens ein passender Ort die Mindestpunktzahl erreicht. In dieser Region bleiben auch Orte bis 1,5 Punkte darunter (`QUALITY_PLACE_SLACK`): Barcelona mit Sitges und Tossa de Mar.

**5. Sortierung und Länge.**
- Nah dran (kein Filter wirksam): nach Themenpassung, bis zu 8 Regionen.
- Mit Filter: nach Qualität (bester Ort plus 0,3 je weiterem passenden Ort, höchstens 3), in ganzen Punktstufen; innerhalb einer Stufe beim Auto der nähere Ort zuerst, beim Flug der besser passende. Höchstens 6 Regionen.

## Flugmodus

- Umschalter „Auto / Flugzeug“ über der Fahrzeit. Im Flugmodus entfällt die Fahrzeit; es gibt Kontinente zum Ankreuzen (Europa, Afrika, Asien, Nordamerika, Südamerika, Ozeanien; ohne Häkchen alle) und eine **optionale** Flugzeit („bis 2, 3, 4, 5, 6, 8, 12 Stunden“, Standard „egal“).
- Flugzeit = 45 min + Luftlinie / 750 km/h, auf 5 Minuten gerundet, ohne Weg zum Flughafen. Nur Anzeige und Filter; es werden keine Flüge verkauft.
- Keine Inlandsflüge (Ziele im Land des Startorts fallen weg) und nichts unter 500 km Luftlinie.
- Die Kontinent-Zuordnung folgt dem Land des Katalogorts (Kanaren und Madeira zählen zu Spanien/Portugal, also Europa).
- Der Katalog kennt bisher nur Europa. Für die übrigen Kontinente zeigt die Seite eine leere Liste mit dem Hinweis; Ziele dort brauchen neue Länder, Ortsdaten und einen Katalog-Entwurf (BEN-GATE: Migration und Datenimport).

## Norwegen

Fjordnorwegen (Bergen, Stavanger, Ålesund, Voss) trägt Bergpanorama, Wandern und Natur und Ruhe. Es erscheint im Flugmodus bei diesen Themen (Bergen als Top-Ziel), nicht beim Strand.

## Konstanten und Code

`QUALITY_*`, `SUGGEST_MAX_REGIONS_NEAR/FAR`, `REGION_QUALITY_SUPPORT_BONUS`, `FLIGHT_*` in `packages/domain/src/constants.ts`; Regel in `packages/domain/src/destination-quality.ts`, Kontinente und Flugzeit in `destinations.ts`, Sortierung in `suggestions.ts`; Ablauf in `packages/worker/src/services/suggestions.ts`. Die Werte sind Startwerte und mit echten Daten zu kalibrieren.

## Reiseland (F20)

Nennt der Nutzer ein Reiseland, entfällt diese Mindestpunkte-Regel; es zählt nur das Land (siehe `reiseland.md`).
