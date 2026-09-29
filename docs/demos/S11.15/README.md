# S11.15 – Passwort-Ersteinrichtung und zwei Rollen

Demo über den echten Serve-Modus (`DB_PORT=54390 REISEPLANER_DATA_DIR=<tmp> npm run serve -- --port 8790`, leere Datenbank), Aufrufe mit `curl`:

| Schritt | Ergebnis |
|---|---|
| Erster Besuch `/gate` | Formular `action="/gate/setup"` |
| Einrichtung mit zu kurzem Passwort | 400, nichts gespeichert |
| Einrichtung mit zwei gültigen Passwörtern | 303 nach `/`, Admin-Cookie |
| `/gate` danach | nur noch `action="/gate/login"` |
| Zweite Einrichtung (Fremder) | 303 nach `/gate`, nichts überschrieben |
| Falsches Passwort | 401 |
| Admin-Cookie: `/meta/config`, `/dev/settings` | `end_user_view: false`, `dev_settings: true`, 200 |
| Nutzer-Cookie: `/meta/config`, `/dev/settings` | `end_user_view: true`, `dev_settings: false`, 404 |
| Nutzer-Cookie mit selbst gesetztem Header `x-site-role: admin` | 404 (Header wird im Worker überschrieben) |
| Ohne Login `/api/v1/meta/config` | 401 |

Tests: `packages/worker/test-node/gate.test.ts` (21), `dev-settings.test.ts` (Endkunden-Ansicht); Suite grün, `npm run typecheck` und `check:claims` ok.

Nicht geprüft: die Endkunden-Ansicht im Browser (Screenshot); der Hinweisbalken entfällt per `end_user_view` in `Layout.tsx`.
