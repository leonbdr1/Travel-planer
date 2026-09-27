# Umsetzungsplan: [ARBEITSTITEL]

**Status:** `open-work` · Stand 26.09.2026 · **Fassung 2** (ersetzt Fassung 1 vom selben Tag)
**Grundlage:** `docs/konzept.md` (Fassung 3), `docs/architektur.md` (Fassung 2)
**Verbindliches Protokoll:** fi-deck `docs/superpowers/EXECUTION-PROTOCOL.md`; Produktfassung in `CLAUDE.md`
**Baustand:** `STATUS.md` (einzige Wahrheit) · **Frontier und offene Entscheidungen:** `HANDOFF.md`

---

## 0. So ist dieser Plan zu lesen

- **Meilensteine** M1 bis M10, der Reihe nach. M1 ist das lauffähige Grundgerüst, M2 ein Go/No-Go-Punkt.
- Jeder Meilenstein besteht aus **Operator-Schritten** `O<m>.<n>` (Operator-Lane: interaktive Sitzung mit Ben, siehe `architektur.md` 14.1) und **Slices** `S<m>.<n>` (Fleet-Lane).
- **Jede Aufgabe** ist eine Checkbox mit vier Angaben: *Deliverable*, *Wiring* (realer Aufrufer → Modul → realer Konsument), *Demo* (Kommando über den realen Einstiegspunkt und Soll-Ausgabe), *STATUS* (welche Zeile auf welchen Reifegrad geht).
- **Abhaken:** `- [x] … (<commit-hash>, <datum>)`. Eine Aufgabe ohne Hash gilt als nicht erledigt.
- **Reifegrade:** `spec'd` → `built` → `wired` → `demonstrated` → `live-verified`. Für alles, was Nutzer sehen, ist `live-verified` das Ziel. Dafür braucht es einen **Walkthrough** (Playwright gegen den echt laufenden Stack, Screen-Report `dogfood-results/<run>/report.md` mit Screenshots) **und** einen gelesenen Durchgang durch Report und Screenshots. Eine grüne e2e-Assertion reicht nie.
- **Beweise** kommen in den Baum: Demo-Ausgaben und Screen-Reports werden nach `docs/demos/<slice-id>/` kopiert und committet.
- **Commit-Konvention:** `feat|fix(<scope>): <slice-id> <was> — demonstrated via <kommando>`.
- **⛔ BEN-GATE:** Stelle, die Geld kostet, nach außen wirkt oder eine offene Entscheidung berührt. Dort wird ohne ausdrückliches Go angehalten. Unabhängige Arbeit davor oder danach darf weiterlaufen. Übersicht in Abschnitt 3.
- **Eskalation:** Widerspricht der Plan dem Code oder einer Anbieter-Dokumentation, wird die Aufgabe gestoppt, im Plan als `⟂ drift (<datum>): <befund>` annotiert, in `HANDOFF.md` §Frontier eingetragen, und die nächste unabhängige Aufgabe übernommen. Nie einen Contract aus dem Gedächtnis nachbauen.
- **Vor jedem Slice:** Design-Preflight (fünf Linsen: Semantik wiederverwendeter Contracts, Abweichungen an Schnittstellen, Aushöhlung von Invarianten und Gates, Lücken für nachfolgende Slices, Drift zwischen Plan und Code). **Nach jedem Slice:** Verify-Slice (Demo reproduzieren, Wiring prüfen, Disziplin prüfen, Screen-Read bei nutzer-erreichbaren Slices). Solange die fi-deck-Workflows keinen Repo-Parameter haben (⛔ BG-15), werden diese Schritte manuell ausgeführt und im Commit dokumentiert.
- **Auftrags-Kopf für Fleet-Briefs** (Standard, pro Slice überschreibbar):
  ```
  REPORT:   terse
  DECIDE:   self
  GATE:     codex
  ESCALATE: BEN-GATE-Berührung · neue Sicherheitsfläche · Kostenbremse berührt · Abweichung von architektur.md · Anweisung widerspricht einer anderen desselben Auftrags · neue Abhängigkeit nötig
  ```

## 1. Kontext und Nicht-Ziele

**Kontext:** Das Produkt ist in `konzept.md` beschrieben, die Plattform in `architektur.md`. Das Repository `fischermann-intelligence/reiseplaner` existiert noch nicht; M1 legt es an.

**Nicht-Ziele** (werden in diesem Plan ausdrücklich nicht gebaut): alle „Späteren Features“ aus `konzept.md` Abschnitt 11, insbesondere Metasuche über mehrere Portale, Affiliate-Links, Flüge, Nutzerkonten und Preisalarm, SEO-Landingpages, eigene Preisbeobachtungen, Trusted Shops, App, Werbung, weitere Sprachen und Märkte. Außerdem kein Admin-Frontend und keine Analyse-Tools.

## 2. Verified contracts

Contracts, auf die sich dieser Plan stützt. Jeder Slice verifiziert die von ihm genutzten Contracts vor dem Bauen neu (sie können seit dem Plandatum gedriftet sein).

### 2.1 Firmen-Bausteine (verified against, 2026-09-26)

| Contract | Inhalt | Quelle |
|---|---|---|
| Rate-Limit-RPC | `increment_rate_limit(p_key, p_max, p_window)`, atomar, fail-closed | `frontlift/portal/functions/api/_shared/rate-limit.ts:9-58` (SQL im Kommentar), `:59` (`checkRateLimit`) |
| Budget reserve/settle | Reservierung vor dem Aufruf, Abrechnung mit echten Tokens, `ip_hash` mit Salz und UTC-Datum, Antwort `402 {reason, cta}` | `frontlift/portal/functions/api/_shared/demoBudget.ts:16-31`, `:190` |
| Skill-Bundle | `skill.yaml` mit `id`, `version`, `model`, `temperature`, `maxTokens`, `costCapUsdPerCall`, Refs auf Schemas und Prompts | `frontlift/core/skills/editorial-os.draft-quality-judge/v1.0.0/skill.yaml:1-24` |
| Eval-Datensatz | JSONL mit `id`, `input`, `assertions` (JSONPath `equals`/`contains`/`matches`) oder `judgeRubric` | `frontlift/core/eval/README.md:19-40` |
| Skill-Eval-Gate | Toleranz 0,02 gegen `baseline.json`, Deckel `--budget-usd=0.50` | `frontlift/.github/workflows/skill-eval.yml:6-9`, `:137` |
| Telemetrie | `TelemetryEvent` mit `skill`, `version`, `tenantId`, `correlationId`, `inputHash`, `outputHash`, `latencyMs`, `costUsd`, `modelUsed`, `outcome`, `downstreamSignal` | `frontlift/core/telemetry/types.ts:4-20` |
| Modellpreise im Firmen-Runner | Haiku 4.5 mit 0,80 $ / 4 $ eingetragen (veraltet; offiziell 1 $ / 5 $) | `frontlift/core/runner/call-model.ts:22` |
| Typografie-Scrubber | `normalizeGermanTypography(content)` | `frontlift/scripts/generate-site.mjs:1335` |
| Worker mit Static Assets | `assets`-Binding, `run_worker_first` | `frontlift/wrangler.jsonc:30-36` |
| Eiserne Regel e2e | gegen Produktion nur lesende Smoke-Tests | `frontlift/e2e/playwright.config.ts:12-13` |
| Dead-Man's-Switch | Cron alle 15 Minuten, Zustandsmaschine, 4 Stunden Abkühlzeit, Resend | `frontlift/infra/cf-ops-worker/README.md:23-27` |
| Cron-Direktive | wiederkehrende Jobs per Cloudflare Cron, GitHub Actions nur ereignisgesteuert | `frontlift/docs/ARCHITECTURE-multi-tenant-constraints.md:92` |
| Brevo und SES verworfen | beide Anbieter „dead“ | `frontlift/docs/ARCHITECTURE-CURRENT.md:18` |
| TypeScript-Basis | `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` | `fi-deck/tsconfig.base.json:1-13` |
| Execution-Protocol | Leiter `:14`, Maximum-Regel `:28`, Slice-Loop `:70`, Plan-Format `:158`, Eskalation `:173`, Meldeschwelle `:182`, Beweis-Haltbarkeit `:233`, zwei schreibende Linien `:374` | `fi-deck/docs/superpowers/EXECUTION-PROTOCOL.md` |
| Verify-Slice | Check 1 Demo, Check 2 Wiring, Check 3 Disziplin, Check 4 Screen-Read | `fi-deck/.claude/workflows/verify-slice.mjs:41-65` |
| Fleet-Sandbox | Egress nur `api.anthropic.com:443` (`:61`); Abhängigkeiten im Image (`:258`); Ablehnung von CI- und Lifecycle-Änderungen (`:271`); keine Paketinstallation (`:330`) | `fi-deck/docs/superpowers/specs/2026-07-14-fi-deck-worker-isolation-sandbox-design.md` |
| Supply Chain | nur erlaubte Registry (`:15`), Rebuild-Allowlist (`:40-47`) | `fi-deck/test-manifests/supply-chain-policy.json` |
| CI-Grundgate | `persist-credentials: false` (`:62`), `npm ci --ignore-scripts` (`:72`), Baum unverändert (`:137`) | `fi-deck/.github/workflows/tier0.yml` |
| Dogfood-Walkthrough | Dogfood ist kein e2e (`:11`), Report `report.md` (`:29`, `:45`) | `fi-deck/docs/runbooks/dogfood-walkthrough.md` |
| Review-Richtlinien | P1 für fail-open und Phantom-Wiring | `fi-deck/AGENTS.md:13-17` |

