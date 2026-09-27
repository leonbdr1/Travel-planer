# HANDOFF – Frontier, offene Entscheidungen, Stolperfallen

Stand: 27.09.2026 · autonome Sitzung (Auftrag: „Arbeite autonom ohne Rückfragen … fang mit einer simplen Testwebsite an, nur lokal“).

## 1. Frontier

- **Fertig:** M1 Grundgerüst; M2 im Fake-Modus (Provider-Ports mit simulierten Anbietern, LiteAPI-Client, ORS-Client mit Fahrzeit-Cache, Budget- und Rate-Limit-RPCs); M3 (Ortsdatenbank aus dem GeoNames-Entwicklungsauszug, Skill-Infrastruktur mit vier Bundles, Katalog-Pipeline, Katalog-Entwurf mit 49 Regionen und 307 Orten, Import). Belege unter `docs/demos/S1.*` bis `S3.*`.
- **Fertig (M4):** Assistent Schritt 1–3 auf `/suche` mit Autovervollständigung, Terminanzahl, KI-Wunschübersetzung, Regions- und Ortsvorschlägen (Walkthrough `docs/demos/S4.4/`).
- **Fertig (M5):** Kombinationssuche als Workflow mit ALTCHA, Rate Limits, Kontingenten, Preis-Cache und Live-Matrix (`docs/demos/S5.*`).
- **Fertig (M6):** Filter, Qualitätsscore Stufe 1, Schnäppchen mit Begründung, Rangliste, Preis-Matrix, Liste, Detailansicht mit Vergleichspreis auf Abruf, Seite zur Rangliste, Kalibrierungswerkzeug (`docs/demos/S6.*`). Kernfunktion `demonstrated-not-maximized` bis M8.
- **Fertig (M7):** Rezensionscheck mit Stichwortsuche in fünf Sprachen, Skill `review-verify` (44 Evals, Fake-Modell), Workflow-Schritte `reviews-fetch`/`reviews-verify`, Score Stufe 2 und Warnhinweise mit KI-Kennzeichnung in Liste und Detailansicht (`docs/demos/S7.*`, Akzeptanzbeispiel 4).
- **Als Nächstes:** M8 Buchung, dann M9.
- **Nicht möglich in dieser Sitzung:** alles mit Konten, Schlüsseln, Geld, Deploy (Operator-Lane, siehe Abschnitt 2); dazu S2.4, S2.5 (Sandbox), O3.1 (GeoNames-Download), echte Eval- und Katalogläufe (BG-07).

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
| BG-19 Eval-Zielwert | 90 % als Arbeitswert (`SKILL_EVAL_TARGET_SCORE`) | bestätigen; echte Eval-Läufe brauchen BG-07 |
| BG-07 Anthropic | kein Schlüssel; alle Skills laufen gegen deterministische Fake-Modelle (`packages/skills/src/fake`), Kosten 0 $ | Workspace und `ANTHROPIC_API_KEY`/`ANTHROPIC_API_KEY_EVAL`; dann `npm run skills:eval` und `catalog generate` echt |

## 3. Abweichungen vom Plan (⟂ drift)

