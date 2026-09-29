# S11.13 Passwort-Schutz der Entwicklerseite

Stand 2026-09-29. Reifegrad: `demonstrated` (lokal über den echten Worker), nicht deployt.

Demo: `wrangler dev` mit einer Kopie von `packages/worker/wrangler.jsonc` (Staging-Einstellungen: `run_worker_first: true`, `SITE_GATE=password`), gebautes SPA als Assets, lokale Datenbank; `curl` gegen `http://127.0.0.1:8799`:

| Anfrage | Ergebnis |
|---|---|
| `/`, `/suche` ohne Cookie | 303 auf `/gate` |
| `/api/v1/meta` ohne Cookie | 401 |
| `/api/v1/health`, `/robots.txt` ohne Cookie | 200 |
| `/gate` | Seite mit `<h1>Reiseplaner</h1>`, Passwortfeld, `noindex` |
| Login mit falschem Passwort | 401 |
| Login mit richtigem Passwort | 303 auf `/`, Cookie gesetzt |
| `/`, `/suche` mit Cookie | 200 (SPA) |

Tests: `packages/worker/test-node/gate.test.ts` (11): aus ohne Schalter, Umleitung und 401, öffentliche Seite ohne Passwort im Text, Health und robots offen, Login und Cookie-Flags, Cookie öffnet die Seite, gefälschte, abgelaufene und alte Cookies (Passwortwechsel), Begrenzung der Fehlversuche, fail-closed bei ausgefallenem Zähler und bei fehlendem Secret, fremde Herkunft abgelehnt. Gesamtsuite 63 Dateien, 366 Tests grün.

Nicht geprüft: Deploy, `workers.dev`-Adresse, Free-Tarif-Grenzen bei echten Suchen.
