# Von überall erreichbar: Rechnen auf deinem MacBook, nur die Adresse im Internet

Ziel (Ben, 29.09.2026): Die Software läuft wie jetzt auf deinem MacBook (Datenbank, Suche, Rechenleistung, deine Schlüssel). Nur ein **Tunnel** macht sie unter einer Internetadresse erreichbar. Davor steht der Passwort-Schutz (`packages/worker/src/gate.ts`): Besucher sehen nur die Passwortseite. Es kostet nichts und braucht weder Cloudflare-Konto noch Supabase.

**Grenze:** Die Seite ist nur erreichbar, solange das MacBook an ist, wach bleibt, Netz hat und `npm run serve` läuft. Für Tripadvisor heißt das: Wer die URL in dieser Zeit öffnet, sieht die Passwortseite; sonst nicht. Falls Tripadvisor die Adresse prüft, sollte der Rechner dann laufen.

## Tunnel: welcher?

| Dienst | Adresse | Kosten | Hinweis |
|---|---|---|---|
| **Tailscale Funnel (empfohlen)** | fest: `https://<mac-name>.<tailnet>.ts.net` | kostenlos (Personal-Tarif) | Konto nötig (Login mit Google/Apple/GitHub), kein Warnhinweis vor der Seite; Bandbreite von Tailscale begrenzt (Zahl nicht veröffentlicht, für eine Testseite egal) |
| Cloudflare Quick Tunnel | zufällig `https://….trycloudflare.com`, **ändert sich bei jedem Start** | kostenlos, kein Konto | nur für einen schnellen Test, nicht für Tripadvisor |
| Cloudflare Tunnel mit festem Namen | fest, eigene Domain | Domain ca. 10 € im Jahr | erst sinnvoll mit eigener Domain (BG-01) |
| ngrok (Free) | fest `….ngrok-free.dev` | kostenlos | zeigt Besuchern eine Warnseite vor deiner Seite, für Tripadvisor ungeeignet |

Stand meiner Recherche, nicht aus den Anbieter-Preisseiten bestätigt.

## Einrichtung (einmalig, ca. 15 Minuten, du)

1. **Repository auf dem MacBook** aktualisieren und installieren (wie in `docs/runbooks/testbetrieb.md`, Schritt 4).
2. **Tailscale installieren:** tailscale.com/download (Mac-App) oder `brew install --cask tailscale`, anmelden.
3. **Funnel freischalten:** In der Tailscale-Verwaltung (login.tailscale.com) unter *Access controls* Funnel für dein Gerät erlauben (die Verwaltung bietet dafür einen Knopf oder Hinweis) und unter *DNS* MagicDNS sowie HTTPS-Zertifikate aktivieren.
4. **Passwörter festlegen:** `npm run serve` starten (siehe unten) und die Adresse öffnen. Der erste Besuch zeigt ein Formular für zwei Passwörter: das **Admin-Passwort** (für dich: Entwicklerseite, KI-Schalter, Hinweisbalken) und das **Nutzer-Passwort** (für Tester: sie sehen die Seite wie Endkunden, ohne Entwicklerwerkzeuge). Mindestens 10 Zeichen, beide verschieden. Danach fragt die Seite nur noch nach einem Passwort; das Formular erscheint nicht wieder. Die Passwörter liegen als gesalzene Hashes in der lokalen Datenbank (`app.meta_kv`, Schlüssel `gate.credentials`), in keiner Datei. **Richte sie sofort nach dem ersten Start ein:** solange sie fehlen, kann jeder, der die Adresse kennt, sie festlegen. Zurücksetzen (Passwort vergessen): `psql postgres://postgres:postgres@127.0.0.1:54329/postgres -c "DELETE FROM app.meta_kv WHERE key='gate.credentials'"`, dann erscheint das Formular neu.

## Jeden Tag

Terminal 1:

```bash
npm run serve
```

Das baut die Seite, startet die lokale Datenbank und den Worker auf `http://127.0.0.1:8787` (mit `--no-build` überspringt es den Bau, mit `--port 9000` wechselt es den Port; Funnel erlaubt nur 443, 8443 und 10000 als öffentliche Ports, der lokale Port ist frei wählbar).

Terminal 2:

```bash
tailscale funnel --bg 8787
tailscale funnel status
```

`funnel status` zeigt die feste Adresse `https://<mac-name>.<tailnet>.ts.net`. Diese Adresse trägst du bei Tripadvisor ein. Beenden: `tailscale funnel reset` und Ctrl-C im Terminal 1.

**Rechner wach halten:** `caffeinate -i` im dritten Terminal (oder Systemeinstellungen, Energie), sonst ist die Seite weg, sobald der Mac schläft.

## Prüfen

1. Adresse im Handy-Browser (nicht im WLAN des Macs): zeigt die Passwortseite mit „Reiseplaner“.
2. Falsches Passwort: „Das Passwort stimmt nicht.“ Richtiges Passwort: die Suche wie lokal.
3. `https://<adresse>/api/v1/health` liefert ohne Anmeldung nur den Zustand (keine Nutzerdaten).

## Sicherheit und Kosten

- **Nur mit Passwort:** Alles außer Passwortseite, `robots.txt` und Health ist gesperrt; 10 Fehlversuche je 15 Minuten; Suchmaschinen sind ausgesperrt.
- **Deine Schlüssel liegen auf dem Mac** und verlassen ihn nicht. Aber: **Wer das Passwort hat, kann Suchen auslösen.** Im Testbetrieb mit echten Schlüsseln (LiteAPI, Anthropic, openrouteservice) verursacht das echte Aufrufe. Die Tagesdeckel im Produkt (`product.config.yaml`, `limits`) greifen; das Anthropic-Ausgabenlimit in der Console zusätzlich setzen. Ohne echte Schlüssel ist alles simuliert und kostenlos.
- **Buchen** ist im Testbetrieb ausgeschaltet.
- Das Passwort nicht weitergeben, bis du das willst; ändern geht durch Ändern der Zeile in `.dev.vars` und Neustart, das meldet alle ab.
- Impressum und Datenschutz sind noch Platzhalter (BG-02). Die Passwortseite nennt den Betreiber und eine Kontaktadresse aus `product.config.yaml` (Platzhalter `.example`). Vor Tripadvisor die Kontaktadresse in `product.config.yaml` auf eine echte setzen.

## Später: richtig deployen

Die kostenlose Cloud-Variante (Cloudflare Workers Free, Supabase Free) steht in `docs/runbooks/entwicklerseite-online.md`. Beides nutzt denselben Passwort-Schutz.
