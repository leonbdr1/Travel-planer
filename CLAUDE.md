# CLAUDE.md – [ARBEITSTITEL] (Arbeits-Slug `reiseplaner`)

Flexible Unterkunftssuche: Der Nutzer gibt Startort, Fahrzeit, Themen, Zeitfenster und Reisemuster an. Das Produkt schlägt Regionen und Orte aus einem geprüften Katalog vor, sucht alle Kombinationen aus Ort und Termin parallel, bewertet die Qualität ehrlich, erkennt Schnäppchen, prüft Rezensionen per KI und ermöglicht die Buchung über LiteAPI. B2C-Produkt von Fischermann Intelligence auf der Firmenplattform (Cloudflare Worker, Supabase, Claude-Skills), gebaut mit fi-deck.

Deutsch für Dokumente, UI-Texte und die Kommunikation mit Ben. Englisch für Code, Kommentare und Commit-Messages (fi-deck-Konvention).

## Dokumente

| Datei | Inhalt |
|---|---|
| `docs/konzept.md` | Was und warum: Zielgruppe, Features als User Stories, Maximum-Messlatte, Validierung |
| `docs/architektur.md` | Wie: Stack, Entscheidungen, Datenmodell, Fachlogik, API, KI, Sicherheit, Deployment, Kosten |
| `docs/umsetzungsplan.md` | In welcher Reihenfolge: Meilensteine M1–M10, Slices, BEN-GATE-Dashboard |
| `STATUS.md` | Baustand je Slice, einzige Wahrheit |
| `HANDOFF.md` | Frontier, offene Entscheidungen, Stolperfallen |
| `AGENTS.md` | Review-Richtlinien für Codex |

Bei Widersprüchen gilt: Konzept vor Architektur vor Plan. Widersprüche werden gemeldet, nicht still aufgelöst.

## Arbeitsregeln

1. **Meilensteinweise in Plan-Reihenfolge.** Innerhalb eines Meilensteins Slice für Slice. Keinen Meilenstein beginnen, dessen BEN-GATEs offen sind.
2. **Slice-Loop (Execution-Protocol, fi-deck):**
   1. Die im Plan genannten Contracts gegen den aktuellen Code bzw. die aktuelle Anbieter-Doku prüfen.
   2. Design-Preflight über fünf Linsen: Semantik wiederverwendeter Contracts, Abweichungen an Schnittstellen, Aushöhlung von Invarianten und Gates, Lücken für nachfolgende Slices, Drift zwischen Plan und Code.
   3. Test zuerst.
   4. Implementieren **und im selben Commit verdrahten** (realer Aufrufer → Modul → realer Konsument).
   5. Demo über den realen Einstiegspunkt (`npm run demo -- <slice-id>`, CLI oder HTTP), nie nur über einen Unit-Test.
   6. Bei allem, was Nutzer sehen: Walkthrough (`npm run dogfood`), dann `dogfood-results/<run>/report.md` und die Screenshots **lesen**.
   7. Checkbox im Plan mit Commit-Hash und Datum abhaken, STATUS-Zeile aktualisieren, Belege nach `docs/demos/<slice-id>/`.
   8. Verify-Slice: Demo reproduzieren, Wiring prüfen, Disziplin prüfen, Screen-Read.
3. **Reifegrade:** `spec'd` (nur beschrieben) · `built` (Code da, niemand ruft ihn auf: Gefahrenzone) · `wired` (Aufrufer und Konsument verbunden) · `demonstrated` (über den realen Einstiegspunkt vorgeführt) · `live-verified` (im laufenden Stack gesehen und der Report gelesen). Fertig heißt mindestens `demonstrated`, bei Nutzerflächen `live-verified`.
4. **Nach jedem Meilenstein kurz berichten:** fünf bis zehn Zeilen (was steht, mit Belegen; was offen ist; nächster Schritt), dazu `STATUS.md` und `HANDOFF.md` aktualisieren. Zwischen den Slices kein Bericht (Meldeschwelle: Routine bleibt still).
5. **Bei Abweichungen vom Plan erst fragen.** Aufgabe stoppen, im Plan `⟂ drift (<datum>): <befund>` annotieren, in `HANDOFF.md` §Frontier eintragen, Ben fragen, bis zur Antwort die nächste unabhängige Aufgabe übernehmen. Nie einen Contract aus dem Gedächtnis nachbauen.
6. **⛔ BEN-GATE:** anhalten und fragen. Immer ein Gate, auch wenn der Plan es nicht nennt: Geld ausgeben, Konten anlegen, Secrets lesen oder setzen, deployen, Migrationen gegen Staging oder Produktion, echte E-Mails, Live-Buchungen, neue Abhängigkeiten, Änderungen an `architektur.md`.
7. **Lanes:** Fleet-Worker ändern keine ausführungssteuernden Dateien (`.github/workflows/*`, `.githooks/*`, `package.json`-Skripte und Abhängigkeiten, `package-lock.json`, `toolchain/*`, `.gitattributes`). Solche Änderungen laufen in der Operator-Lane mit Ben.
8. **Höchstens zwei schreibende Linien gleichzeitig.** Eine neue Linie auf derselben Fläche startet vom Stand der laufenden.
9. **Beweise in den Baum:** früh und oft committen; jede Zahl, die ein Ergebnis belegt, steht in einer committeten Datei.

