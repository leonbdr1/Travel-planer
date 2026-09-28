# STATUS – Baustand je Slice

Einzige Wahrheit über den Baustand (`CLAUDE.md`, `docs/umsetzungsplan.md`). Reifegrade:
`spec'd` (nur beschrieben) · `built` (Code da, nicht verdrahtet) · `wired` · `demonstrated` (über den realen Einstiegspunkt vorgeführt) · `live-verified` (im laufenden Stack gesehen, Report gelesen) · `blocked` (wartet auf ⛔ BEN-GATE oder externe Ressource).

Alle Anbieter laufen bis auf Weiteres im Modus `fake` (keine Konten, keine Schlüssel). Stand: 28.09.2026.

## M1 Grundgerüst

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| O1.1 | Repository und Branch-Schutz | `blocked` | – | Code liegt vorläufig in `leonbdr1/Travel-planer`; Org-Repo und Branch-Schutz sind Operator-Schritte (BG-16). |
| O1.2 | CI-Grundgate | `built` | `.github/workflows/ci.yml` | Lokal grün: `npm ci --ignore-scripts`, `supply-chain-check --rebuild`, Typecheck, Tests, Build. Erster CI-Lauf auf einem PR steht aus. |
| O1.3 | Toolchain-Image (Fleet) | `built` | `toolchain/Dockerfile` | Kein Docker-Daemon in der Sitzung; Bau und `--network none`-Lauf durch den Operator. |
| S1.1 | Produktkonfiguration | `demonstrated` | `docs/demos/S1.1/` | |
| S1.2 | DB-Harness und RLS-Grundlinie | `demonstrated` | `docs/demos/S1.2/` | pgTAP beweist „anon = 0“. |
| S1.3 | Health-Endpunkt | `demonstrated` | `docs/demos/S1.3/` | 200 mit Datenbank, 503 ohne. |
| S1.4 | Startseite (Skelett) | `live-verified` | `docs/demos/S1.4/` | Report und Screenshot gelesen. |
| S1.5 | Protokoll-Artefakte | `demonstrated` | `docs/demos/S1.5/` | |

## M2 Anbieter-Adapter und Validierung

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| O2.1 | Sandbox-Zugänge | `blocked` | – | BG-05, BG-06 |
| O2.2 | Anbieter-Fixtures | `blocked` | – | Aufzeichnung braucht Sandbox-Schlüssel. |
| S2.1 | Provider-Ports und Fakes | `demonstrated` | `docs/demos/S2.1/` | Fakes auf HTTP-Ebene mit synthetischer Welt; Fehlerinjektion 429/5xx/Timeout. |
| S2.2 | LiteAPI-Client | `demonstrated` | `docs/demos/S2.2/` | Nur Fake-Modus; Contract gegen die Live-Doku ungeprüft (BG-05). |
| S2.3 | ORS-Client und Cache | `demonstrated` | `docs/demos/S2.3/` | Zweiter Aufruf: 0 neue ORS-Anfragen. |
| S2.4 | Sandbox-Buchung (Testseite) | `blocked` | – | Braucht Sandbox-Konto und Zahlungs-SDK (BG-05). |
| S2.5 | Validierungsbericht | `blocked` | – | Messwerte nur mit Sandbox (BG-05, BG-06); BG-10 offen. |

## M3 Ortsdaten und Katalog

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| O3.1 | GeoNames-Rohdaten | `blocked` | `data/geonames/dev-extract/` | Download nicht erreichbar; Entwicklungsauszug mit Prüfsumme statt Rohdaten. |
| S3.1 | Ortsdatenbank | `demonstrated` | `docs/demos/S3.1/` | „Oberstd“ → Oberstdorf, Bayern, DE. |
| O3.2 | Skill-Eval-Gate | `built` | `.github/workflows/skill-eval.yml` | Erster PR-Lauf steht aus; echter Lauf braucht BG-07. |
| S3.2 | Skill-Infrastruktur | `demonstrated` | `docs/demos/S3.2/` | 4 Bundles, 8 Validatoren; Eval im Fake-Modus 0 $. |
| S3.3 | Katalog-Skills | `demonstrated` | `docs/demos/S3.3/` | Deterministische Assertions grün; Judge-Rubriken brauchen BG-07. |
| S3.4 | Katalog-Pipeline | `demonstrated` | `docs/demos/S3.4/` | Fake-Lauf DE; echter Batch-Lauf durch den Operator (BG-07). |
| S3.5 | Katalog-Import | `demonstrated` | `docs/demos/S3.5/` | 49 Regionen, 307 Orte als Entwurf; Freigabe BG-11. |

## M4 Suchrahmen, Vorschläge und Wünsche

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S4.1 | Fachlogik Suchrahmen | `demonstrated` | `docs/demos/S4.1/` | 9 Termine im Planbeispiel, 13 → `too_many_dates`. |
| S4.2 | API Vorschläge | `demonstrated` | `docs/demos/S4.2/` | „Stutt“ → Stuttgart, 5 Regionen mit Begründung, 121. Abfrage → 429. |
| S4.3 | Wunsch-Übersetzung | `demonstrated` | `docs/demos/S4.3/` | Fake-Modell; echter Eval-Lauf braucht BG-07. |
| S4.4 | Assistent Suchrahmen bis Ortsliste | `live-verified` | `docs/demos/S4.4/` | Walkthrough 32/32, Report und Screenshots gelesen. |

