# Reiseplaner (Arbeitstitel) – Flexible Unterkunftssuche

Der Nutzer beschreibt seinen Rahmen (Startort, maximale Fahrzeit, Themen, Zeitfenster, Reisemuster, Budget). Das Produkt schlägt Regionen und Orte aus einem geprüften Katalog vor, durchsucht alle Kombinationen aus Ort und Termin gleichzeitig, bewertet die Qualität ehrlich, erkennt Schnäppchen, prüft Rezensionen per KI und ermöglicht die Buchung über LiteAPI.

> **Stand:** lokale Entwicklungsversion. Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail, Zahlung) sind **simuliert** – es gibt keine echten Preise und keine echten Buchungen. Baustand je Slice: [`STATUS.md`](STATUS.md).

## Schnellstart

Voraussetzung: **Node.js 22** (siehe `.nvmrc`).

```bash
npm ci --ignore-scripts && node scripts/supply-chain-check.mjs --rebuild   # installieren
npm run dev                                                                # starten
```

Dann <http://localhost:5173> öffnen. `npm run dev` startet die lokale Datenbank (PGlite) und die App (Vite + Cloudflare-Worker in `workerd`) in einem Prozess.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | lokale Datenbank und App starten |
| `npm run db:local` | nur die lokale Datenbank (Port 54329) |
| `npm test` | alle hermetischen Tests (ohne Netzwerk, ohne Secrets) |
| `npm run db:test` | pgTAP-Tests (RLS, RPCs, Constraints) |
| `npm run typecheck` / `npm run build` | Typprüfung / Produktions-Build |
| `npm run check:claims` | verbotene Werbeaussagen in UI-Texten |
| `npm run demo -- <slice-id>` | Demo eines Slices über den realen Einstiegspunkt |
| `npm run dogfood -- --mode R\|P [--flow <name>]` | Browser-Walkthrough mit Screen-Report |
| `npm run cli -- <befehl>` | Katalog, GeoNames, Validierung, Kostenbericht … |

## Dokumente

| Datei | Inhalt |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Arbeitsregeln |
| [`docs/konzept.md`](docs/konzept.md) | Was und warum |
| [`docs/architektur.md`](docs/architektur.md) | Wie |
| [`docs/umsetzungsplan.md`](docs/umsetzungsplan.md) | Reihenfolge, Meilensteine, BEN-GATEs |
| [`STATUS.md`](STATUS.md) | Baustand je Slice |
| [`HANDOFF.md`](HANDOFF.md) | Frontier, offene Entscheidungen, Abweichungen |
| [`AGENTS.md`](AGENTS.md) | Review-Richtlinien |
| [`docs/runbooks/`](docs/runbooks/) | lokale Entwicklung, Secrets, Walkthrough |
| [`docs/demos/`](docs/demos/) | committete Belege je Slice |

## Aufbau

```
packages/
  config/      product.config.yaml → geprüfte, typisierte Konfiguration
  contracts/   zod-Schemas der API (Worker und SPA)
  domain/      reine Fachlogik (Termine, Score, Schnäppchen, Rangliste …)
  db/          Datenbank-Port, postgres.js/PGlite, Migrationen, Repositories
  providers/   Ports, Adapter und Fakes (LiteAPI, openrouteservice, Claude, E-Mail)
  skills/      KI-Skills im Firmenformat, Runner, Evals
  worker/      Hono-API, SearchWorkflow, Cron-Jobs
  web/         React-SPA (Vite, Tailwind CSS 4, React Router 7)
  ui/          UI-Komponenten
  ops-worker/  Wächter (Dead-Man's-Switch)
  cli/         Katalog, GeoNames, Demos, Kostenbericht
supabase/      Migrationen und pgTAP-Tests
e2e/dogfood/   Walkthrough-Harness
```

Datenquellen: Ortsdaten von [GeoNames](https://www.geonames.org/) (CC BY 4.0); Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende.