## Tech-Stack

TypeScript (strict) · Node 22 · npm-Workspaces (`packages/*`, Scope `@reiseplaner/*`) · Cloudflare Worker mit Static Assets, Hono, Workflows, Cron Triggers · Supabase Postgres (EU) über Hyperdrive mit postgres.js · zod · Claude API mit Skill-Bundles im Firmenformat · React 19, Vite, Tailwind CSS 4, React Router 7, Headless UI, Catalyst · Vitest, `@cloudflare/vitest-pool-workers`, PGlite mit pgTAP, Playwright · Resend · ALTCHA · openrouteservice · GeoNames. Details und Begründungen: `docs/architektur.md` Abschnitt 2.

## Code-Konventionen

- `tsconfig.base.json` mit `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Kein `any`. zod an jeder Grenze (HTTP, Anbieter-Antworten, Konfiguration, Datenbankzeilen).
- `packages/domain` ist rein: keine IO, keine Zeit ohne Parameter, keine Zufallswerte ohne Parameter. Jede Regel aus `architektur.md` Abschnitt 6 hat Unit-Tests.
- Externe Dienste nur über die Ports in `packages/providers`; jeder Adapter hat einen Fake. Auswahl über `PROVIDERS_MODE`.
- **Keine Literale** für Marke, Domain, E-Mail-Adressen, Betreiberdaten, Preise, Schwellen oder Limits. Produktwerte kommen aus `product.config.yaml`, Konstanten aus `packages/domain/src/constants.ts`.
- Geld als Integer in Cent mit Währung. Zeiten in UTC, Anzeige in Europe/Berlin.
- SQL handgeschrieben in `packages/db/src/repos/`. Migrationen nur additiv als neue Datei `supabase/migrations/YYYYMMDD[a-z]_<name>.sql` mit `_VERIFY.sql.notrun`; eine bestehende Migration wird nie geändert. RLS auf jeder Tabelle, pgTAP-Test dazu.
- Workflow-Schritte sind idempotent und geben nur IDs und Zähler zurück (Limit 1 MiB).
- Kostenbremsen sind fail-closed: `budget_reserve` vor jedem kostenpflichtigen Aufruf, `budget_settle` danach; `increment_rate_limit` vor kostensensitiven Endpunkten.
- KI nur über Skill-Bundles und den Runner. Ein neuer oder geänderter Prompt ist eine neue Skill-Version mit Evals.
- Jede Fläche mit KI-Anteil nutzt `AiLabel` (`data-ai-provenance`). UI-Texte stehen in `packages/web/src/i18n/de.ts` und bestehen `npm run check:claims`.
- Logs ohne personenbezogene Daten; Tokens und Schlüssel werden nie geloggt.
- Tests ohne Netzwerk, ohne Docker, ohne Secrets.
- Commits: `feat|fix(<scope>): <slice-id> <what> — demonstrated via <command>`.

## Befehle

```bash
npm ci --ignore-scripts && node scripts/supply-chain-check.mjs --rebuild   # installieren
npm run db:local                      # lokale Datenbank (PGlite-Socket, Port 54329)
npm run dev                           # Worker und SPA lokal, Anbieter als Fakes
npm test                              # alle hermetischen Tests
npm run db:test                       # pgTAP (RLS, RPCs, Constraints)
npm run typecheck && npm run build
npm run check:claims                  # Claims-Regel
npm run skills:build                  # Skill-Manifest und Validatoren erzeugen
npm run skills:eval -- <skill-id> [--fake]
npm run demo -- <slice-id>            # Demo eines Slices über den realen Einstiegspunkt
npm run dogfood -- --mode R|P [--flow <name>]   # Walkthrough mit Screen-Report
npm run cli -- <befehl>               # catalog, geonames, validate, record-fixture, cost-report …
npm run smoke -- --base-url <url>     # nur lesend, auch gegen Produktion erlaubt
```

## Nicht tun

- Keine Tests, die gegen Produktion schreiben. Gegen Produktion laufen nur lesende Smoke-Tests.
- Kein Scraping, keine Anbieter außerhalb von `architektur.md` ohne Freigabe.
- Keine Preisgarantien und keine Ersparnis-Behauptungen ohne Datengrundlage in Texten.
- Brevo und Amazon SES nicht verwenden (in der Firma verworfen).
