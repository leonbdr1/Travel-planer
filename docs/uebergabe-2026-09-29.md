# Übergabe an die lokale Claude-Code-Sitzung (29.09.2026)

Diese Notiz fasst die Cloud-Sitzung vom 29.09.2026 zusammen, damit eine lokale Sitzung auf dem MacBook ohne die Unterhaltung weiterarbeiten kann. Lies zuerst `CLAUDE.md`, `HANDOFF.md` (Frontier, Drift 44 bis 46) und `STATUS.md` (S11.12 bis S11.14). Der Nutzer schreibt Deutsch; „Ben“ in den Dokumenten ist der Nutzer dieser Sitzungen. Der Stand liegt auf dem Branch `claude/dazzling-einstein-kl47rl` (letzter Commit a9bda3f).

## Ausgangsfrage

Beim Testen hatten viele Unterkünfte keine Bewertung und flogen deshalb aus der Auswahl, obwohl sie bei Google Maps viele Bewertungen haben. Ursache sehr wahrscheinlich die LiteAPI-Datenbasis (V5 in `docs/konzept.md`); **gemessen ist es nicht** (`npm run cli -- validate` mit echten Daten steht aus).

## Entscheidungen des Nutzers

- Kein Google Places (kostet), kein SerpApi und kein Scraping (im späteren Betrieb nicht möglich). Nichts nutzen, was später wegfällt.
- Zweite Quelle: Tripadvisor Content API (freies Kontingent, Pflicht zur Quellenangabe). Der Nutzer legt das Konto selbst an.
- Die Software soll auf dem MacBook rechnen; nur die Adresse geht online, mit Passwort davor, damit Kunden sie noch nicht nutzen. Kosten möglichst null.

## Was gebaut ist (alles auf dem Branch, getestet, nicht in `main`)

| Slice | Was | Beleg |
|---|---|---|
| S11.12 | `RatingSourcePort` mit Fake, Workflow-Schritt `external-ratings`, Fusion `fuseRatings` (externe Bewertungen zählen halb), Spalte `app.hotels.external_ratings` (Migration `20261014a`), Budget `rating_calls`, Anzeige „inkl. Tripadvisor“ in Liste, Finale und Detail | `docs/demos/S11.12/`, Walkthrough 65/65 |
| S11.13 | Passwort-Schutz im Worker (`packages/worker/src/gate.ts`, `SITE_GATE=password`) | `docs/demos/S11.13/`, 11 Tests, Suite 366 grün |
| S11.14 | `npm run serve` (`scripts/serve.ts`, Umgebung `serve` in `wrangler.jsonc`): gebautes SPA und Worker hinter dem Gate auf `127.0.0.1:8787` | `docs/demos/S11.14/`, `curl`-Lauf |

## Was noch nicht stimmt oder fehlt

- **Tripadvisor-Adapter fehlt.** Der echte Adapter antwortet `contract_unverified`, weil die Doku (`tripadvisor-content-api.readme.io`) in der Cloud-Sitzung gesperrt war. Erst Vertrag lesen, dann bauen (Regel: nie aus dem Gedächtnis). Anleitung: `docs/runbooks/tripadvisor.md`. Wartet auf Konto und Schlüssel des Nutzers, dazu drei Fragen zu den Bedingungen (Speichern, Quellenangabe, Fusion erlaubt?).
- Gewicht 0,5 für externe Bewertungen ist ein Startwert; mit echten Daten prüfen.
- Pflichtform der Quellenangabe (Logo, Bewertungspunkte) fehlt in der Anzeige.
- `architektur.md` und `konzept.md` sind nicht angepasst (BEN-GATE): Anbieterliste, V5, Abschnitt 6.7, Abschnitt 11 und 13 (Passwort-Schutz).
- Die Kontaktadresse auf der öffentlichen Passwortseite kommt aus `product.config.yaml` (`support.email`, Platzhalter `.example`); vor Tripadvisor eine echte eintragen.
- `package.json` (Skript `serve`) ist Operator-Lane und wurde mit dem Nutzer geändert.

## Nächste Schritte für die lokale Sitzung

1. `npm ci --ignore-scripts && node scripts/supply-chain-check.mjs --rebuild`, dann `npm run serve` (erster Start baut das SPA; das Passwort steht in `packages/worker/.dev.vars`, Zeile `SITE_PASSWORD`, nie ausgeben).
2. Tunnel: Tailscale ist auf dem Mac installiert. Funnel per `tailscale funnel --bg 8787` freischalten (der Befehl gibt einen Link zum Aktivieren aus; alternativ Block `"nodeAttrs": [{"target": ["autogroup:member"], "attr": ["funnel"]}]` in den Access controls und in den DNS-Einstellungen MagicDNS und HTTPS-Zertifikate einschalten). Die feste Adresse zeigt `tailscale funnel status`. Prüfen: Adresse vom Handy öffnen, Passwortseite sehen, Anmeldung testen. Anleitung: `docs/runbooks/von-ueberall.md`.
3. Die Adresse beim Tripadvisor-Konto eintragen (macht der Nutzer). Der Mac muss dann an sein und `npm run serve` laufen.
4. Wenn der Tripadvisor-Schlüssel da ist: Cloud-Umgebung oder lokale `.dev.vars` mit `REISEPLANER_TRIPADVISOR_API_KEY` bzw. dem Namen, den der Adapter nutzt; Doku lesen, Adapter bauen, mit `record-fixture` aufzeichnen, messen (`validate`, Stichprobe von 20 Häusern), Gewicht prüfen.
5. Ohne Tripadvisor: Anteil der Häuser ohne Bewertung messen, bevor weiter gebaut wird.

## Stolperfallen dieser Sitzung

- Die Cloud-Sitzung hat keinen Zugriff auf den Mac; Befehle für Tailscale und `npm run serve` auf dem Mac muss die lokale Sitzung oder der Nutzer ausführen.
- Wer das Passwort hat, kann im Testbetrieb mit echten Schlüsseln Suchen auslösen (Tagesdeckel greifen; zusätzlich Ausgabenlimit in der Anthropic-Console).
- `pkill -f` mit Muster, das im eigenen Befehl steht, beendet die eigene Shell; Prozesse über `ps` und die ID beenden.