### 2.2 Externe Contracts (aus der Dokumentation, in S2.x gegen die Live-Dokumentation zu verifizieren)

| Contract | Quelle (abgerufen 2026-09-26) |
|---|---|
| LiteAPI Tarife, Prebook, Book, Payment SDK, Rezensionen, Preise, Such-zu-Buchungs-Grenze 5.000 : 1 | docs.liteapi.travel (user-payment, api-pricing-usage-costs, faq) |
| openrouteservice Matrix, Standard-Plan-Kontingente, Host `api.heigit.org` | openrouteservice.org/plans; Forum-Ankündigung zur Abkündigung von `api.openrouteservice.org` |
| Cloudflare Workers/Workflows/Hyperdrive-Limits und -Preise | developers.cloudflare.com (Limits, Workflows, Hyperdrive, Vitest-Integration) |
| Supabase Preise und Pause-Verhalten | supabase.com/pricing; Billing-FAQ |
| Resend Free-Plan | Resend-Tarifübersicht |
| Claude-Preise | platform.claude.com/docs/en/about-claude/pricing |
| PGlite-Erweiterungen und Socket | pglite.dev |

## 3. BEN-GATE-Dashboard

| ID | Frage | Default-Empfehlung | Blockiert |
|---|---|---|---|
| BG-01 | Produktname und technischer Slug | Arbeits-Slug `reiseplaner` verwenden, bis der Name feststeht; Umbenennung nur vor M1 | M1 |
| BG-02 | Betreiber (Fischermann Intelligence oder Fischermann Media), Rechtstexte, Anwalt | Betreiber wie bei Frontlift; Anwalt vor Go-Live | M9, M10 |
| BG-03 | Cloudflare Workers Paid (5 $/Monat) | ja; entfällt, falls der Account bereits Paid ist | Staging (M10), Lasttests |
| BG-04 | Supabase: Produktion in der Pro-Organisation der Firma, Staging in separater Free-Organisation, Region Frankfurt | so umsetzen | M10 (Produktion), Staging-Tests |
| BG-05 | LiteAPI-Konto: Sandbox sofort, Live nach M2-Go (Kreditkarte hinterlegen) | Sandbox jetzt anlegen | M2 |
| BG-06 | HeiGIT-Schlüssel (laut Nutzungsbedingungen personengebunden): wer hält ihn? | Ben | M2 |
| BG-07 | Anthropic: eigener Workspace und Schlüssel für das Produkt, Tagesbudget | eigener Workspace; Laufzeit 5 $/Tag, Evals separat | M3 |
| BG-08 | Resend: Konto, Domain, Plan | Firmenkonto; Pro (20 $/Monat) nur, falls die freie Domain belegt ist | M8 |
| BG-09 | Domain kaufen, DNS bei Cloudflare | Registrar und Vorgehen wie bei frontlift.de | M10 |
| BG-10 | **Go/No-Go nach Validierung V1–V7** | nach Bericht `docs/validierung.md` | M3 ff. |
| BG-11 | Freigabe des Ortskatalogs (menschliche Prüfung) | Stichprobe je Region | M4 |
| BG-12 | Marge pro Buchung | Vorschlag nach dem Preisvergleich aus M2 | M8 (Live) |
| BG-13 | Produktions-Deployment und erste echte Buchung | nach Go-Live-Checkliste | M10 |
| BG-14 | Ops-Watchdog: eigene Instanz oder firmenweiter `fi-ops` | eigene Instanz `reiseplaner-ops`, später zusammenführen | M9 |
| BG-15 | fi-deck-Workflows um einen Repo-Parameter erweitern | ja, kleiner fi-deck-Task; bis dahin manuelle Gates | alle Slices (Komfort, nicht blockierend) |
| BG-16 | Operator-Sitzung für Repo, CI, Toolchain-Image | vor M1 einplanen | M1 |
| BG-17 | Aufbewahrungsfristen Gastdaten, Rolle von LiteAPI/Nuitée im Datenschutz | 90 Tage vorläufig; Anwalt | M9 |
| BG-18 | Verifikation der Competitor-Baseline (Maximum-Messlatte) | Recherche vor M5, danach Codex-Review des One-Pagers | M5 |
| BG-19 | Zielwert der Skill-Evals | 90 % | M4, M7 |

## 4. Meilensteine

### M1 Grundgerüst (Walking Skeleton)

**Ziel:** Ein dünner, echt laufender Pfad Browser → Worker → Datenbank → zurück. Dazu CI, hermetische Tests, Toolchain-Image und die Protokoll-Dokumente.
**Voraussetzungen:** ⛔ BG-01 (Slug), ⛔ BG-16 (Operator-Sitzung).

**O1.1 Repository und Schutz** (Operator-Lane)
- [ ] Repository `fischermann-intelligence/reiseplaner` (privat) anlegen; Branch-Schutz für `main`: keine Direkt-Pushes, Pflicht-Checks `ci`, Codex-Review aktivieren (Runbook `fi-deck/docs/runbooks/codex-pr-review-gate.md` §1).
  - Wiring: GitHub-Einstellungen → PR-Gate → alle späteren Slices.
  - Demo: `gh api repos/fischermann-intelligence/reiseplaner/branches/main/protection` → Antwort enthält `required_status_checks` mit `ci`.
  - STATUS: „Repository und Branch-Schutz“ → `demonstrated`.

**O1.2 Ausführungssteuernde Dateien** (Operator-Lane, weil Fleet-Worker diese Dateien nicht ändern dürfen)
- [ ] `package.json` (Workspaces, alle Skripte aus `CLAUDE.md`), vollständige Abhängigkeiten nach `architektur.md` 14.3, `package-lock.json`; `tsconfig.base.json` aus fi-deck; `supply-chain-policy.json` und `scripts/supply-chain-check.mjs` (aus fi-deck portiert, Rebuild-Allowlist `esbuild`, `workerd`); `.githooks/pre-commit` und `.gitleaks.toml` (aus Frontlift); `.github/workflows/ci.yml` (Actions per SHA gepinnt, `persist-credentials: false`, Supply-Chain-Prüfung, `npm ci --ignore-scripts`, Rebuild, Typecheck, Tests, Build, Claims-Prüfung, „Baum unverändert“, gitleaks; zusätzlicher Job mit Postgres-17-Dienstcontainer); `.gitignore` (`.dev.vars`, `.data/`, `dogfood-results/`); `.dev.vars.example`.
  - ⟂ drift (2026-09-27): In der autonomen Sitzung selbst angelegt (ohne Operator). `.npmrc` mit `legacy-peer-deps=true` wegen npm-10.9-Absturz; `overrides` für genau eine `vite`/`zod`-Version; Werkzeugversionen siehe `HANDOFF.md` §3. Postgres-17-Dienstcontainer-Job noch nicht angelegt.
  - Wiring: `ci.yml` → PR-Gate aus O1.1.
  - Demo: `npm ci --ignore-scripts && node scripts/supply-chain-check.mjs --rebuild && npm run typecheck` → Exit 0.
  - STATUS: „CI-Grundgate“ → `demonstrated` nach dem ersten grünen CI-Lauf auf einem PR.

**O1.3 Toolchain-Image** (Operator-Lane)
- [ ] `toolchain/Dockerfile` und `toolchain/versions.lock`: Node 22 mit gepinntem Digest, `npm ci --ignore-scripts`, Rebuild der Allowlist, Playwright-Chromium; lokal bauen und in fi-deck als erlaubtes Projekt-Image hinterlegen.
  - ⟂ drift (2026-09-27): Dockerfile geschrieben, aber nicht gebaut (kein Docker-Daemon, Docker Hub gesperrt); Digest pinnt der Operator.
  - Wiring: fi-deck-Fleet → Job-Container → `npm test`.
  - Demo: `docker run --rm --network none <image> npm test` → Exit 0. Das beweist, dass die Tests ohne Netzwerk laufen.
  - STATUS: „Toolchain-Image (Fleet)“ → `demonstrated`.

**S1.1 Produktkonfiguration** (Fleet-Lane)
- [x] `product.config.yaml` mit Arbeitswerten; `packages/config` mit zod-Schema, Loader zur Build-Zeit und generiertem Modul für Worker und SPA. (1bd5bdd, 2026-09-27)
  - Wiring: Build → `@reiseplaner/config` → Health-Endpunkt (`product`) und Seitentitel der SPA.
  - Demo: `npm run demo -- s1.1` → druckt die geprüfte Konfiguration (`"slug":"reiseplaner"`, `"currency":"EUR"` …); mit `--config test/fixtures/broken.yaml` → Exit 1 mit zod-Fehlerpfad.
  - STATUS: „Produktkonfiguration“ → `demonstrated`.

**S1.2 Datenbank-Harness und RLS-Grundlinie** (Fleet-Lane)
- [x] `packages/db`: postgres.js-Client (Pool-Größe 1 in Tests), Migrations-Runner für `supabase/migrations/*.sql`, lokaler Server `npm run db:local` (`pglite-socket` auf `127.0.0.1:54329`, Daten in `.data/pglite`), Global-Setup für Tests (frische In-Memory-Instanz, Migrationen, pgTAP). (110dc55, 2026-09-27)
- [x] Migration `20261001a_init.sql` mit `_VERIFY.sql.notrun`: Schema `app`, Rollen `app_rw` und `app_import`, Rollen `anon` und `authenticated` (in Tests angelegt, falls nicht vorhanden), Tabelle `app.meta_kv` für den Health-Check, RLS aktiv, Policies nur für `app_rw`. (110dc55, 2026-09-27)
- [x] pgTAP-Test `supabase/tests/rls_baseline.sql`: `anon` und `authenticated` lesen und schreiben nichts; `app_rw` darf beides. (110dc55, 2026-09-27)
  - Wiring: `npm test` → Global-Setup → Migrations-Runner → pgTAP; `npm run db:local` → Hyperdrive `localConnectionString` → Worker (S1.3).
  - Demo: `npm run db:test` → TAP-Ausgabe, alle Zusicherungen `ok`, Exit 0.
  - STATUS: „DB-Harness und RLS-Grundlinie“ → `demonstrated`.

