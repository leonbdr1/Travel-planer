# STATUS – Baustand je Slice

Einzige Wahrheit über den Baustand (`CLAUDE.md`, `docs/umsetzungsplan.md`). Reifegrade:
`spec'd` (nur beschrieben) · `built` (Code da, nicht verdrahtet) · `wired` · `demonstrated` (über den realen Einstiegspunkt vorgeführt) · `live-verified` (im laufenden Stack gesehen, Report gelesen) · `blocked` (wartet auf ⛔ BEN-GATE oder externe Ressource).

Alle Anbieter laufen bis auf Weiteres im Modus `fake` (keine Konten, keine Schlüssel). Stand: 27.09.2026.

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
| S4.1 | Fachlogik Suchrahmen | `spec'd` | – | |
| S4.2 | API Vorschläge | `spec'd` | – | |
| S4.3 | Wunsch-Übersetzung | `spec'd` | – | |
| S4.4 | Assistent Suchrahmen bis Ortsliste | `spec'd` | – | |

## M5 Kombinationssuche

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S5.1 | Datenmodell Suche | `spec'd` | – | |
| S5.2 | Suche anlegen | `spec'd` | – | |
| S5.3 | Kombinationssuche (Workflow) | `spec'd` | – | |
| S5.4 | Fortschrittsansicht | `spec'd` | – | |

## M6 Bewertung und Ergebnisse

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S6.1 | Bewertungslogik | `spec'd` | – | |
| S6.2 | Ergebnis-Endpunkte | `spec'd` | – | |
| S6.3 | Ergebnisansicht | `spec'd` | – | |
| S6.4 | Kalibrierung Stufe 1 | `spec'd` | – | |

## M7 Rezensionscheck

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S7.1 | Stichwortsuche Rezensionen | `spec'd` | – | |
| S7.2 | Skill Rezensionsprüfung | `spec'd` | – | |
| S7.3 | Rezensionscheck im Workflow | `spec'd` | – | |
| S7.4 | Warnhinweise | `spec'd` | – | |

## M8 Buchung

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S8.1 | Buchungs-Zustandsautomat | `spec'd` | – | |
| S8.2 | Buchungs-Endpunkte | `spec'd` | – | |
| S8.3 | E-Mail-Versand | `spec'd` | – | |
| S8.4 | Buchungsablauf | `spec'd` | – | |
| O8.1 | Buchung Sandbox Ende zu Ende | `blocked` | – | BG-05, BG-08 |

## M9 Vertrauen, Recht und Schutz

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| S9.1 | Pflicht- und Transparenzseiten | `spec'd` | – | |
| S9.2 | Wartungsjobs und Wächter | `spec'd` | – | |
| S9.3 | Härtung | `spec'd` | – | |
| S9.4 | Ops-Watchdog | `spec'd` | – | |

## M10 Deployment und Go-Live

| ID | Zeile | Reifegrad | Beleg | Anmerkung |
|---|---|---|---|---|
| O10.1 | Infrastruktur | `blocked` | – | BG-03, BG-04, BG-09 |
| O10.2 | Deploy-Pipeline | `blocked` | – | Operator-Lane |
| S10.1 | Smoke-Tests | `spec'd` | – | |
| O10.3 | Go-Live | `blocked` | – | BG-13 |
