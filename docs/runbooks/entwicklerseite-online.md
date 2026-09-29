# Entwicklerseite dauerhaft online, mit Passwort

Ziel (Ben, 29.09.2026): Die Seite hat eine feste URL, die immer aufrufbar ist, damit du sie zum Beispiel bei Tripadvisor angeben kannst. Besucher sehen nur eine öffentliche Seite mit Passwortfeld. Nach der Anmeldung läuft die Software wie lokal. Kunden können sie nicht nutzen, solange der Schutz an ist.

## Was fertig ist (im Code)

- **Passwort-Schutz (`packages/worker/src/gate.ts`):** aktiv, wenn die Variable `SITE_GATE=password` gesetzt ist (in `wrangler.jsonc` für Staging und Produktion schon so eingestellt; lokal und in Tests aus).
  - Öffentlich sind nur: die Passwortseite `/gate` (Name, ein Satz zum Zweck, Betreiber, Kontaktadresse, Passwortfeld), `robots.txt` (sperrt Suchmaschinen), `/api/v1/health` (Überwachung, Smoke-Test).
  - Alles andere, die Seite und die ganze API, verlangt die Anmeldung. Ohne Anmeldung leitet die Seite auf `/gate` um, die API antwortet 401.
  - Nach richtigem Passwort setzt der Server ein signiertes Cookie (30 Tage, `HttpOnly`, `Secure`). Ein neues Passwort meldet alle ab.
  - Falsche Versuche sind auf 10 je 15 Minuten und Nutzer begrenzt. Ist der Zähler nicht erreichbar, wird nicht angemeldet (fail-closed).
  - **Fehlt das Passwort-Secret, ist die Seite geschlossen** (503), nicht offen.
- **Nachweis:** `packages/worker/test-node/gate.test.ts` (11 Tests) und ein Lauf über den echten Worker (`wrangler dev`): ohne Login 303 auf `/gate` bzw. 401 für die API, Health und `robots.txt` offen, falsches Passwort 401, richtiges Passwort 303 mit Cookie, danach lädt die App.

## Geht das kostenlos?

**Ja für die feste URL mit Passwort.** Stand meiner Recherche (nicht aus der Anbieter-Doku selbst bestätigt, bitte auf den Preisseiten gegenprüfen):

| Baustein | Tarif | Kosten | Haken |
|---|---|---|---|
| Cloudflare Workers mit Static Assets | Free | 0 €, ohne Kreditkarte | 100.000 Anfragen pro Tag, 10 ms Rechenzeit je Anfrage |
| Feste URL | `<name>.workers.dev` | 0 € | eigene Domain (ca. 10 € im Jahr) ist nicht nötig; sie folgt mit BG-01 |
| Workflows (die Suche) | im Free-Tarif enthalten | 0 € | Zustand nur 3 Tage aufbewahrt |
| Hyperdrive, 3 Cron Triggers | im Free-Tarif enthalten (begrenzt) | 0 € | die Architektur nutzt genau 3 Crons |
| Supabase Free (Datenbank, EU) | Free, 500 MB | 0 € | pausiert nach 7 Tagen ohne Zugriff; der Cron alle 10 Minuten spricht die Datenbank an, hält sie also wach (bitte nach dem Deploy beobachten) |

**Nicht sicher ist, ob echte Suchen im Free-Tarif laufen.** Free-Workers erlauben nur 50 externe Aufrufe und 10 ms Rechenzeit je Aufruf. Ein Suchschritt macht deutlich mehr Aufrufe (zum Beispiel eine Detailabfrage je Unterkunft) und wertet viele Angebote aus. Das kann Schritte scheitern lassen. Prüfen wir erst nach dem Deploy mit dem Fake-Modus (`PROVIDERS_MODE`) und danach mit echten Daten. Falls es hakt, kostet der Workers-Paid-Tarif etwa 5 $ im Monat. Dazu entscheidest du dann, vorher geben wir nichts aus. Für die URL bei Tripadvisor spielt das keine Rolle, denn dort sieht man nur die Passwortseite.

## Was du tun musst (⛔ BEN-GATE: Konten, Secrets, Deploy)

Ich kann das nicht selbst machen, weil ich keine Konten, Secrets und Deploys ohne dich anlege.

| # | Was | Dauer |
|---|---|---|
| 1 | Cloudflare-Konto (Free) anlegen, `workers.dev`-Subdomain wählen | ca. 10 min |
| 2 | Supabase-Konto und ein Projekt in einer EU-Region (Frankfurt) im Free-Tarif anlegen, Verbindungsadresse notieren | ca. 10 min |
| 3 | Hyperdrive-Konfiguration in Cloudflare auf diese Datenbank anlegen (ID notieren) | ca. 5 min |
| 4 | Secrets `SIGNING_KEY` und `IP_HASH_SALT` (zufällige Werte) setzen; die Passwörter (Admin und Nutzer) legst du beim ersten Besuch der Seite im Formular fest (kein Secret mehr, `SITE_PASSWORD` entfällt) | ca. 5 min |
| 5 | In einer neuen Claude-Sitzung: Migrationen einspielen, Deploy nach **Staging** (Fake-Modus, `PROVIDERS_MODE=sandbox` erst mit Schlüsseln), Rauchtest | eine Sitzung |
| 6 | URL prüfen: `https://<worker>.<subdomain>.workers.dev` zeigt die Passwortseite; die URL bei Tripadvisor eintragen | ca. 5 min |

Schlüssel und Passwörter nie in den Chat kopieren; sie gehen nur in `wrangler secret put` bzw. die Cloud-Umgebung (siehe `docs/runbooks/secrets.md`).

Offene Punkte für Schritt 5 (mache ich dann): Platzhalter in `wrangler.jsonc` (`__REISEPLANER_…__`) füllen, Staging statt Produktion nutzen (Produktion verlangt `PROVIDERS_MODE=live` und damit echte Buchungen), Tenant-Guard und `deploy.yml` prüfen (die Datei liegt in der Operator-Lane).

## Später öffentlich machen

Variable `SITE_GATE` auf `off` stellen und deployen (BEN-GATE). Vorher offen: Betreiberdaten und Rechtstexte (BG-02), Marke (BG-01), Buchung (BG-05). Bis dahin bleibt das Passwort davor.