**S1.3 Worker-Skelett** (Fleet-Lane)
- [x] `packages/worker`: Hono-App mit Middleware (Security-Header, Body-Limit 16 KB), `GET /api/v1/health` (DB-Ping über Hyperdrive, Git-SHA, Produkt-Slug), `GET /api/v1/meta/config` (`app_env`, `providers_mode`); `wrangler.jsonc` mit Platzhaltern, Assets-Binding, Hyperdrive-Binding (lokal auf PGlite); Provider-Ports in `packages/providers` mit leeren Fakes und Auswahl über `PROVIDERS_MODE`. (8b65237, 2026-09-27)
  - ⟂ drift (2026-09-27): `compatibility_date` genau `2026-08-04`, weil der workerd des Vitest-Pools höchstens `2026-08-22` kennt.
- [x] Tests in `@cloudflare/vitest-pool-workers`: Health mit PGlite (Global-Setup liefert den Port), Datenbank weg → 503. (8b65237, 2026-09-27)
  - Wiring: `wrangler.jsonc` `main` → `index.ts` → Health-Route → Konsumenten: SPA (S1.4), Ops-Worker (S9.4), Deploy-Smoke (S10.1).
  - Demo: `npm run dev` im Hintergrund, dann `npm run demo -- s1.3` → `{"status":"ok","db":"ok","version":"<sha>","product":"reiseplaner"}`; bei gestopptem `db:local` → HTTP 503 mit `{"status":"degraded","db":"down"}`.
  - STATUS: „Health-Endpunkt“ → `demonstrated`.

**S1.4 SPA-Skelett und erster Walkthrough** (Fleet-Lane)
- [x] `packages/ui` (Catalyst aus `frontlift/ui-kit/catalyst`), `packages/web` (React 19, Router, Tailwind 4, `src/i18n/de.ts`); Startseite mit Statuszeile „API: ok · Datenbank: ok“ bzw. verständlicher Fehlermeldung; Fußzeile mit Platzhalter-Links zu den Pflichtseiten. (c39c027, 2026-09-27)
  - ⟂ drift (2026-09-27): `frontlift/ui-kit/catalyst` nicht erreichbar; eigene Komponenten im Catalyst-Stil in `packages/ui`, austauschbar ohne Seitenänderung.
- [x] Walkthrough-Harness `e2e/dogfood/`: Playwright gegen `npm run dev`, ohne Test-Overrides, mit Wegwerf-Datenverzeichnis; liest das gerenderte DOM und schreibt `dogfood-results/<run>/report.md` mit Screenshots. Modus R „erster Besuch“. (c39c027, 2026-09-27)
- [x] `npm run check:claims` mit der Verbotsliste aus `product.config.yaml`. (c39c027, 2026-09-27)
  - Wiring: Browser → Assets-Binding → SPA → `GET /api/v1/health`.
  - Demo: `npm run dogfood -- --mode R` → Report enthält im Body-Text „API: ok · Datenbank: ok“, Screenshot `01-start.png`.
  - STATUS: „Startseite (Skelett)“ → `live-verified` nach gelesenem Report; Kopie nach `docs/demos/S1.4/`.

**S1.5 Protokoll-Artefakte** (Fleet-Lane)
- [x] `STATUS.md` mit einer Zeile je Slice dieses Plans (`spec'd`); `HANDOFF.md` mit Frontier; Runbooks `docs/runbooks/lokale-entwicklung.md`, `secrets.md`, `walkthrough.md`; Prüfskript `scripts/check-status-rows.mjs`. (a7b9428, 2026-09-27)
  - Wiring: Verify-Slice Check 3 → `STATUS.md`; CI → `check-status-rows`.
  - Demo: `node scripts/check-status-rows.mjs` → „alle Slice-IDs aus umsetzungsplan.md haben genau eine STATUS-Zeile“, Exit 0.
  - STATUS: „Protokoll-Artefakte“ → `demonstrated`.

**Abnahme M1:**
1. CI grün auf `main`, gitleaks sauber, Baum nach Build und Test unverändert.
2. `docker run --network none <toolchain-image> npm test` grün.
3. Demos S1.1 bis S1.3 und S1.5 wie angegeben; S1.4 `live-verified` mit Report unter `docs/demos/S1.4/`.
4. pgTAP beweist „anon = 0“.

**Rollback:** Repository archivieren. Außer GitHub wurden keine externen Ressourcen angelegt.

---

### M2 Anbieter-Adapter und Validierung (Go/No-Go)

**Ziel:** Echte Anbindung von LiteAPI (Sandbox) und openrouteservice, Messung der K.-o.-Kriterien V1 bis V7 aus `konzept.md` Abschnitt 13, Entscheidung.
**Voraussetzungen:** ⛔ BG-05 (LiteAPI Sandbox), ⛔ BG-06 (HeiGIT-Schlüssel).

**O2.1 Konten und Secrets** (Operator-Lane)
- [ ] LiteAPI-Sandbox-Schlüssel und HeiGIT-Schlüssel in Bitwarden (`reiseplaner/liteapi-sandbox`, `reiseplaner/heigit-ors`), lokal in `.dev.vars`.
  - Demo: `npm run cli -- secrets check` → „liteapi: gesetzt, ors: gesetzt“ (ohne Werte).
  - STATUS: „Sandbox-Zugänge“ → `demonstrated`.

**O2.2 Fixtures aufzeichnen** (Operator-Lane, braucht Netzwerk)
- [ ] `npm run cli -- record-fixture` für Tarife (3 Orte × 2 Termine), Hoteldetails, Rezensionen mit und ohne Sentiment, Facilities, Referenzpreis, Prebook/Book/Cancel (Sandbox) und ORS-Matrix. Personenbezogene Felder werden beim Speichern entfernt. Ablage `packages/providers/fixtures/`.
  - Demo: `npm run cli -- fixtures verify` → alle Fixtures parsen gegen die zod-Schemas, keine E-Mail-Adressen oder Namen gefunden.
  - STATUS: „Anbieter-Fixtures“ → `demonstrated`.

**S2.1 Provider-Ports und Fakes** (Fleet-Lane)
- [x] Typisierte Ports `LiteApiPort`, `RoutingPort`, `LlmPort`, `MailPort`; Fakes lesen die Fixtures und erlauben Fehlerinjektion (429, 5xx, Timeout, fehlerhafte Antwort). (c0c6d78, 2026-09-27)
  - ⟂ drift (2026-09-27): Ohne Sandbox gibt es keine aufgezeichneten Fixtures (O2.2 blockiert). Die Fakes simulieren die Anbieter auf HTTP-Ebene mit einer deterministischen synthetischen Welt; `packages/providers/fixtures/` enthält synthetische Beispiele, die gegen die zod-Schemas geprüft werden. `LlmPort` kam mit S3.2 (169e31b).
  - Wiring: `PROVIDERS_MODE` → Factory in `packages/providers` → Worker-Kontext → Konsumenten ab S2.2.
  - Demo: `npm run demo -- s2.1` → Fake-Tarife für Oberstdorf liefern die Anzahl Hotels aus der Fixture; mit `--inject 429` → zwei Wiederholungen, dann Erfolg.
  - STATUS: „Provider-Ports und Fakes“ → `demonstrated`.

**S2.2 LiteAPI-Client** (Fleet-Lane; Live-Aufrufe nur durch den Operator)
- [x] Client für alle Endpunkte aus `architektur.md` 8.1 mit zod-geprüften Antworten, Wiederholungen und Zählung in `provider_usage`; Migration `20261002a_usage_budgets.sql` mit `provider_usage`, `budget_ledger`, `budget_reserve`, `budget_settle`, `look_to_book_ratio` und pgTAP-Tests für die RPCs (atomar, fail-closed). (bd6d854, 2026-09-27)
  - ⟂ drift (2026-09-27): `look_to_book_ratio` braucht `app.bookings` und folgt mit `20261008a_bookings`; `rate_limits` und `increment_rate_limit` liegen schon in `20261002a` (statt `20261004a`), weil das ORS-Minutenkontingent in S2.3 sie braucht.
- [ ] Contract-Abgleich mit der aktuellen Doku (Felder für Rating, Bewertungsanzahl, Steuern, Stornobedingungen; Form der Marge; Regeln zum Suggested Selling Price; Abgleich unterbrochener Zahlungen). Abweichungen als `⟂ drift` annotieren.
  - ⟂ drift (2026-09-27): offen. Die LiteAPI-Dokumentation war aus der Sitzung nicht erreichbar; Schemas in `packages/providers/src/liteapi/schemas.ts` folgen `architektur.md` 8.1 und sind als ungeprüft markiert. Abgleich mit Sandbox-Schlüssel (BG-05).
  - Wiring: Port-Factory → `LiteApiClient` → Konsumenten: Validierungs-CLI (S2.5), SearchWorkflow (S5.3), Buchung (S8.2).
  - Demo (Fake): `npm run demo -- s2.2` → normalisiertes Beispielangebot; Demo (Sandbox, Operator): `npm run cli -- liteapi smoke --place oberstdorf --checkin 2026-10-02 --nights 2` → Anzahl Hotels und ein Beispielangebot.
  - STATUS: „LiteAPI-Client“ → `demonstrated`.

