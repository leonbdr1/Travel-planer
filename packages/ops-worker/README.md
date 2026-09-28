# Watchdog `reiseplaner-ops`

Externer Wächter nach architektur.md 3.1 und 15: eigene Deploy-Einheit auf `workers.dev`, getrennt von der App, die er überwacht.

- **Cron `*/15 * * * *`:** prüft `APP_HEALTH_URL` (kritisch bei Status ≠ 200, fehlender Antwort oder Status ≠ `ok`) und das Alter der Heartbeats je Job (Warnung). Schwellen stehen in `product.config.yaml` unter `ops` (`heartbeat_max_age_min`, `alert_cooldown_hours`, `health_timeout_s`).
- **Alarm-Zustandsmaschine je Prüfung** (`src/alarm.ts`): neue Störung sofort melden, anhaltende Störung frühestens nach der Abkühlzeit (4 Stunden) erneut, Eskalation Warnung → kritisch sofort, Entwarnung sofort. Eine E-Mail je Lauf an `ops.alert_email` über Resend. Scheitert der Versand, bleibt der Zustand unverändert und der nächste Lauf versucht es erneut.
- **`POST /heartbeat/:job`** mit `Authorization: Bearer <OPS_HB_TOKEN>`: nimmt die Heartbeats der App an (`outbox-retry`, `cache-cleanup`, `daily`, `search-workflow`; Körper: flache Zusammenfassung aus Zahlen und kurzen Texten, keine personenbezogenen Daten). Höchstens ein KV-Schreibvorgang je Job und Minute.
- **`GET /status`** mit demselben Token: letzter Lauf, Zustand je Prüfung, Alter der Heartbeats.

## Bindings

| Name | Art | Inhalt |
|---|---|---|
| `OPS_KV` | KV | `hb:<job>`, `state:<prüfung>`, `meta:started`, `meta:last_run` |
| `APP_HEALTH_URL` | Var | `https://<produktions-domain>/api/v1/health` |
| `OPS_ENV` | Var | `dev` · `test` · `production` |
| `OPS_HB_TOKEN` | Secret | derselbe Wert wie im App-Worker |
| `RESEND_API_KEY` | Secret | ohne Schlüssel wird lokal nur protokolliert; in Produktion gilt das als fehlgeschlagener Versand |

In der App zeigt die Var `OPS_HEARTBEAT_URL` auf diesen Worker (ohne Pfad).

## Lokal

```bash
npx vitest run --project ops-worker          # Tests in workerd (createScheduledController)
npm run demo -- s9.4                         # echte App-Health: Datenbank stoppen, Alarm, Entwarnung
cd packages/ops-worker && npx wrangler dev --port 8788 --test-scheduled \
  --var OPS_HB_TOKEN:<lokaler-wert> --var APP_HEALTH_URL:http://localhost:5173/api/v1/health
curl "http://localhost:8788/__scheduled?cron=*/15+*+*+*+*"   # einen Lauf auslösen
```

## Deploy (M10, ⛔ Operator-Lane)

`wrangler.jsonc` enthält für `env.production` nur Platzhalter (`__REISEPLANER_OPS_WORKER_NAME__`, `__REISEPLANER_OPS_KV_ID__`, `__REISEPLANER_APP_HEALTH_URL__`), die das Deploy-Skript füllt. KV-Namespace anlegen, Secrets setzen, einmal absichtlich einen Alarm auslösen und den Empfang prüfen (O10.3).
