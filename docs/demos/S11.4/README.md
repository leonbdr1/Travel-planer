# S11.4 Suchformular mit Ziel, Doku, Walkthrough – Belege

Stand: 28.09.2026, lokaler Stack, alle Anbieter simuliert.

- `demo-output.txt`: `npm run demo -- s11.4` – Ziel „Komfort“ wird gespeichert und gilt im Finale; eine Suche ohne Ziel bekommt „Preis-Leistung“; ein unbekanntes Ziel wird mit 400 abgelehnt; Sterne sind ein Filter im Ergebnis.
- `walkthrough-P/report.md`: alle Pfad-Abläufe (`npm run dogfood -- --mode P`): Suchrahmen, Suche, Ergebnisse, Finale, Warnhinweise, Buchung – 171/171 Prüfungen, 0 Konsolenfehler und 0 fehlgeschlagene Anfragen in 40 Schritten. Screenshots des Finales liegen gelesen unter `docs/demos/S11.3/walkthrough-P/`; die übrigen sind nicht eingecheckt.
- Lese-Abläufe (`--mode R`, Startseite und Pflichtseiten): 30/30.

Angepasst: Der Ablauf „Ergebnisse“ öffnet für die Detailansicht die erste Unterkunft mit Rezensionscheck, weil der Check seit M11 die Finalisten aller Ziele prüft und nicht mehr jede Unterkunft oben in der Preisliste.

## Prüfungen zum Stand

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | 15 Projekte ok |
| `npm test` | 295 Tests in 55 Dateien grün (Node, workerd, PGlite) |
| `npm run db:test` | 75 pgTAP-Zusicherungen, darunter `review_praise.sql` |
| `npm run build` | ok |
| `npm run check:claims` | ok |
| `npm run check:status` | 56 Slice-IDs mit genau einer STATUS-Zeile |