**S2.3 openrouteservice-Client und Fahrzeit-Cache** (Fleet-Lane)
- [x] Client für die Matrix auf `api.heigit.org` mit Blockbildung, Minuten- und Tageskontingent über `budget_ledger` (`ors_calls`), Luftlinien-Fallback; Migration `20261002b_travel_time_cache.sql`. (d09dba9, 2026-09-27)
  - Wiring: Port-Factory → `OrsClient` → Konsument: Vorschläge (S4.2).
  - Demo: `npm run cli -- ors matrix --from 48.78,9.18 --to 47.41,10.28 47.57,10.70` → zwei Fahrzeiten in Minuten; zweiter identischer Aufruf → 0 neue ORS-Anfragen laut `provider_usage`.
  - STATUS: „ORS-Client und Cache“ → `demonstrated`.

**S2.4 Zahlungs-Testseite** (Fleet-Lane baut, Operator führt aus)
- [ ] Seite `/dev/payment-test` (nur bei `APP_ENV=dev`): Prebook mit `usePaymentSdk`, SDK im Sandbox-Modus, Rückkehrseite, Book, Stornierung.
  - ⟂ drift (2026-09-27): zurückgestellt: Das Zahlungs-SDK braucht ein Sandbox-Konto (BG-05). Die Buchungsstrecke in M8 nutzt bis dahin eine simulierte Zahlung im Fake-Modus.
  - Wiring: Browser → Testseite → LiteAPI-Client (S2.2).
  - Demo (Operator, Testkarte): einmal vollständig durchlaufen; Protokoll mit IDs (ohne Kartendaten) in `docs/demos/S2.4/`. Beantwortet V1 (Vorkasse ja oder nein).
  - STATUS: „Sandbox-Buchung (Testseite)“ → `demonstrated`.

**S2.5 Validierungsbericht** (Fleet-Lane baut, Operator führt aus)
- [ ] `npm run cli -- validate --scenario allgaeu-5x4`: Trefferzahlen je Kombination, Antwortzeiten (Median, P95), Anteil mit Rating, Rezensionen und Sentiment, Preisvergleich über den Referenzpreis, Vergleich mit den Booking-Zahlen aus `validation/booking_counts.csv` (von Hand gepflegt), Anfragen je Nutzersuche nach Cache; Checkliste für V1, V4, V6 und V7 mit Antwortfeldern; ORS-Bedingungen.
  - ⟂ drift (2026-09-27): zurückgestellt: Messwerte gibt es nur mit Sandbox-Zugang (BG-05, BG-06). BG-10 ist damit offen; M3 ff. wurden im Fake-Modus trotzdem gebaut (siehe `HANDOFF.md` §2).
  - Wiring: CLI → Clients aus S2.2 und S2.3 → `docs/validierung.md`.
  - Demo: Lauf im Sandbox-Modus → `docs/validierung.md` enthält alle Abschnitte V1 bis V7 mit Messwerten oder ausgefüllter Checkliste.
  - STATUS: „Validierungsbericht“ → `demonstrated`.

**⛔ BG-10 Go/No-Go:** Entscheidung auf Basis von `docs/validierung.md`, festgehalten in `HANDOFF.md`. Bei No-Go endet die Umsetzung hier, und die Datenstrategie wird neu bewertet.

**Abnahme M2:** alle Fake-Tests grün; Sandbox-Demos dokumentiert; Bericht vollständig; Entscheidung BG-10 liegt vor.
**Rollback:** Sandbox-Schlüssel widerrufen; Fixtures bleiben als Testdaten.

---

### M3 Ortsdaten und Katalog

**Ziel:** Ortsdatenbank aus GeoNames und geprüfter Katalog für DE, AT, CH und Südtirol in der Datenbank; Skill-Infrastruktur im Firmenformat.
**Voraussetzungen:** BG-10 = Go; ⛔ BG-07 (Anthropic-Workspace).

**O3.1 GeoNames-Rohdaten** (Operator-Lane)
- [ ] Länder-Exporte `DE`, `AT`, `CH`, `IT` und Postleitzahlen-Exporte laden; Prüfsummen, Abrufdatum und Lizenz in `data/geonames/README.md`. Die Rohdaten kommen nicht ins Repo.
  - ⟂ drift (2026-09-27): `download.geonames.org` war aus der Sitzung nicht erreichbar. Stattdessen liegt ein Entwicklungsauszug (Orte ab 1.000 Einwohnern aus dem npm-Paket `all-the-cities`, GeoNames-Daten unter CC BY 4.0, echte geonameids und Koordinaten) mit Prüfsumme in `data/geonames/dev-extract/`; ohne Postleitzahlen. Die Rohdaten-Exporte lädt der Operator.
  - Demo: `sha256sum -c data/geonames/SHA256SUMS` → alle `OK`.
  - STATUS: „GeoNames-Rohdaten“ → `demonstrated`.

**S3.1 Ortsdatenbank** (Fleet-Lane)
- [x] Migration `20261003a_geo_localities.sql` (Trigramm-Indizes); `npm run cli -- geonames import <dir>`: TSV-Parser, nur Feature-Klasse `P`, Italien gefiltert auf die Provinz Bozen, deutsche Alternativnamen, Postleitzahlen zugeordnet; Quellenangabe in `product.config.yaml` (`attribution`). (46ecb31, 2026-09-27)
  - ⟂ drift (2026-09-27): Suche über ein Array `search_names` (Name, ASCII-Name, deutsche Alternativnamen) mit gestaffelter Bewertung, damit „Wien“ Wien vor Wiener Neustadt liefert; Postleitzahlen-Zuordnung ist gebaut, der Entwicklungsauszug enthält aber keine.
  - Wiring: CLI → `geo_localities` → Konsumenten: `/geo/localities` (S4.2), Katalog-Abgleich (S3.4).
  - Demo (mit Test-Auszug im Repo): `npm run cli -- geonames import test/fixtures/geonames-sample` → „Importiert: DE n, AT n, CH n, IT-BZ n“; `npm run cli -- geonames lookup "Oberstd"` → erster Treffer „Oberstdorf, Bayern, DE“.
  - STATUS: „Ortsdatenbank“ → `demonstrated`.

**O3.2 Skill-Eval-Workflow** (Operator-Lane, CI-Datei)
- [ ] `.github/workflows/skill-eval.yml` nach Frontlift-Vorbild: läuft bei PRs mit Änderungen unter `packages/skills/bundles/**`, Toleranz 0,02, Deckel 0,50 $ je Skill, Secret `ANTHROPIC_API_KEY_EVAL`.
  - ⟂ drift (2026-09-27): Datei angelegt (Frontlift-Vorlage nicht erreichbar); läuft immer mit dem Fake-Modell und zusätzlich echt, sobald das Secret gesetzt ist (BG-07). Ein erster PR-Lauf steht aus.
  - Demo: PR mit einer Änderung am Eval-Datensatz → Job läuft und schreibt `skill-eval-report-<id>.json`.
  - STATUS: „Skill-Eval-Gate“ → `demonstrated`.

**S3.2 Skill-Infrastruktur** (Fleet-Lane)
- [x] `packages/skills`: Bundle-Loader für Node, Build-Manifest für den Worker, Ajv-Standalone-Kompilierung, Runner nach `architektur.md` 9.1 (Kostendeckel, Budget-Hooks, erzwungener Tool-Aufruf, Ausgabeprüfung, Fallback), Telemetrie-Senke `skill_runs` (Migration `20261003b_skill_runs.sql`), Anbindung der Firmen-Eval-Engine (Port aus `frontlift/core/eval` oder Übernahme als Workspace-Paket; Entscheidung im Design-Preflight). (169e31b, 2026-09-27)
  - ⟂ drift (2026-09-27): Migration heißt `20261003c_skill_runs.sql`, weil `03b` schon den Katalog enthält (S3.5 kam zuerst). Runner und Eval-Engine sind nach dem Contract in `architektur.md` 9.1 nachgebaut (Frontlift nicht erreichbar). `claude-sonnet-5` lehnt `temperature` ab: Bundles für Sonnet 5 setzen `temperature: null`, die Preistabelle in `product.config.yaml` (`ai.models`) markiert das, der Build prüft es. Alle vier Bundles entstanden hier, weil die Demo „4 Bundles, 8 Validatoren“ verlangt; `review-verify` hat 12 von 40 Eval-Fällen (Rest in M7).
  - Wiring: `npm run skills:build` → Manifest und Validatoren → Worker-Bundle (S4.3) und CLI (S3.4); `npm run skills:eval` → Eval-Engine → `baseline.json`.
  - Demo: `npm run skills:build` → „4 Bundles, 8 Validatoren kompiliert“; `npm run skills:eval -- reiseplaner.catalog-places --fake` → Bericht mit Score und Kosten 0 $.
  - STATUS: „Skill-Infrastruktur“ → `demonstrated`.

