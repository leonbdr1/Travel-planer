# Abschluss der autonomen Sitzung – Belege

Stand: 28.09.2026, Commit a009652 (danach nur die Screenshot-Korrektur im Walkthrough-Harness und Dokumente).

## Gesamt-Walkthrough im lokalen Stack (`npm run dev`, alle Anbieter simuliert)

| Lauf | Flows | Ergebnis | Konsolenfehler | fehlgeschlagene Anfragen |
|---|---|---|---|---|
| `walkthrough-P/report.md` | suchrahmen, suche, ergebnisse, warnungen, buchung | 134/134 Prüfungen | 0 in 32 Schritten | 0 |
| `walkthrough-R/report.md` | start, pflichtseiten | 30/30 Prüfungen | 0 in 6 Schritten | 0 |

Gelesen: Startseite, Preis-Matrix nach 60 von 60 Kombinationen, Detailansicht „Hotel Schwanen“ mit Warnhinweis Schimmel (3 von 3 in den letzten 6 Monaten, KI-Kennzeichnung, Abzug 1,0 im Qualitätswert) und Buchungsbestätigung mit Buchungsnummer, Bestätigungsnummer der Unterkunft und maskierter E-Mail-Adresse (Screenshots im Ordner).

Derselbe Gesamtlauf gegen den Produktions-Build mit strikter CSP: `docs/demos/S9.3/`.

## Prüfungen

`pruefungen.txt`: Typecheck (15 Projekte), 250 Tests in 47 Dateien (Node, workerd, PGlite), 71 pgTAP-Zusicherungen, Build, Claims-Prüfung, STATUS-Zeilen, Lieferkette; der Baum bleibt nach `npm run gen` unverändert.
