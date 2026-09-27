# HANDOFF – Frontier, offene Entscheidungen, Stolperfallen

Stand: 27.09.2026 · autonome Sitzung (Auftrag: „Arbeite autonom ohne Rückfragen … fang mit einer simplen Testwebsite an, nur lokal“).

## 1. Frontier

- **Fertig:** M1 Grundgerüst lokal (Konfiguration, DB-Harness mit pgTAP, Worker mit Health, SPA-Startseite, Walkthrough-Harness, Protokoll-Dateien). Belege unter `docs/demos/S1.*`.
- **Als Nächstes:** M2 Anbieter-Ports und Fakes (ohne Konten), dann M3–M9 im Fake-Modus. Siehe Abschnitt 2 zur Gate-Handhabung.
- **Nicht möglich in dieser Sitzung:** alles mit Konten, Schlüsseln, Geld, Deploy (Operator-Lane, siehe Abschnitt 2).

## 2. BEN-GATEs in dieser autonomen Sitzung

Ben hat ausdrücklich autonomes Arbeiten ohne Rückfragen angeordnet. Deshalb gilt in dieser Sitzung: **Reine Entscheidungs-Gates** werden mit der Default-Empfehlung aus `umsetzungsplan.md` Abschnitt 3 *vorläufig* aufgelöst und hier zur Bestätigung gelistet. **Gates mit Konten, Geld, Secrets, Deploy oder externer Wirkung** bleiben offen; die Arbeit dahinter läuft ausschließlich im Fake-Modus und ist ohne Nebenwirkungen.

| Gate | Umgang in dieser Sitzung | Bitte bestätigen / erledigen |
|---|---|---|
| BG-01 Name und Slug | Arbeits-Slug `reiseplaner`, Anzeigename „Reiseplaner“ mit Kennzeichnung „Arbeitstitel“ | Endgültigen Namen festlegen; Umbenennung nur über `product.config.yaml` |
| BG-02 Betreiber | Platzhalter „Fischermann Intelligence“ mit `confirmed: false`; alle Rechtstexte sind markierte Platzhalter | Betreiber, Anschrift, Anwalt |
| BG-03/04/09/13 Cloudflare, Supabase, Domain, Go-Live | nichts angelegt, nichts deployt | Operator-Lane |
| BG-05/06/07/08 LiteAPI, HeiGIT, Anthropic, Resend | keine Konten; alle Adapter als Fakes | Konten und Schlüssel (Bitwarden) |
| BG-10 Go/No-Go | **offen.** M3 ff. wurden trotzdem im Fake-Modus gebaut, weil das ohne Kosten und Nebenwirkungen ist; bei No-Go ist diese Arbeit verwerfbar | Validierung V1–V7 mit Sandbox-Konto |
| BG-11 Katalogfreigabe | Katalog als KI-Entwurf mit `verified: false`; lokal nur über den Entwicklungsschalter sichtbar | Stichprobe je Region, dann `verified: true` |
| BG-12 Marge | keine Marge gesetzt | Vorschlag nach Preisvergleich |
| BG-15 fi-deck-Repo-Parameter | Preflight und Verify-Slice manuell, im Commit dokumentiert | – |
| BG-16 Operator-Sitzung | Ausführungssteuernde Dateien (package.json, CI, Hooks, Toolchain) in dieser Sitzung selbst angelegt, weil ohne sie nichts läuft | Review der Operator-Dateien |
| BG-18 Competitor-Baseline | offen | Recherche vor öffentlicher Bewerbung |
| BG-19 Eval-Zielwert | 90 % als Arbeitswert | bestätigen |

## 3. Abweichungen vom Plan (⟂ drift)

1. **Firmenquellen nicht erreichbar:** `frontlift/*` und `fi-deck/*` liegen nicht in diesem Arbeitsbereich. Betroffen: Catalyst-Komponenten (eigene Minimal-Komponenten im Catalyst-Stil in `packages/ui`), `increment_rate_limit`-SQL, `demoBudget.ts`, Skill-Runner und Eval-Engine, `normalizeGermanTypography`, fi-deck-`AGENTS.md`. Alles wurde **nach den dokumentierten Contracts** in `architektur.md`/`umsetzungsplan.md` nachgebaut und ist beim ersten Zugriff gegen die Originale abzugleichen. (Verstoß gegen „nie einen Contract aus dem Gedächtnis nachbauen“ bewusst in Kauf genommen, weil Ben autonomes Arbeiten angeordnet hat.)
2. **`compatibility_date` = `2026-08-04`:** Der workerd im Vitest-Pool (`@cloudflare/vitest-pool-workers` 0.22.0) unterstützt höchstens `2026-08-22`. Der Plan nennt „ab 2026-08-04“; gewählt ist genau dieser Wert.
3. **Werkzeugversionen:** Zum Stichtag gibt es neuere Hauptversionen (TypeScript 7, Vite 8, Vitest 5, React Router 8). Verwendet werden TypeScript 5.9.3 (Plan: „5.8+“), Vite 7.3.6, Vitest 4.1.11 (Vorgabe des Workers-Pools) und React Router 7.18.4 (Plan: „React Router 7“). Alle exakt gepinnt.
4. **npm `legacy-peer-deps`:** npm 10.9 stürzt beim Auflösen der optionalen Vitest-Peers ab (`Cannot read properties of null (reading 'edgesOut')`). `.npmrc` setzt deshalb `legacy-peer-deps=true`; die benötigten Peers sind explizit deklariert. Zusätzlich `overrides` für genau eine `vite`- und `zod`-Version.
5. **postgres.js im Worker:** Mit `fetch_types: false` (Hyperdrive-Empfehlung) kennt postgres.js keine Array-Typen. Der DB-Adapter kodiert Array-Parameter selbst und registriert Parser für `text[]`, `int[]`, `float8[]` (Paritätstest gegen PGlite in `packages/db/test/drivers.test.ts`). Das Cloudflare-Socket-Polyfill von postgres.js erzeugt nach dem Schließen zwei harmlose „unhandled rejections“; die Root-Vitest-Konfiguration ignoriert genau diese zwei Meldungen.
6. **Repository:** Code liegt in `leonbdr1/Travel-planer` (Branch `claude/software-entwicklung-konzept-gv58jh`), nicht in `fischermann-intelligence/reiseplaner` (O1.1).
7. **Toolchain-Image:** Kein Docker-Daemon und kein Zugriff auf Docker Hub in der Sitzung; `toolchain/Dockerfile` ist geschrieben, aber nicht gebaut. Basis-Image ohne Digest (Operator pinnt).

## 4. Stolperfallen

- `npm run dev` startet Datenbank **und** App. Läuft bereits `npm run db:local` auf Port 54329, wird diese Datenbank genutzt.
- `packages/worker/.dev.vars` wird beim ersten `npm run dev` mit Zufallswerten erzeugt (gitignored). Für den Sandbox-Modus dort die Sandbox-Schlüssel eintragen.
- Lokale Daten liegen in `.data/pglite`. Zurücksetzen: Dev-Server stoppen, `rm -rf .data`.
- PGlite ist eine Einzelprozess-Datenbank: nie zwei Prozesse auf dasselbe Datenverzeichnis.
- Nach Änderungen an `product.config.yaml` `npm run gen` ausführen (CI prüft, dass der Baum danach unverändert ist).
- Der Worker-Name wird aus `product.config.yaml` abgeleitet (`<slug>-app`), `wrangler.jsonc` enthält nur Platzhalter.
