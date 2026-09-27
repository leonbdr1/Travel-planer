# Runbook: Lokale Entwicklung

## Voraussetzungen

- Node.js 22 (`.nvmrc`), npm 10+
- Für Walkthroughs: Chromium für Playwright (`npx playwright install chromium`, einmalig)

## Installation

```bash
npm ci --ignore-scripts && node scripts/supply-chain-check.mjs --rebuild
```

Die Lieferkettenprüfung stellt sicher, dass alle Pakete aus der npm-Registry stammen, einen Integritäts-Hash tragen und nur `esbuild` und `workerd` Installationsskripte ausführen.

## Starten

```bash
npm run dev
```

- Startet die lokale Datenbank (PGlite, `127.0.0.1:54329`, Daten in `.data/pglite`), wendet Migrationen an und startet Vite mit dem Cloudflare-Plugin (SPA und Worker in `workerd`).
- Adresse: <http://localhost:5173>
- Alle Anbieter laufen im Modus `fake` (siehe `packages/worker/wrangler.jsonc`, `PROVIDERS_MODE`).
- Beim ersten Start entsteht `packages/worker/.dev.vars` mit zufälligen lokalen Schlüsseln.

Getrennt starten (zwei Terminals): `npm run db:local` und danach `npm run dev` – dann nutzt `dev` die bereits laufende Datenbank.

## Prüfen

```bash
npm run typecheck      # alle Pakete, strict
npm test               # hermetisch: Node, workerd, PGlite
npm run db:test        # pgTAP (RLS, RPCs, Constraints)
npm run check:claims   # verbotene Werbeaussagen
npm run check:status   # STATUS.md vollständig
npm run build          # SPA + Worker-Bundle
```

## Zurücksetzen

Dev-Server stoppen, dann `rm -rf .data packages/web/.wrangler`.

## Sandbox-Modus (Operator)

1. Sandbox-Schlüssel aus Bitwarden (`reiseplaner/liteapi-sandbox`, `reiseplaner/heigit-ors`, `reiseplaner/anthropic-dev`) in `packages/worker/.dev.vars` eintragen.
2. In `.dev.vars` `PROVIDERS_MODE=sandbox` setzen.
3. `npm run dev`.
