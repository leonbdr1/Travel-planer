# S11.14 Lokal rechnen, online erreichbar

Stand 2026-09-29. Reifegrad: `demonstrated` (lokal), Tunnel nicht geprüft.

Demo: `npm run serve -- --no-build` (baut nicht neu, nutzt `packages/web/dist/client`), danach `curl` gegen `http://127.0.0.1:8787` mit dem Passwort aus `packages/worker/.dev.vars`:

| Anfrage | Ergebnis |
|---|---|
| `/` ohne Login | 303 auf `/gate` |
| `/api/v1/meta` ohne Login | 401 |
| `/api/v1/health` ohne Login | 200 |
| Login mit falschem Passwort | 401 |
| Login mit richtigem Passwort | 303, Cookie |
| `/`, `/suche`, `/api/v1/health` mit Cookie | 200 |
| `/api/v1/geo/localities?q=Fuessen` mit Cookie | Treffer aus der lokalen Datenbank (Füssen) |
| Passwort im Konsolenlog | 0 Treffer |

Nicht geprüft: Tailscale Funnel (Konto und Freigabe in der Tailscale-Verwaltung nötig), Betrieb im Testbetrieb mit echten Schlüsseln über den Tunnel.
