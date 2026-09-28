# Reiseplaner (Arbeitstitel) – Flexible Unterkunftssuche

Der Nutzer beschreibt seinen Rahmen (Startort, maximale Fahrzeit, Themen, Zeitfenster, Reisemuster, Budget). Das Produkt schlägt Regionen und Orte aus einem geprüften Katalog vor, durchsucht alle Kombinationen aus Ort und Termin gleichzeitig, bewertet die Qualität ehrlich, erkennt Schnäppchen, prüft Rezensionen per KI und ermöglicht die Buchung über LiteAPI.

> **Stand (28.09.2026):** funktional vollständige lokale Version, Meilensteine M1 bis M9, der Smoke-Test aus M10 und die Entscheidungshilfe aus M11: Suche über alle Orte und Termine, ehrliche Bewertung mit Schnäppchen, KI-Rezensionscheck mit Warnhinweisen, Ziel mit automatischer Vorauswahl und Finale („was der Aufpreis bringt“), Lob-Labels, Buchung mit Stornierung, Pflichtseiten, Wartungsjobs und Watchdog. Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail, Zahlung) sind **simuliert** – es gibt keine echten Preise und keine echten Buchungen. Baustand je Slice: [`STATUS.md`](STATUS.md); was bis zum Go-Live fehlt: [`HANDOFF.md`](HANDOFF.md) und [`docs/runbooks/go-live-checkliste.md`](docs/runbooks/go-live-checkliste.md).

## Schnellstart

Voraussetzung: **Node.js 22** (siehe `.nvmrc`).

```bash
npm ci --ignore-scripts && node scripts/supply-chain-check.mjs --rebuild   # installieren
npm run dev                                                                # starten
```

Dann <http://localhost:5173> öffnen. `npm run dev` startet die lokale Datenbank (PGlite) und die App (Vite + Cloudflare-Worker in `workerd`) in einem Prozess.

## Ausprobieren

> **Mit echten Hotels testen:** [`docs/runbooks/testbetrieb.md`](docs/runbooks/testbetrieb.md) (eigene Schlüssel für LiteAPI, optional openrouteservice und Anthropic; E-Mails simuliert, Buchen aus). Die Schwellen der Vorauswahl zum Bewerten: [`docs/startwerte.md`](docs/startwerte.md).

1. **Suche starten:** Startort (z. B. Stuttgart), maximale Fahrzeit, Themen oder ein Freitextwunsch (z. B. „sauber, ruhig und Blick auf den See“), Zeitfenster, Nächte, Anreisetag und das Ziel („Günstig und sauber“, „Preis-Leistung“, „Komfort“). Die Seite zeigt live, wie viele Termine entstehen.
2. **Orte bestätigen:** Regionsvorschläge mit Begründung, Ortsliste mit Fahrzeiten; eigene Orte lassen sich ergänzen (z. B. Füssen).
3. **Deine Auswahl:** Das Programm sortiert aus, was nicht zum Ziel passt (zu teuer, zu schwach bewertet, Warnsignale wie Schimmel, Sterne-Falle, es gibt ein besseres Angebot), und zeigt höchstens vier Unterkünfte, die günstigste zuerst, bei den anderen den Aufpreis und was er bringt. Keine Empfehlung; das Ziel lässt sich ohne neue Suche wechseln.
4. **Alle Angebote:** Preis-Matrix über alle Orte und Termine, Rangliste nach bestem Angebot, Preis oder Bewertung, Filter ohne neue Suche (Sterne und Mindestbewertung unter „Weitere Filter“), Schnäppchen mit Begründung, Lob-Labels wie „Gutes Frühstück“. In der simulierten Welt hat etwa „Hotel Schwanen“ in Füssen einen Warnhinweis „Schimmel“ aus dem Rezensionscheck.
5. **Buchen:** Angebot wählen, Gastdaten, simulierte Zahlung, Bestätigung mit Buchungsnummer; unter „Meine Buchung“ ansehen und kostenlos stornieren. Ein Nachname mit „Fehler“ simuliert eine abgelehnte Buchung.

Es entstehen weder Kosten noch echte E-Mails; der gelbe Balken oben erinnert daran.

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
| `npm run cli -- <befehl>` | Katalog, GeoNames, Validierung, Kostenbericht (`cost-report --days 7`) … |
| `npm run smoke -- --base-url <url> [--expect-env staging\|production]` | nur lesender Smoke-Test nach einem Deploy |
| `npm run cli -- testbetrieb einrichten\|pruefen\|aus` | Testbetrieb mit echten Hotels (eigene Schlüssel), siehe [`docs/runbooks/testbetrieb.md`](docs/runbooks/testbetrieb.md) |
| `npm run build && npx tsx scripts/dev.ts preview --port 4173 --strictPort` | Produktions-Build lokal (mit Security-Headern und CSP) |

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

## Vom lokalen Stand zum Go-Live

Der Code ist für den Betrieb auf Cloudflare (Worker, Workflows, Cron) mit Supabase gebaut; umgeschaltet wird über `PROVIDERS_MODE` (`fake` → `sandbox` → `live`) und Secrets, nicht über Codeänderungen. Es fehlen Entscheidungen und Konten, die nur Menschen treffen oder anlegen können: Betreiber und Rechtstexte, Name und Domain, Marge, Konten und Schlüssel für LiteAPI, openrouteservice, Anthropic und Resend, Cloudflare und Supabase, danach Staging, Abnahme und Freigabe. Die vollständige Liste mit Reihenfolge steht in [`HANDOFF.md`](HANDOFF.md) Abschnitt 2 und in der [Go-live-Checkliste](docs/runbooks/go-live-checkliste.md).

Datenquellen: Ortsdaten von [GeoNames](https://www.geonames.org/) (CC BY 4.0); Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende.
