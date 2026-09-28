# S9.3 Härtung – Belege

- `demo-output.txt`: `npm run demo -- s9.3` gegen den lokalen Stack im Preview-Modus (Produktions-Build der SPA, statische Assets mit `_headers` wie bei Workers Static Assets, Worker in workerd). Header-Liste der Startseite und einer API-Antwort; Buchung über HTTP wie in der SPA (Tokens nur in Headern), Zugangslink mit ALTCHA, alle drei Cron-Jobs; Worker-Log und Antworten ohne Klartext-E-Mail, Telefonnummer und Tokens.
- `grobes-rate-limit.txt`: grobe Stufe des Rate Limits (Binding `RATE_LIMITER`, von Miniflare simuliert) im lokalen Stack: 320 Anfragen in einer Minute → 300 × 200, 20 × 429 mit `Retry-After: 60`; Health bleibt ausgenommen.
- `walkthrough-preview-P/`, `walkthrough-preview-R/`: alle Walkthroughs (Modus P: suchrahmen, suche, ergebnisse, warnungen, buchung; Modus R: start, pflichtseiten) gegen den Produktions-Build mit der strikten CSP (`script-src 'self'`, `style-src 'self'`): 134/134 und 30/30 Prüfungen, in allen 38 Schritten keine Konsolenfehler und keine fehlgeschlagenen Anfragen. Zwei Screenshots zur Sichtprüfung (Styles, Bilder, KI-Kennzeichnung).
- Tests: `packages/worker/test-node/hardening.test.ts` (`_headers` synchron zu `spaSecurityHeaders`, API-Header, grobes Rate Limit inklusive Ausfall des Bindings und täglich wechselndem IP-Hash, Log-Maskierung, Buchungsdurchlauf ohne Klartext-E-Mail und Tokens in Logs und Antworten).

Hinweis: Im Vite-Entwicklungsmodus gilt `_headers` nicht (Vite braucht dort Inline-Skripte für Hot Reload); maßgeblich ist der Produktions-Build.
