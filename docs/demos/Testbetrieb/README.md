# Testbetrieb – Belege (28.09.2026)

- `cli-ohne-netz.txt`: `npm run cli -- testbetrieb einrichten --from-env` → `pruefen` → `aus` in der Bau-Sitzung. LiteAPI und openrouteservice sind hier gesperrt; die Prüfung nennt je Anbieter den Grund (gesperrter Host) ohne Schlüssel, `aus` stellt `.dev.vars` byte-gleich wieder her.
- `ui-check.txt`, `01-startseite-testbetrieb.png`, `02-detail-testbetrieb.png`: `npm run dev` mit einem Testbetrieb-Block (Unterkünfte simuliert, weil LiteAPI hier nicht erreichbar ist; Fahrzeiten „echt“ ohne Schlüssel, also als Luftlinie geschätzt; Buchen aus), Browserlauf `npx tsx e2e/dogfood/testbetrieb-ui.ts`: gelber Balken nennt die Quellen, keine Buchen-Knöpfe, ein Hinweis mit Link „auf Google Maps ansehen“ (Name, Adresse, Ort), keine Konsolenfehler.
- Tests: `packages/providers/test/sources.test.ts`, `packages/worker/test-node/testbetrieb.test.ts`, `packages/cli/test/testbetrieb.test.ts` (Quellen je Anbieter, Konfigurationsregeln, getrennte Caches, `/meta/config`, `.dev.vars`-Block, Prüflauf mit Aufzeichnung und verständlichen Fehlern).
- Im simulierten Modus unverändert: 262 Tests, Walkthroughs 134/134 (P) und 30/30 (R) ohne Konsolenfehler.

Mit echten Schlüsseln und freigegebenen Domains steht der Nachweis gegen die echten Dienste noch aus (`docs/runbooks/testbetrieb.md`, Schritt 3).
