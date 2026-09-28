# Go-live-Checkliste

Vor der Freigabe der Produktion (⛔ BG-13) ist jeder Punkt abgehakt, mit Beleg (Commit, Datei oder Datum). Grundlage: `umsetzungsplan.md` M10, offene Punkte aus `HANDOFF.md`.

## Recht und Produkt

- [ ] Betreiber bestätigt (BG-02): `product.config.yaml` `operator` vollständig, `confirmed: true`.
- [ ] Rechtstexte vom Anwalt final (Impressum, AGB, Datenschutz); keine Platzhalter mehr auf den Pflichtseiten (BG-02).
- [ ] Aufbewahrungsfristen und Rolle von LiteAPI/Nuitée im Datenschutz bestätigt (BG-17); `compliance.retention` angepasst.
- [ ] Endgültiger Name und Domain (BG-01, BG-09); `name_is_working_title: false`, `domains` gesetzt.
- [ ] Marge festgelegt (BG-12).
- [ ] Katalog redaktionell geprüft, alle freigegebenen Orte mit `verified: true` (BG-11); `CATALOG_ALLOW_DRAFTS` ist in Produktion nicht gesetzt.

## Anbieter

- [ ] LiteAPI live: Konto mit hinterlegter Karte, Live-Schlüssel (BG-05). Contract-Prüfung aus S2.2 abgeschlossen: Schemas, Endpunkt „Get cached public price“, Zahlungs-SDK. O8.1 (Sandbox-Buchung Ende zu Ende) belegt.
- [ ] CSP-Domains des Zahlungs-SDK in `spaContentSecurityPolicy` (`packages/worker/src/http/security-headers.ts`) ergänzt und `packages/web/public/_headers` neu erzeugt (der Test `hardening.test.ts` erzwingt den Gleichstand); Buchungs-Walkthrough gegen Staging ohne CSP-Fehler.
- [ ] Resend: Domain verifiziert (SPF, DKIM, DMARC), Absender `mail.from_address`, Alarmempfänger `ops.alert_email` erreichbar (BG-08).
- [ ] Anthropic: Workspace und Budget (BG-07); echte Eval-Läufe aller Skills mindestens auf dem Zielwert (BG-19).
- [ ] openrouteservice-Schlüssel (BG-06); GeoNames-Vollimport statt Entwicklungsauszug (O3.1).

## Infrastruktur und Schutz

- [ ] Hyperdrive `reiseplaner-db` mit abgeschaltetem Caching; Supabase-Produktion in Frankfurt mit täglichen Backups (BG-04).
- [ ] Secrets aus Bitwarden per `wrangler secret put`: `LITEAPI_API_KEY`, `ANTHROPIC_API_KEY`, `ORS_API_KEY`, `RESEND_API_KEY`, `SIGNING_KEY`, `IP_HASH_SALT`, `ALTCHA_HMAC_KEY`, `OPS_HB_TOKEN` (O10.1).
- [ ] Grobes Rate Limit: `env.production.ratelimits` in `packages/worker/wrangler.jsonc` mit `RATE_LIMITER`, eigener `namespace_id` und dem Limit aus `limits.rate_limits.coarse_per_minute` (für Staging ebenso, eigener Namespace).
- [ ] Tageskontingente und KI-Budget bestätigt (`limits.daily_quotas`, `llm_daily_budget_usd`); `npm run cli -- cost-report --days 7` gegen Staging gelesen.
- [ ] `OPS_HEARTBEAT_URL` im App-Worker zeigt auf den Watchdog.

## Überwachung

- [ ] Watchdog `reiseplaner-ops` deployt (`packages/ops-worker`, KV-Namespace, `APP_HEALTH_URL`, Secrets `OPS_HB_TOKEN` und `RESEND_API_KEY`); `GET /status` zeigt Heartbeats aller Jobs.
- [ ] Alarm einmal absichtlich ausgelöst, E-Mail „kritisch“ und Entwarnung empfangen (O10.3).
- [ ] Workers Observability aktiv; Stichprobe der Logs ohne E-Mail-Adressen und Tokens.

## Datenbank

- [ ] Manueller Dump vor der ersten Produktionsmigration; Migrationen angewendet, `_VERIFY.sql.notrun`-Abfragen gelesen.
- [ ] pgTAP grün (`npm run db:test`), RLS-Grundlinie „anon = 0“.

## Qualität und Abnahme

- [ ] CI grün: Typecheck, Tests, `npm run db:test`, `npm run check:claims`, Build.
- [ ] Walkthroughs aller Abläufe gegen Staging (Modus P, LiteAPI Sandbox) gelesen (O10.3).
- [ ] `npm run smoke -- --base-url https://<staging-domain> --expect-env staging` grün; nach dem Produktions-Deploy `--expect-env production` grün.
- [ ] Erste echte Buchung mit kostenloser Stornierung, danach storniert; Bestätigungs- und Storno-E-Mail geprüft (O10.3).
- [ ] Go-Live-Freigabe durch Ben (BG-13).