**S3.3 Katalog-Skills** (Fleet-Lane)
- [x] Bundles `reiseplaner.catalog-regions` und `reiseplaner.catalog-places` (v1.0.0) mit je 10 Eval-Fällen (Judge-Rubrik plus deterministische Assertions: nur Themen aus dem Vokabular, keine Koordinaten, Beschreibung höchstens 160 Zeichen). (633829e, 2026-09-27)
  - Wiring: Build-Manifest → CLI-Pipeline (S3.4).
  - Demo: `npm run skills:eval -- reiseplaner.catalog-places --fake` → alle deterministischen Assertions grün.
  - STATUS: „Katalog-Skills“ → `demonstrated`.

**S3.4 Katalog-Pipeline** (Fleet-Lane baut, Operator führt die Batch-Läufe aus)
- [x] `npm run cli -- catalog generate` (Batch API) → Abgleich jedes Orts mit `geo_localities` (exakter oder Trigramm-Treffer innerhalb der Region, sonst „nicht zugeordnet“) → Validierung → Dublettenprüfung (Namensähnlichkeit und Abstand unter 3 km) → Typografie-Scrubber → YAML unter `data/catalog/` mit `verified: false` und `ai_assisted: true`. (2d3088c, 2026-09-27)
  - ⟂ drift (2026-09-27): „innerhalb der Region“ ist umgesetzt als Bundesland/Kanton aus der Modellausgabe plus Abstand höchstens `CATALOG_REGION_MAX_SPREAD_KM` (100 km) vom Median der exakten Treffer. Der echte Batch-Lauf (Operator, BG-07) steht aus; der Katalog in `data/catalog/` ist ein KI-Entwurf dieser Sitzung (49 Regionen, 307 Orte, alle zugeordnet, `verified: false`).
  - Wiring: CLI → Skills (S3.3) → Ortsdatenbank (S3.1) → YAML → Import (S3.5).
  - Demo (Fake): `npm run cli -- catalog generate --country DE --fake` → YAML für die Fake-Regionen; (Operator, echt) Lauf für alle Länder, Kosten laut `skill_runs` unter 5 $.
  - STATUS: „Katalog-Pipeline“ → `demonstrated`.

**S3.5 Katalog-Import** (Fleet-Lane)
- [x] Migration `20261003c_catalog.sql` (`themes`, `regions`, `places`, `place_themes`); `npm run cli -- catalog validate` und `catalog import` (nur `verified: true`, idempotent über `slug`); Anleitung `docs/runbooks/katalogpruefung.md`. (6feacf1, 2026-09-27)
  - ⟂ drift (2026-09-27): Migration heißt `20261003b_catalog.sql`. Lokal zeigt `CATALOG_ALLOW_DRAFTS=true` (nur `dev`/`test`) die Entwürfe; `catalog import --include-drafts` ist gegen `DATABASE_URL` gesperrt.
  - Wiring: YAML → Import → Tabellen → Konsumenten: Vorschläge (S4.2).
  - Demo: `npm run cli -- catalog import` zweimal hintereinander → gleiche Zeilenzahlen; Validator meldet 0 Fehler (Koordinaten im Landesgebiet, Themen im Vokabular, Beschreibungen höchstens 160 Zeichen, keine Dubletten).
  - STATUS: „Katalog-Import“ → `demonstrated`.

**⛔ BG-11 Katalogfreigabe:** Ben prüft stichprobenartig je Region und setzt `verified: true`. Zielumfang als Vorschlag: mindestens 30 Regionen und 200 Orte.

**Abnahme M3:** Ortsdatenbank importiert; Katalog freigegeben und importiert; Generierungskosten unter 5 $; Skill-Eval-Gate läuft.
**Rollback:** Tabellen leeren und neu importieren; YAML-Stand liegt versioniert im Repo.

---

### M4 Suchrahmen, Vorschläge und Wünsche

**Ziel:** Der Nutzer gibt den Suchrahmen ein, erhält Regions- und Ortsvorschläge, übersetzt Freitext in Chips und bestätigt die Ortsliste (F1 bis F3).
**Voraussetzungen:** Katalog importiert (M3); ⛔ BG-19 (Eval-Zielwert).

**S4.1 Fachlogik Suchrahmen** (Fleet-Lane)
- [x] `packages/domain`: `dates.ts`, `geo.ts` (Startzelle, Haversine), `themes.ts`, `chips.ts` (Zuordnung zu Ausstattungs-IDs aus der Facilities-Fixture), `suggestions.ts`; Unit-Tests für alle Regeln aus `architektur.md` 6.1 bis 6.3, darunter: Zeitfenster 01.10. bis 30.11.2026, 2 Nächte, Anreise Freitag → genau 9 Termine; 13 Termine → `too_many_dates`. (2c806ae, 2026-09-27)
  - ⟂ drift (2026-09-27): Die Ausstattungs-IDs in `chips.ts` stammen aus der simulierten Welt, weil die Facilities-Fixture fehlt (O2.2); Neuzuordnung mit Sandbox-Zugang.
  - Wiring: Konsumenten sind die API (S4.2) und die Suche (S5.2).
  - Demo: `npm run demo -- s4.1` → druckt die 9 Termine des Beispiels und die Chip-Zuordnung.
  - STATUS: „Fachlogik Suchrahmen“ → `demonstrated`.

**S4.2 API für Startort, Vorschläge und Orte** (Fleet-Lane)
- [x] Migration `20261004a_rate_limits.sql` (Tabelle und `increment_rate_limit` wörtlich aus Frontlift, pgTAP); Rate-Limit-Middleware (Binding grob, RPC verbindlich, fail-closed); Endpunkte `/geo/localities`, `/suggestions/regions`, `/suggestions/places`, `/places/search`, `/meta/config` (Chips, Themen, Limits, Kennzeichnungstexte); zod-Contracts in `packages/contracts`. (25d51e5, 2026-09-27)
  - ⟂ drift (2026-09-27): `rate_limits`/`increment_rate_limit` lagen schon in `20261002a`; `20261004a` enthält stattdessen die Ranking-Korrektur der Ortssuche (Einwohnerzahl wiegt stärker, „Münch“ → München). Nur RPC-Limit, kein CF-Rate-Limit-Binding. `GET /places/search?q=` legt keine Orte an; das geschieht erst mit `?geonameid=` beim Hinzufügen (Autovervollständigung soll keine Zeilen erzeugen).
  - Wiring: SPA-Assistent (S4.4) → Endpunkte → Fachlogik (S4.1), ORS-Client (S2.3), Katalog (S3.5), Ortsdatenbank (S3.1).
  - Demo: `npm run dev`, dann `npm run demo -- s4.2` → Autovervollständigung „Stutt“ liefert Stuttgart; Regionsvorschläge für Stuttgart, 180 min, `wandern` mit Begründungstext; das 121. Autovervollständigen innerhalb einer Stunde → 429.
  - STATUS: „API Vorschläge“ → `demonstrated`.

**S4.3 Skill `reiseplaner.wish-parse`** (Fleet-Lane)
- [x] Bundle v1.0.0 mit mindestens 30 Eval-Fällen (Treffer, Mehrfachwünsche, Unpassendes nach `unmatched`, Tippfehler, Englisch); Worker-Einbindung über den Runner (S3.2) mit Budget-Reservierung und Fallback; Endpunkt `POST /wishes/parse`. (b466784, 2026-09-27)
  - ⟂ drift (2026-09-27): 34 Eval-Fälle, im Fake-Modus 34/34; der Lauf mit echtem Modell (BG-07, Zielwert BG-19) steht aus. Typfix für Node-Importe der App in a1cdc68.
  - Wiring: SPA-Freitextfeld → `/wishes/parse` → Runner → Skill → `skill_runs`.
  - Demo: `npm run demo -- s4.3` (Fake-LLM) → `{"chips":["sauber","ruhig"],"unmatched":["Blick auf den See"]}`; mit `LLM_ENABLED=false` → Fallback-Antwort und Hinweistext; Eval-Lauf (Operator, echtes Modell) ≥ Zielwert BG-19.
  - STATUS: „Wunsch-Übersetzung“ → `demonstrated`.

**S4.4 Assistent Schritt 1 bis 3** (Fleet-Lane)
- [x] SPA: Suchrahmen mit Startort-Autovervollständigung, Live-Anzeige der Terminanzahl, Validierungsfehlern und KI-Hinweis am Freitextfeld (`AiLabel`); Regionsauswahl mit Begründungen; Ortsauswahl mit Beschreibung (gekennzeichnet), Fahrzeit, eigenen Orten und Zähler „x von 10“; Quellenangabe GeoNames in der Fußzeile. (1be3d56, 2026-09-27)
  - ⟂ drift (2026-09-27): Der Walkthrough deckte auf, dass parallele Anfragen an die lokale PGlite-Datenbank scheitern (eine Sitzung für alle Verbindungen). Ein serieller TCP-Proxy vor PGlite bedient Verbindungen nacheinander (nur lokal und in Tests). „Suche starten“ endet bis S5.4 in der Bestätigung der Ortsliste.
  - Wiring: Router → Assistent → Endpunkte aus S4.2 und S4.3 → Übergabe an „Suche starten“ (S5.4).
  - Demo: `npm run dogfood -- --mode P --flow suchrahmen` → Report zeigt: 9 Termine angezeigt, 5 Regionen mit Begründung, Ortsliste mit Fahrzeiten, KI-Hinweis sichtbar.
  - STATUS: „Assistent Suchrahmen bis Ortsliste“ → `live-verified` nach gelesenem Report.

**Abnahme M4:** F1 bis F3 aus `konzept.md` erfüllt und per Walkthrough belegt; Eval `wish-parse` ≥ Zielwert.
**Rollback:** Feature-Flag `WIZARD_ENABLED` aus; Endpunkte bleiben ohne Wirkung auf Daten.