## M5 Kombinationssuche

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S5.1 | Datenmodell Suche | `demonstrated` | `docs/demos/S5.1/` | pgTAP 51 Zusicherungen, Offers idempotent. |
| S5.2 | Suche anlegen | `demonstrated` | `docs/demos/S5.2/` | 202, 400 ohne ALTCHA, 429 mit Retry-After, 402 Kontingent. |
| S5.3 | Kombinationssuche (Workflow) | `demonstrated` | `docs/demos/S5.3/` | 60 von 60, zweite Suche aus dem Cache. |
| S5.4 | Fortschrittsansicht | `live-verified` | `docs/demos/S5.4/` | Walkthrough 13/13, Screenshots gelesen. |

## M6 Bewertung und Ergebnisse

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S6.1 | Bewertungslogik | `demonstrated` | `docs/demos/S6.1/` | Fixture `scoring_case_1.json`; Akzeptanzbeispiele 2 und 3 als Tests. |
| S6.2 | Ergebnis-Endpunkte | `demonstrated` | `docs/demos/S6.2/` | Matrix 5 × 9, jede Unterkunft einmal; Referenzpreis-Endpunkt nur mit Fake-Adapter (Contract ungeprüft, BG-05). |
| S6.3 | Ergebnisansicht | `live-verified` | `docs/demos/S6.3/` | Walkthrough 31/31, Report und Screenshots gelesen. |
| S6.4 | Kalibrierung Stufe 1 | `demonstrated` | `docs/demos/S6.4/` | Simulierte Welt: value 18,3 %, date 5,4 %, place 12,6 %; echte Daten offen (BG-05). |
| K | Kernfunktion (Kombinationssuche mit Matrix) | `maximized` | `docs/demos/S5.4/`, `docs/demos/S6.3/`, `docs/demos/S6.1/`, `docs/demos/S7.4/`, `docs/demos/S8.4/` | Alle fünf Akzeptanzbeispiele aus `konzept.md` 5.1 belegt, mit simulierten Anbietern. Nachweis mit echten Anbietern offen (O8.1, BG-05/07/08); Competitor-Baseline unbestätigt (BG-18). |

## M7 Rezensionscheck

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S7.1 | Stichwortsuche Rezensionen | `demonstrated` | `docs/demos/S7.1/` | Fixture: drei Schimmel-Treffer, Verneinungen in fünf Sprachen erkannt. |
| S7.2 | Skill Rezensionsprüfung | `demonstrated` | `docs/demos/S7.2/` | 44 Eval-Fälle, Fake-Lauf 44/44; echter Lauf gegen BG-19 steht aus (BG-07). |
| S7.3 | Rezensionscheck im Workflow | `demonstrated` | `docs/demos/S7.3/` | Schimmel 3/3 bestätigt, Qualität 8,8 → 7,8; ohne KI-Budget `skipped_budget`, kein Abzug. |
| S7.4 | Warnhinweise | `live-verified` | `docs/demos/S7.4/` | Walkthrough 21/21, Akzeptanzbeispiel 4 im Screenshot gelesen. |

## M8 Buchung

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S8.1 | Buchungs-Zustandsautomat | `demonstrated` | `docs/demos/S8.1/` | 7 erlaubte, 35 verbotene Übergänge; parallele Zahlungsrückkehr bucht genau einmal (PGlite). |
| S8.2 | Buchungs-Endpunkte | `demonstrated` | `docs/demos/S8.2/` | Ablauf bis `cancelled`; doppeltes `complete` gleicher Stand; fremdes Token → 403. |
| S8.3 | E-Mail-Versand | `demonstrated` | `docs/demos/S8.3/` | Bestätigung gerendert; Fehlversand, zweiter Versuch per Cron. |
| S8.4 | Buchungsablauf | `live-verified` | `docs/demos/S8.4/` | Walkthrough 36/36, Akzeptanzbeispiel 5 im Screenshot gelesen; Zahlung simuliert. |
| O8.1 | Buchung Sandbox Ende zu Ende | `blocked` | – | BG-05, BG-08 |

## M9 Vertrauen, Recht und Schutz

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S9.1 | Pflicht- und Transparenzseiten | `live-verified` | `docs/demos/S9.1/` | Walkthrough 22/22, Screenshots gelesen; Rechtstexte bleiben Platzhalter bis BG-02. |
| S9.2 | Wartungsjobs und Wächter | `demonstrated` | `docs/demos/S9.2/` | Simulierter Tag mit 5.000 : 1 → Alarm in der Outbox, neue Suchen auf 40 Kombinationen gedrosselt; Kostenbericht. |
| S9.3 | Härtung | `demonstrated` | `docs/demos/S9.3/` | Header der Startseite (Produktions-Build) und der API; Buchung über HTTP ohne Klartext-E-Mail, Telefonnummer und Tokens in Log und Antworten; grobes Rate Limit 300/min; alle Walkthroughs gegen den Produktions-Build mit CSP ohne Konsolenfehler. |
| S9.4 | Ops-Watchdog | `demonstrated` | `docs/demos/S9.4/` | Echter Health-Endpunkt: Datenbank gestoppt → „kritisch“, kein zweiter Alarm innerhalb von 4 h, Erinnerung, Entwarnung sofort; live mit `wrangler dev`. `live-verified` erst mit echtem Alarm in M10. |

## M10 Deployment und Go-Live

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| O10.1 | Infrastruktur | `blocked` | – | BG-03, BG-04, BG-09 |
| O10.2 | Deploy-Pipeline | `blocked` | – | Operator-Lane |
| S10.1 | Smoke-Tests | `demonstrated` | `docs/demos/S10.1/` | Lokal gegen den Produktions-Build 7/7; `--expect-env production` scheitert dort erwartungsgemäß. Gegen Staging und in `deploy.yml` offen (O10.1, O10.2). |
| O10.3 | Go-Live | `blocked` | – | BG-13 |
