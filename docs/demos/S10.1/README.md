# S10.1 Smoke-Tests und Go-live-Checkliste – Belege

- `smoke-preview.txt`: `npm run smoke -- --base-url http://localhost:4184` gegen den lokalen Stack im Preview-Modus (Produktions-Build der SPA mit `_headers`, Worker in workerd, Anbieter simuliert): 7/7 Prüfungen (Health, API-Header, Startseite, Startseite-Header mit CSP, unveränderliches Asset, Meta-Konfiguration, Autovervollständigung).
- `smoke-expect-production.txt`: derselbe Stack mit `--expect-env production`: Meta-Konfiguration scheitert erwartungsgemäß (Umgebung dev, Anbieter simuliert, Zahlung Sandbox, Katalog-Entwürfe sichtbar), Exit-Code 1.
- Tests: `packages/cli/test/smoke.test.ts` (korrektes Staging, Datenbank aus, fehlender CSP-Header, Produktion mit simulierten Anbietern, nicht erreichbarer Endpunkt).
- Checkliste: `docs/runbooks/go-live-checkliste.md`.

Gegen Staging (Demo laut Plan) und die Verdrahtung in `deploy.yml` stehen aus: beides braucht Konten und Deploy (O10.1, O10.2).