---

### M5 Kombinationssuche

**Ziel:** Eine Suche über bis zu 120 Kombinationen läuft als Workflow, speichert normalisierte Angebote und zeigt den Fortschritt live (F4).
**Voraussetzungen:** ⛔ BG-18 (Competitor-Baseline verifiziert, One-Pager per Codex geprüft).

**S5.1 Datenmodell der Suche** (Fleet-Lane)
- [x] Migration `20261005a_search.sql`: `searches`, `search_places`, `search_combinations`, `hotels`, `offers` (Unique-Schlüssel für idempotente Schreibzugriffe), `cache_entries`; `_VERIFY`-Datei; pgTAP für RLS und Unique-Schlüssel. (d156992, 2026-09-27)
  - Wiring: Repository-Module in `packages/db` → Konsumenten S5.2 und S5.3.
  - Demo: `npm run db:test` → neue Zusicherungen `ok`.
  - STATUS: „Datenmodell Suche“ → `demonstrated`.

**S5.2 Suche anlegen und abfragen** (Fleet-Lane)
- [x] `GET /meta/altcha-challenge`; `POST /searches` (ALTCHA-Prüfung, Rate Limit, Tageskontingent `searches`, Validierung, Anlage, `SearchWorkflow.create({id})`, 202 mit Token); `GET /searches/{id}` mit Fortschritt; Token-Hashing. (ac8ee78, 2026-09-27)
  - ⟂ drift (2026-09-27): ALTCHA v2 (altcha-lib 2.5) im deterministischen Modus mit SHA-256, Zähler unter `ALTCHA_COST`; jede Lösung ist einmal gültig (Signatur über `increment_rate_limit` verbraucht). Das Tageskontingent wird in der Demo über das Ledger ausgeschöpft statt über einen Konfigurationswert 2. Die Stundengrenze gilt pro Client-Hash (`searches_per_hour`), zusätzlich `searches_per_day`.
  - Wiring: SPA (S5.4) → Endpunkte → Workflow-Binding (S5.3).
  - Demo: `npm run demo -- s5.2` → 202 mit `search_id`; Aufruf ohne gültiges ALTCHA → 400; 11. Suche derselben IP innerhalb einer Stunde → 429 mit `Retry-After`; bei erschöpftem Tageskontingent (im Demo auf 2 gesetzt) → 402 `{reason:"quota",cta:true}`.
  - STATUS: „Suche anlegen“ → `demonstrated`.

**S5.3 `SearchWorkflow`** (Fleet-Lane)
- [x] Schritte `load`, `rates-<n>` (Blöcke von 12, höchstens 6 gleichzeitig), `finalize` (vorläufig ohne Bewertung); `pricing.ts` (Normalisierung); Preis-Cache 30 Minuten; Frist 180 s; `provider_usage` und Tageskontingent `liteapi_calls`. (ac8ee78, 2026-09-27)
  - ⟂ drift (2026-09-27): postgres.js `end()` wird in Workflow-Schritten nie fertig (workerd meldet den Schritt dann als hängend); Schritte schließen die Verbindung deshalb ohne darauf zu warten. Lokal erscheinen dabei „hung“-Meldungen von workerd, die Läufe sind korrekt. „60 von 60“ endet mit den simulierten Anbieterfehlern (`FAKE_FAIL_EVERY`) teils als `partial`.
- [x] Tests mit `introspectWorkflowInstance`: vollständiger Lauf mit Fakes; Wiederholung eines Schritts erzeugt keine doppelten Angebote; injizierte 5xx-Fehler führen zu `partial`; Frist überschritten führt zu `partial`; alle fehlgeschlagen führt zu `failed`; zweite identische Suche innerhalb von 30 Minuten verursacht 0 LiteAPI-Anfragen. (ac8ee78, 2026-09-27)
  - ⟂ drift (2026-09-27): Der vollständige Lauf ist im workerd-Pool mit `introspectWorkflow` getestet; Wiederholung, 5xx, Frist, Totalausfall und Cache sind als Schritt-Tests gegen PGlite in `test-node/search-run.test.ts` belegt (schneller und deterministisch).
  - Wiring: `POST /searches` → Workflow-Binding → Schritte → Tabellen → `GET /searches/{id}`.
  - Demo: `npm run demo -- s5.3` (Fakes) → Ausgabe der Statusfolge `queued → running → done`, 60 von 60 Kombinationen, Anzahl Angebote.
  - STATUS: „Kombinationssuche (Workflow)“ → `demonstrated`.

**S5.4 Fortschrittsansicht** (Fleet-Lane)
- [x] SPA: Schaltfläche „Suche starten“ mit ALTCHA-Widget, Fortschritt „x von y Kombinationen“, Matrix-Gerüst mit Platzhaltern, die sich live füllen, Hinweis bei `partial`. (189bc68, 2026-09-27)
  - ⟂ drift (2026-09-27): Kein ALTCHA-Widget: Der Browser löst die Aufgabe mit altcha-lib (gleiches Protokoll, keine Cookies, kein Worker-Laden); Hinweistext statt Checkbox. Das Such-Token steht im URL-Fragment (`#t=`) und geht als Header `X-Search-Token` an die API.
  - Wiring: Assistent (S4.4) → `POST /searches` → Polling `GET /searches/{id}` → Ergebnisansicht (S6.3).
  - Demo: `npm run dogfood -- --mode P --flow suche` → Report zeigt den Fortschritt bis „60 von 60“ und die gefüllte Matrix.
  - STATUS: „Fortschrittsansicht“ → `live-verified` nach gelesenem Report.

**Abnahme M5:** Suche mit 5 Orten × 9 Terminen läuft mit Fakes vollständig durch; im Sandbox-Modus (Operator) in unter 120 Sekunden; Idempotenz und Fehlerpfade durch Tests belegt.
**Rollback:** Feature-Flag `SEARCH_ENABLED` aus; laufende Workflow-Instanzen per `wrangler workflows instances terminate` beenden.

---

### M6 Bewertung und Ergebnisse

**Ziel:** Filter, Qualitätsscore Stufe 1, Schnäppchen, Rangliste, Preis-Matrix, Liste und Detailansicht (F5, F6, F7, F9, F10).

**S6.1 Bewertungslogik** (Fleet-Lane)
- [x] `filters.ts`, `scoring.ts` (Stufe 1 und 2, Stufe 2 zunächst ohne Rezensionsdaten), `bargains.ts`, `ranking.ts` inklusive Matrix-Aufbau; Fixture `scoring_case_1.json` mit erwarteten Scores, Schnäppchentypen und Rangfolge; Tests für die Akzeptanzbeispiele 2 und 3 aus `konzept.md` 5.1. (a9db4cd, 2026-09-27)
  - Wiring: Workflow-Schritt `score-1` (S6.2) und Ergebnis-Endpunkt (S6.2).
  - Demo: `npm run demo -- s6.1` → Tabelle der Fixture mit Score, Schnäppchen-Begründung und Rang.
  - STATUS: „Bewertungslogik“ → `demonstrated`.

**S6.2 Ergebnis-Endpunkte** (Fleet-Lane)
- [x] Workflow-Schritt `score-1`; `GET /searches/{id}/results` (Filter und Sortierung ohne neue Suche), `GET /searches/{id}/hotels/{hotel_id}` (alle Termine, Score-Aufschlüsselung), `GET …/reference-price` (Cache 6 h, höchstens 10 pro Minute). (8e22d9d, 675c6c5, 2026-09-27)
  - ⟂ drift (2026-09-27): Der LiteAPI-Contract „Get cached public price“ ist nicht geprüft (Doku gesperrt, kein Sandbox-Schlüssel, BG-05). Der Endpunkt, Cache, Limit und Budget stehen; der Live-Adapter ruft nichts auf und antwortet `contract_unverified`, bis die Contract-Prüfung aus S2.2 ihn ergänzt. Im Fake-Modus liefert die simulierte Welt Vergleichspreise.
  - Wiring: Workflow → Tabellen → Endpunkte → SPA (S6.3).
  - Demo: `npm run demo -- s6.2` → Matrix mit 5 × 9 Zellen, Liste mit jeder Unterkunft genau einmal (Akzeptanzbeispiel 1).
  - STATUS: „Ergebnis-Endpunkte“ → `demonstrated`.

**S6.3 Ergebnisansicht** (Fleet-Lane)
- [x] SPA: Preis-Matrix (Farbstufen, leere und fehlgeschlagene Zellen erkennbar, Klick filtert die Liste), Liste mit Sortierung und Filtern, Schnäppchen-Begründungen, Detailansicht mit allen Terminen, Score-Aufschlüsselung, Referenzpreis und Stornobedingungen; Seite „So berechnen wir die Rangliste“; Zeitstempel „Preise abgerufen um …“. (a209195, 675c6c5, 2026-09-27)
  - ⟂ drift (2026-09-27): Der Referenzpreis wird je Termin auf Abruf geladen („Vergleichspreis anzeigen“) statt automatisch, weil jede Abfrage ein möglicherweise kostenpflichtiger Anbieteraufruf ist und das Limit bei 10 pro Minute liegt.
  - Wiring: Fortschrittsansicht (S5.4) → Ergebnisansicht → Detailansicht → Buchung (S8.4).
  - Demo: `npm run dogfood -- --mode P --flow ergebnisse` → Report zeigt Matrix, Liste, eine Schnäppchen-Begründung und die Detailansicht.
  - STATUS: „Ergebnisansicht“ → `live-verified` nach gelesenem Report.