1. **Firmenquellen nicht erreichbar:** `frontlift/*` und `fi-deck/*` liegen nicht in diesem Arbeitsbereich. Betroffen: Catalyst-Komponenten (eigene Minimal-Komponenten im Catalyst-Stil in `packages/ui`), `increment_rate_limit`-SQL, `demoBudget.ts`, Skill-Runner und Eval-Engine, `normalizeGermanTypography`, fi-deck-`AGENTS.md`. Alles wurde **nach den dokumentierten Contracts** in `architektur.md`/`umsetzungsplan.md` nachgebaut und ist beim ersten Zugriff gegen die Originale abzugleichen. (Verstoß gegen „nie einen Contract aus dem Gedächtnis nachbauen“ bewusst in Kauf genommen, weil Ben autonomes Arbeiten angeordnet hat.)
2. **`compatibility_date` = `2026-08-04`:** Der workerd im Vitest-Pool (`@cloudflare/vitest-pool-workers` 0.22.0) unterstützt höchstens `2026-08-22`. Der Plan nennt „ab 2026-08-04“; gewählt ist genau dieser Wert.
3. **Werkzeugversionen:** Zum Stichtag gibt es neuere Hauptversionen (TypeScript 7, Vite 8, Vitest 5, React Router 8). Verwendet werden TypeScript 5.9.3 (Plan: „5.8+“), Vite 7.3.6, Vitest 4.1.11 (Vorgabe des Workers-Pools) und React Router 7.18.4 (Plan: „React Router 7“). Alle exakt gepinnt.
4. **npm `legacy-peer-deps`:** npm 10.9 stürzt beim Auflösen der optionalen Vitest-Peers ab (`Cannot read properties of null (reading 'edgesOut')`). `.npmrc` setzt deshalb `legacy-peer-deps=true`; die benötigten Peers sind explizit deklariert. Zusätzlich `overrides` für genau eine `vite`- und `zod`-Version.
5. **postgres.js im Worker:** Mit `fetch_types: false` (Hyperdrive-Empfehlung) kennt postgres.js keine Array-Typen. Der DB-Adapter kodiert Array-Parameter selbst und registriert Parser für `text[]`, `int[]`, `float8[]` (Paritätstest gegen PGlite in `packages/db/test/drivers.test.ts`). Das Cloudflare-Socket-Polyfill von postgres.js erzeugt nach dem Schließen zwei harmlose „unhandled rejections“; die Root-Vitest-Konfiguration ignoriert genau diese zwei Meldungen.
6. **Repository:** Code liegt in `leonbdr1/Travel-planer` (Branch `claude/software-entwicklung-konzept-gv58jh`), nicht in `fischermann-intelligence/reiseplaner` (O1.1).
7. **Toolchain-Image:** Kein Docker-Daemon und kein Zugriff auf Docker Hub in der Sitzung; `toolchain/Dockerfile` ist geschrieben, aber nicht gebaut. Basis-Image ohne Digest (Operator pinnt).
8. **LiteAPI-Contract ungeprüft:** Die LiteAPI-Dokumentation war nicht erreichbar. Client und zod-Schemas folgen `architektur.md` 8.1; Felder, Marge und Zahlungsablauf sind beim ersten Sandbox-Zugang abzugleichen (S2.2, zweite Checkbox). Die Ausstattungs-IDs der Chips (`packages/domain/src/chips.ts`) stammen aus der simulierten Welt und müssen gegen `/data/facilities` neu zugeordnet werden.
9. **Migrationsnamen:** `rate_limits` und `increment_rate_limit` liegen in `20261002a` (Plan: `20261004a`), `look_to_book_ratio` folgt mit `20261008a_bookings`, Katalog in `20261003b` und `skill_runs` in `20261003c` (Plan: umgekehrt).
10. **GeoNames:** Rohdaten-Download nicht erreichbar; Entwicklungsauszug aus dem npm-Paket `all-the-cities` (CC BY 4.0, Orte ab 1.000 Einwohnern, echte geonameids) in `data/geonames/dev-extract/`, ohne Postleitzahlen. Deutsche Namen für Südtirol und wichtige Städte in `alt-names-*.json`.
11. **Katalog-Entwurf:** Der Katalog in `data/catalog/` wurde in dieser Sitzung als KI-Entwurf geschrieben (nicht über die Batch-Pipeline, die BG-07 braucht). Koordinaten kommen ausschließlich aus dem Abgleich mit `geo_localities`; alles `verified: false` (BG-11).
12. **Sonnet 5 und `temperature`:** `claude-sonnet-5` lehnt Sampling-Parameter ab. Die Preistabelle `ai.models` in `product.config.yaml` markiert das (`sampling_params: false`), Katalog-Bundles setzen `temperature: null`, der Runner lässt den Parameter weg, der Fake-Transport antwortet wie die API mit 400, falls doch einer gesendet wird. Erzwungener Tool-Aufruf läuft mit `thinking: disabled`.
13. **Runner und Eval-Engine nachgebaut:** Frontlift-Runner und `frontlift/core/eval` waren nicht erreichbar; Nachbau nach `architektur.md` 9.1 (JSONPath-Teilmenge `$ . [n] [*] ..`, Operatoren siehe `packages/skills/src/eval/assertions.ts`). Die Judge-Rubrik läuft nur mit echtem Modell; das Judge-Modell steht in `ai.eval_judge_model`.
16. **Workflows und postgres.js:** In Workflow-Schritten wird `end()` von postgres.js nie fertig. Schritte schließen die Verbindung ohne zu warten (`dispose({ awaitClose: false })`); workerd meldet lokal je Lauf „hung“-Meldungen, die harmlos sind. In Produktion prüfen (Staging).
17. **ALTCHA ohne Widget:** Der Browser löst die Aufgabe mit `altcha-lib`; das Paket `altcha` (Widget) ist noch Abhängigkeit, wird aber nicht genutzt.
15. **Lokale Datenbank seriell:** PGlite hat eine einzige Sitzung; parallele Verbindungen über `pglite-socket` vermischen ihre Protokollnachrichten. Ein serieller TCP-Proxy (`packages/db/src/serial-proxy.ts`) bedient lokal und in Tests eine Verbindung nach der anderen. Produktion nutzt echtes Postgres über Hyperdrive.
18. **Referenzpreis ohne Live-Adapter:** Der LiteAPI-Endpunkt „Get cached public price“ ist in `architektur.md` 8.1 nur mit Namen genannt und die Doku war gesperrt. Endpunkt, Cache (6 h), Limit (10/min) und Budget stehen; `ReferencePricePort` hat einen Fake und einen Live-Adapter, der nichts aufruft und `contract_unverified` meldet. Beim ersten Sandbox-Zugang Pfad und Antwort prüfen und den Adapter ergänzen. Die SPA lädt den Vergleichspreis je Termin auf Abruf.
19. **Kalibrierung nur simuliert:** `npm run cli -- calibrate --latest` misst eine abgeschlossene Suche. In der simulierten Welt liegen alle Schnäppchentypen im Korridor 5–20 %, nachdem der Fake-Preis an die Bewertung gekoppelt wurde (vorher value 21,2 %). Die Konstanten sind unverändert; mit Sandbox-Daten neu messen.
20. **Rezensionscheck:** Ausschnitte liegen zwischen `reviews-fetch` und `reviews-verify` in `review_check_pending` und werden nach der Prüfung gelöscht (Löschjob für abgelaufene Reste folgt in M9). Ungeprüfte Ergebnisse laufen nach 24 h ab. Sauberkeitswerte der LiteAPI bleiben aus, bis V7 entschieden ist (`LITEAPI_USE_SENTIMENT`). Der echte Eval-Lauf von `review-verify` (Zielwert BG-19) und die Kostenmessung je Suche („unter 4 Cent“, Abnahme M7) brauchen BG-07 und einen Sandbox-Lauf.
14. **S2.4 und S2.5 zurückgestellt:** Beide brauchen Sandbox-Konten. BG-10 (Go/No-Go) ist offen; M3 ff. sind im Fake-Modus gebaut und bei No-Go verwerfbar.

