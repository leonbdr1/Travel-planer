# S11.8 Entwicklerseite – Belege

Stand: 28.09.2026, lokaler Stack, KI simuliert.

- `demo-output.txt`: `npm run demo -- s11.8` – Entwicklerseite meldet KI an (simuliert) und Suchgrenzen 60/200; Suche mit KI an: alle geprüften Häuser „geprüft“, Warnhinweise KI-bestätigt; Schalter aus: nächste Suche nur mit Stichworten („ungeprüft“), `/meta/config` meldet `llm_enabled=false`; Schalter wieder an.
- `walkthrough-P/42-entwicklerseite.png`: Seite über den Link im Hinweisbalken, Schalter, Text, Suchgrenzen (gelesen). Ablauf `entwickler` im Bericht `docs/demos/S11.7/walkthrough-P/report.md`.
- Mit echtem Anthropic-Schlüssel ist der Schalter standardmäßig aus (Test `packages/worker/test-node/dev-settings.test.ts`).