**S6.4 Kalibrierung** (Fleet-Lane, mit Sandbox-Daten aus M2)
- [x] `npm run cli -- calibrate --from docs/demos/S2.5/` → Bericht `docs/demos/S6.4/kalibrierung.md` mit Verteilung der Scores und Schnäppchenquote je Typ sowie Vorschlägen für die Konstanten. Geänderte Konstanten werden erst nach Rückmeldung übernommen (Eskalation, weil `architektur.md` betroffen ist). (17473b9, 2026-09-27)
  - ⟂ drift (2026-09-27): Ohne Sandbox-Aufnahmen aus S2.5 (BG-05) misst `calibrate --search <id> | --latest` eine abgeschlossene Suche aus der Datenbank, hier in der simulierten Welt. Ergebnis: value 18,3 %, date 5,4 %, place 12,6 %, alle im Korridor; die Konstanten bleiben unverändert. Zuvor lag value bei 21,2 %, weil Preis und Bewertung in der Simulation unabhängig waren; korrigiert wurde die Simulation. Die Kalibrierung mit echten Daten bleibt offen.
  - Demo: Bericht liegt vor; Schnäppchenquote je Typ zwischen 5 und 20 % der Angebote oder begründete Abweichung.
  - STATUS: „Kalibrierung Stufe 1“ → `demonstrated`.

**Maximum-Prüfung:** Akzeptanzbeispiele 1 bis 3 aus `konzept.md` 5.1 per Walkthrough belegt. Solange Beispiele 4 und 5 fehlen, trägt die Kernfunktion in `STATUS.md` den Vermerk `demonstrated-not-maximized` mit Revisit M8.

**Abnahme M6:** F5, F6, F7, F9 und F10 erfüllt; Fixture-Tests grün; Walkthrough gelesen.
**Rollback:** Frühere Worker-Version per `wrangler rollback`; keine Datenmigration betroffen.

---

### M7 Rezensionscheck

**Ziel:** Warnhinweise aus Rezensionen, Qualitätsscore Stufe 2, Kennzeichnung als KI-gestützte Auswertung (F8).

**S7.1 Stichwortsuche** (Fleet-Lane)
- [ ] `review-lexicon.yaml` (DE, EN, FR, IT, NL; sieben Themen) und `review-keywords.ts` (Wortgrenzen, Ausschnitte ±120 Zeichen, höchstens 5 je Thema und 25 insgesamt, Namen entfernt); Tests mit Verneinungen und Mehrsprachigkeit.
  - Wiring: Workflow-Schritt `reviews-fetch` (S7.3).
  - Demo: `npm run demo -- s7.1` → für die Rezensions-Fixture die Treffer je Thema mit Ausschnitt-IDs.
  - STATUS: „Stichwortsuche Rezensionen“ → `demonstrated`.

**S7.2 Skill `reiseplaner.review-verify`** (Fleet-Lane)
- [ ] Bundle v1.0.0 mit mindestens 40 Eval-Fällen (Beschwerde, Verneinung, Vergleich, Lob, Ironie, fünf Sprachen, Schweregrade).
  - Wiring: Runner (S3.2) → Workflow-Schritt `reviews-verify` (S7.3).
  - Demo: `npm run skills:eval -- reiseplaner.review-verify --fake` grün; Operator-Lauf mit echtem Modell ≥ Zielwert BG-19.
  - STATUS: „Skill Rezensionsprüfung“ → `demonstrated`.

**S7.3 Rezensionsschritte im Workflow** (Fleet-Lane)
- [ ] Migration `20261007a_review_checks.sql`; Schritte `reviews-fetch` und `reviews-verify`; Cache 30 Tage; Budget-Reservierung mit Fallback „ungeprüft“; Score Stufe 2; `finalize` rechnet Schnäppchen und Rangliste neu.
  - Wiring: `score-1` → `reviews-fetch` → `reviews-verify` → `finalize` → Ergebnis-Endpunkte.
  - Demo: `npm run demo -- s7.3` → für das Fixture-Hotel mit Schimmel-Beschwerden: `topics: [{topic:"schimmel", confirmed_count:3, …}]`, Score sinkt gegenüber Stufe 1; mit erschöpftem Budget → Status `skipped_budget`, keine Minderung.
  - STATUS: „Rezensionscheck im Workflow“ → `demonstrated`.

**S7.4 Warnhinweise in der Oberfläche** (Fleet-Lane)
- [ ] Warnhinweise in Liste und Detailansicht mit Thema, Anzahl, Aktualität und `AiLabel` (`data-ai-provenance="ai_assisted"`); „keine Auffälligkeiten in den geprüften Rezensionen“ mit Anzahl; „Hinweis (ungeprüft)“ im Fallback.
  - Wiring: Ergebnis-Endpunkte → Ergebnisansicht (S6.3).
  - Demo: `npm run dogfood -- --mode P --flow warnungen` → Report zeigt den Schimmel-Hinweis mit KI-Kennzeichnung (Akzeptanzbeispiel 4).
  - STATUS: „Warnhinweise“ → `live-verified` nach gelesenem Report.

**Abnahme M7:** F8 erfüllt; Evals ≥ Zielwert; Kosten je Suche laut `skill_runs` im Sandbox-Lauf unter 4 Cent.
**Rollback:** `LLM_ENABLED=false` schaltet auf reine Stichwort-Hinweise um.

---

### M8 Buchung

**Ziel:** Buchung im Produkt mit dem Zahlungs-SDK von LiteAPI, Bestätigung per E-Mail, Einsicht und Stornierung (F11 bis F13).
**Voraussetzungen:** ⛔ BG-08 (Resend); für Live-Buchungen zusätzlich ⛔ BG-12 (Marge).

**S8.1 Datenmodell und Zustandsautomat** (Fleet-Lane)
- [ ] Migration `20261008a_bookings.sql` (`bookings`, `email_outbox`, `_VERIFY`); `booking-state.ts` mit allen Übergängen aus `architektur.md` 6.11; Tests für jeden erlaubten und jeden verbotenen Übergang; Nebenläufigkeitstest „zwei gleichzeitige `complete`“ in der Postgres-Spur der CI.
  - Wiring: Repository `bookings` → Endpunkte (S8.2).
  - Demo: `npm run demo -- s8.1` → Tabelle aller Übergänge mit erlaubt/verboten.
  - STATUS: „Buchungs-Zustandsautomat“ → `demonstrated`.

**S8.2 Buchungs-Endpunkte und Tokens** (Fleet-Lane)
- [ ] `POST /bookings` (Prebook mit `usePaymentSdk`, Preisänderung erkennen), `POST /bookings/{ref}/confirm-price`, `POST /bookings/{ref}/complete` (idempotent, `SELECT … FOR UPDATE`), `GET /bookings/{ref}`, `POST /bookings/{ref}/cancel` (mit `dry_run`), `POST /bookings/access-link` (immer 202); HMAC-Tokens mit Web Crypto; Buchungsnummern in Crockford-Base32.
  - Wiring: SPA-Buchungsablauf (S8.4) → Endpunkte → LiteAPI-Client (S2.2) → `bookings` → Outbox (S8.3).
  - Demo: `npm run demo -- s8.2` (Fakes) → Ablauf `draft → prebooked → booking → confirmed → cancelled`; doppelter `complete` liefert denselben Stand; `complete` mit fremdem Token → 403.
  - STATUS: „Buchungs-Endpunkte“ → `demonstrated`.

**S8.3 E-Mail** (Fleet-Lane)
- [ ] `MailPort` mit Resend-Adapter und Fake (schreibt nur in die Outbox); Vorlagen als typisierte TypeScript-Funktionen mit HTML- und Textfassung (Bestätigung mit Hotel-Bestätigungsnummer und Vertragspartner, Stornierung, Zugangslink, Bewertungseinladung); Cron `outbox-retry` (höchstens 5 Versuche); Claims-Prüfung erfasst die Vorlagen.
  - Wiring: Endpunkte (S8.2) → Outbox → sofortiger Versand, sonst Cron → Resend.
  - Demo: `npm run demo -- s8.3` → gerenderte Bestätigungs-E-Mail als Text; Fake-Versandfehler → Versuch 2 durch den Cron (per `createScheduledController` im Test ausgelöst).
  - STATUS: „E-Mail-Versand“ → `demonstrated`.

**S8.4 Buchungsablauf in der Oberfläche** (Fleet-Lane)
- [ ] SPA: Gastformular, Pflicht-Checkboxen (AGB und Vermittlerrolle; kein Widerrufsrecht bei Beherbergung zu festem Termin), Hinweis auf vor Ort zu zahlende Beträge, Preisänderungsdialog, Zahlungsseite mit SDK, Rückkehrseite mit `complete`, Bestätigungsseite mit Hotel-Bestätigungsnummer, Buchungsansicht mit Stornierung (Kostenvorschau per `dry_run`); CSP-Domains des SDK ermitteln und in die Security-Header aufnehmen.
  - Wiring: Detailansicht (S6.3) → Buchungsablauf → Endpunkte (S8.2).
  - Demo: `npm run dogfood -- --mode P --flow buchung` (Fakes, SDK-Stub) → Report zeigt Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer.
  - STATUS: „Buchungsablauf“ → `live-verified` nach gelesenem Report.

**O8.1 Sandbox-Buchung Ende zu Ende** (Operator-Lane)
- [ ] Mit `PROVIDERS_MODE=sandbox`: Suche → Ergebnis → Buchung mit Testkarte → E-Mail an Testadresse → Stornierung. Protokoll ohne Kartendaten in `docs/demos/O8.1/`.
  - STATUS: „Buchung Sandbox Ende zu Ende“ → `live-verified`.