## 4. Stolperfallen

- `npm run dev` startet Datenbank **und** App. Läuft bereits `npm run db:local` auf Port 54329, wird diese Datenbank genutzt.
- `packages/worker/.dev.vars` wird beim ersten `npm run dev` mit Zufallswerten erzeugt (gitignored). Für den Sandbox-Modus dort die Sandbox-Schlüssel eintragen.
- Lokale Daten liegen in `.data/pglite`. Zurücksetzen: Dev-Server stoppen, `rm -rf .data`.
- PGlite ist eine Einzelprozess-Datenbank: nie zwei Prozesse auf dasselbe Datenverzeichnis. Über den Port 54329 werden Verbindungen nacheinander bedient; eine offen gelassene Sitzung (z. B. `psql`) blockiert alle anderen.
- Nach Änderungen an `product.config.yaml` `npm run gen` ausführen (CI prüft, dass der Baum danach unverändert ist).
- Der Worker-Name wird aus `product.config.yaml` abgeleitet (`<slug>-app`), `wrangler.jsonc` enthält nur Platzhalter.
- Skills: Nach Änderungen an `packages/skills/bundles/**` `npm run skills:build` (läuft auch in `npm run gen`); die erzeugten Dateien in `packages/skills/src/generated/` werden committet. Prompt-Änderungen sind neue Versionen (`v1.0.1/`).
- `npm run skills:eval -- <id> --fake` prüft Bundle, Runner und Assertions ohne Kosten; der Bericht liegt in `eval-results/` (gitignored).
- `catalog generate --fake` schreibt standardmäßig nach `data/catalog/` und überspringt vorhandene Regionen; für Probeläufe `--out <verzeichnis>` angeben.
