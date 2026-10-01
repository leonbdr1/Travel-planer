# Fahrzeiten in groben Blöcken (Aufgabe F16, Europa-Erweiterung)

Stand 29.09.2026. Ergänzt `architektur.md` 6.2 (Vorschläge, Fahrzeiten); Übernommen in `architektur.md` 6.16 (Freigabe 30.09.2026).

## Wunsch (Ben)

Die Autoanreise muss bei fernen Zielen nicht genau sein. Je näher, desto genauer: alles unter 7 Stunden genau (Venedig 6–7 h), ab 10 bis 30 Stunden als Block (Spanien „über 10 h“, Portugal „über 20 h“), über 30 Stunden direkt als Flugziel markieren – nur als Anzeige, Flüge werden nicht gebucht.

## Regel

| Fahrzeit | Anzeige | Quelle |
|---|---|---|
| unter 7 h | genau, z. B. „4 h 35 min“ | Routendienst (openrouteservice), Cache |
| 7 bis unter 10 h | volle Stunden, z. B. „ca. 8 h“ | Routendienst, falls die Autobahn-Schätzung ≤ 9 h ist, sonst Schätzung |
| 10 bis unter 20 h | „über 10 h“ | Autobahn-Schätzung |
| 20 bis unter 30 h | „über 20 h“ | Autobahn-Schätzung |
| ab 30 h | „über 30 h“ mit Flugzeug „Flug empfohlen“ | Autobahn-Schätzung |

- **Autobahn-Schätzung** (`estimateLongDrive`): Luftlinie × 1,2 bei 95 km/h inklusive Pausen. Ab München ergibt das Barcelona „über 10 h“, Lissabon „über 20 h“, Teneriffa „über 30 h“.
- **Kein Routing für ferne Ziele:** Liegt die Schätzung über 9 h (`DRIVE_ROUTE_MAX_MIN`), fragen wir den Routendienst nicht. Für einen Block reicht die Schätzung, und das Tageskontingent bleibt für die nahen Ziele. Diese Werte gelten nicht als „geschätzt (Routendienst nicht verfügbar)“.
- Statt einer festen Einteilung der Länder rechnen wir den Block je Startort aus der Entfernung. Das ist genauso grob, passt aber für Hamburg und München gleichermaßen.
- **Fahrzeit-Auswahl:** bis 7 h in feinen Schritten, dann „bis 10 / 20 / 30 Stunden“ und „egal (ganz Europa)“.
- **Regionen:** Spanne mit Blöcken, z. B. „ca. 8 h bis über 10 h Fahrt“; liegt die ganze Region über 30 h, trägt die Karte das Flugzeug.
- Konstanten in `packages/domain/src/constants.ts` (`DRIVE_*`, `LONG_DRIVE_*`, `MAX_DRIVE_MINUTES`), Code in `packages/domain/src/drive-bands.ts`.

## Grenzen

- Inseln mit Fähre (Mallorca, Sardinien, Korfu, Kreta) zeigen die Autobahn-Schätzung ohne Fährzeit; die Kanaren und Madeira liegen ohnehin über 30 h.
- Die Schätzung kennt keine Alpenpässe und keine Staus; für Blöcke ab 10 h ist das bewusst in Kauf genommen.