**Maximum-Prüfung:** Akzeptanzbeispiele 4 und 5 aus `konzept.md` 5.1 belegt → Kernfunktion in `STATUS.md` auf `maximized`, sofern die Beispiele 1 bis 3 aus M6 weiterhin gelten.

**Abnahme M8:** F11 bis F13 erfüllt; Sandbox-Buchung Ende zu Ende belegt; Idempotenz und Nebenläufigkeit durch Tests belegt.
**Rollback:** Feature-Flag `BOOKING_ENABLED` aus; die Detailansicht zeigt dann „Buchung vorübergehend nicht verfügbar“.

---

### M9 Vertrauen, Recht und Schutz

**Ziel:** Pflichtseiten, Transparenz, KI-Kennzeichnung überall, Wartungsjobs, Wächter und Watchdog (F14; `konzept.md` Abschnitt 7).
**Voraussetzungen:** ⛔ BG-02 (Betreiber, Rechtstexte), ⛔ BG-14 (Watchdog), ⛔ BG-17 (Fristen).

**S9.1 Pflicht- und Transparenzseiten** (Fleet-Lane)
- [ ] Impressum, AGB, Datenschutzerklärung und Kontakt als klar markierte Platzhalter mit allen Pflichtabschnitten (Inhalte aus `product.config.yaml` und vom Anwalt); „So funktioniert's“ (Datenquelle, Vermittlerrolle, Zahlung, Ranking-Kriterien, Einsatz von KI, Quellenangaben GeoNames und OpenStreetMap); Prüfung, dass jede KI-Fläche `AiLabel` trägt (Test über alle Seiten nach `data-ai-provenance`).
  - Wiring: Fußzeile jeder Seite → Pflichtseiten.
  - Demo: `npm run dogfood -- --mode R --flow pflichtseiten` → Report zeigt von drei verschiedenen Seiten aus erreichbare Pflichtseiten.
  - STATUS: „Pflicht- und Transparenzseiten“ → `live-verified` (Inhalte bleiben Platzhalter bis BG-02).

**S9.2 Wartungsjobs und Wächter** (Fleet-Lane)
- [ ] Cron `daily`: Aufbewahrungsfristen, Bewertungseinladungen, Such-zu-Buchungs-Wächter mit automatischer Drosselung, Budget-Warnungen ab 80 %; Cron `cache-cleanup`; Heartbeats an den Ops-Worker; `npm run cli -- cost-report --days 7`.
  - Wiring: Cron Triggers → Handler → Tabellen, Outbox, Ops-Heartbeat.
  - Demo: `npm run demo -- s9.2` → simulierter Tag mit 40.000 Tarifanfragen und 8 Buchungen (5.000 : 1) → Alarm-E-Mail in der Outbox, `SEARCH_MAX_COMBINATIONS` für neue Suchen gesenkt.
  - STATUS: „Wartungsjobs und Wächter“ → `demonstrated`.

**S9.3 Härtung** (Fleet-Lane)
- [ ] Finale Security-Header und CSP, ALTCHA auch bei `access-link`, alle Rate Limits aus `architektur.md` 11.1, maskierte Logs; Test, dass keine Antwort und kein Log Tokens oder vollständige E-Mail-Adressen enthält.
  - Wiring: Middleware → alle Routen.
  - Demo: `npm run demo -- s9.3` → Header-Liste der Startseite und einer API-Antwort; Log-Stichprobe ohne Klartext-E-Mails.
  - STATUS: „Härtung“ → `demonstrated`.

**S9.4 Ops-Worker `reiseplaner-ops`** (Fleet-Lane)
- [ ] `packages/ops-worker` nach dem Muster `frontlift/infra/cf-ops-worker`: Cron alle 15 Minuten, Prüfung von `/api/v1/health` und der Heartbeats (Alter der Cron-Läufe, letzter erfolgreicher Workflow), Alarm-Zustandsmaschine mit 4 Stunden Abkühlzeit und sofortigem „wieder in Ordnung“, Versand über Resend, KV für Zustände.
  - Wiring: Cron → Ops-Worker → Health-Endpunkt (S1.3) und Heartbeats (S9.2) → Resend.
  - Demo: `npm run demo -- s9.4` (Test mit `createScheduledController`) → Health liefert 503 → Alarm „kritisch“; zweiter Lauf innerhalb von 4 Stunden → kein zweiter Alarm; Health wieder 200 → Meldung „wieder in Ordnung“.
  - STATUS: „Ops-Watchdog“ → `demonstrated` (`live-verified` erst in M10 mit echtem Alarm-Test).

**Abnahme M9:** F14 erfüllt; alle KI-Flächen gekennzeichnet; Claims-Prüfung grün; Wächter und Watchdog durch Tests belegt.
**Rollback:** Einzelne Cron-Jobs lassen sich über `wrangler.jsonc` entfernen; der Ops-Worker ist eine eigene Deploy-Einheit.

---

### M10 Deployment und Go-Live

**Ziel:** Staging und Produktion eingerichtet, Deploy-Pipeline mit Freigaben, erste echte Buchung.
**Voraussetzungen:** ⛔ BG-03, ⛔ BG-04, ⛔ BG-09, ⛔ BG-02 und ⛔ BG-17 (Rechtstexte final), ⛔ BG-12 (Marge), ⛔ BG-13 (Go-Live).

**O10.1 Infrastruktur** (Operator-Lane)
- [ ] Cloudflare: Workers Paid, Hyperdrive-Konfiguration `reiseplaner-db` mit abgeschaltetem Caching, Rate-Limit-Binding, Worker-Secrets aus Bitwarden, Ops-Worker mit KV. Supabase: Produktionsprojekt in der Pro-Organisation (Frankfurt), Staging-Projekt in der Free-Organisation, Passwörter der Rollen `app_rw` und `app_import`. Resend: Domain verifizieren (SPF, DKIM, DMARC). Domain und DNS bei Cloudflare.
  - Demo: `npm run cli -- infra check --env staging` und `--env production` → alle Bindings und Secrets vorhanden (ohne Werte), Hyperdrive-Caching „disabled“.
  - STATUS: „Infrastruktur“ → `demonstrated`.

**O10.2 Deploy-Pipeline** (Operator-Lane, CI-Datei)
- [ ] `.github/workflows/deploy.yml`: Push auf `main` → Migrationen und Deploy nach Staging; Produktion nur über das Environment `production` mit manueller Freigabe; Migrationsjob vor dem Worker-Deploy; Runbooks `deploy.md`, `migration.md` (inklusive manuellem Dump), `rollback.md`.
  - Demo: Merge eines trivialen PR → Staging-Deploy grün; Produktions-Job wartet auf Freigabe.
  - STATUS: „Deploy-Pipeline“ → `demonstrated`.

**S10.1 Smoke-Tests und Go-Live-Checkliste** (Fleet-Lane)
- [ ] `npm run smoke -- --base-url <url>`: nur lesend (Health, Startseite, `/meta/config`, eine Autovervollständigung); `docs/runbooks/go-live-checkliste.md` (Rechtstexte final, Marge gesetzt, LiteAPI live, Budgets gesetzt, Watchdog aktiv, Backups aktiv, Claims-Prüfung grün, Walkthroughs gegen Staging gelesen).
  - Wiring: `deploy.yml` → Smoke nach jedem Deploy.
  - Demo: `npm run smoke -- --base-url https://<staging-domain>` → alle Prüfungen grün.
  - STATUS: „Smoke-Tests“ → `demonstrated`.

**O10.3 Staging-Durchlauf und Go-Live** (Operator-Lane)
- [ ] Walkthroughs aller Abläufe gegen Staging (Modus P, LiteAPI Sandbox) lesen; Watchdog-Alarm einmal absichtlich auslösen und empfangen; nach ⛔ BG-13 Produktions-Deploy freigeben; erste echte Buchung mit kostenloser Stornierung, danach stornieren; Bestätigungs- und Storno-E-Mail geprüft.
  - STATUS: „Go-Live“ → `live-verified`; „Ops-Watchdog“ → `live-verified`.

**Abnahme M10:** Produktion erreichbar; Smoke grün; echte Buchung und Stornierung belegt; Watchdog-Alarm empfangen; Go-Live-Checkliste vollständig abgehakt.
**Rollback:** `wrangler rollback`; `BOOKING_ENABLED=false` und `SEARCH_ENABLED=false` als Notbremse; Migrationen per Vorwärts-Korrektur.

## 5. Nach dem Go-Live

- Die Maximum-Messlatte wird zum Revisit-Termin erneut geprüft (`konzept.md` 5.1).
- Kalibrierung der Konstanten mit echten Daten (Score-Verteilung, Schnäppchenquote, Such-zu-Buchungs-Verhältnis).
- Die Kandidaten für spätere Features stehen in `konzept.md` Abschnitt 11 und `architektur.md` Abschnitt 17. Jeder bekommt einen eigenen Plan in diesem Format.

## 6. Änderungsprotokoll

| Datum | Fassung | Änderung |
|---|---|---|
| 2026-09-26 | 1 | Erster Plan auf Basis von Python/FastAPI auf eigenem Server |
| 2026-09-26 | 2 | Neufassung auf der Firmenplattform (Cloudflare, Supabase, Claude-Skills) im fi-deck-Plan-Format mit Operator- und Fleet-Lane |
