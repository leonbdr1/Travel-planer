# S6.4 Kalibrierung Stufe 1

Befehl: `npm run demo -- s6.4` (startet den lokalen Stack, führt eine Suche Stuttgart → 8 Orte × 9 Freitage aus und
schreibt `kalibrierung.md`). Für eine vorhandene Suche: `npm run cli -- calibrate --latest --out <datei>`.

⟂ drift (2026-09-27): Der Plan sieht `calibrate --from docs/demos/S2.5/` mit Sandbox-Daten vor. Die Sandbox-Aufnahmen
aus S2.5 fehlen (BG-05, kein LiteAPI-Schlüssel). Das Werkzeug misst deshalb eine abgeschlossene Suche aus der
Datenbank (`--search <id>` oder `--latest`). Sobald Sandbox-Daten vorliegen, läuft dieselbe Auswertung gegen eine
Suche im Sandbox-Modus; die Zahlen unten beschreiben nur die simulierte Welt.

## Verlauf

| Messung | value | date | place | mindestens eins |
|---|---|---|---|---|
| 1. Fake-Welt mit unabhängigem Preis und Bewertung | 21.2 % | 5.4 % | 13.6 % | 28.0 % |
| 2. Fake-Welt mit Preis-Qualitäts-Kopplung | 18.3 % | 5.4 % | 12.6 % | 24.9 % |

Befund nach Messung 1: Die value-Quote lag knapp über dem Korridor, weil in der simulierten Welt Preis und Bewertung
unabhängig waren. Dadurch wirkte jede gut bewertete günstige Unterkunft wie ein Schnäppchen. Korrigiert wurde die
Simulation, nicht die Konstanten: `qualityPriceFactor` in `packages/providers/src/fake/world.ts` hebt den Grundpreis
gut bewerteter Häuser leicht an (Faktor 0,8 bei 6,3 bis 1,12 bei 9,5 und mehr). Die Konstanten aus `architektur.md`
6.14 bleiben unverändert.

Ergebnis: Alle drei Typen liegen im Zielkorridor von 5 bis 20 % der Angebote in F. Der Anteil der Angebote mit
mindestens einem Schnäppchen-Merkmal (24,9 %) ist höher als jede Einzelquote; der Plan setzt den Korridor je Typ.
Echte Daten können anders verteilt sein, deshalb bleibt die Kalibrierung mit Sandbox-Daten offen (HANDOFF).
