# Tripadvisor als zweite Bewertungsquelle: Anleitung

**Pausiert (Ben, 2026-09-29): keine Kosten, nur 1000 Entities sind kostenlos. Kein Schlüssel hinterlegt, die Quelle ist aus. Fortsetzen erst auf Bens Zeichen.**

Ziel: Unterkünfte, die bei LiteAPI keine oder kaum Bewertungen haben, bekommen zusätzlich Note und Anzahl von Tripadvisor. Der Score rechnet beide Quellen zusammen (`fuseRatings`, Tripadvisor-Bewertungen zählen halb). Stand: Port, Workflow-Schritt, Fusion und Anzeige sind gebaut und mit simulierten Daten getestet (`HANDOFF.md`, Drift 44). Der echte Adapter ist gebaut (`packages/providers/src/rating-source/tripadvisor.ts`, mit Tests, 2026-09-29). Der erste Live-Aufruf mit dem Schlüssel lieferte HTTP 403 („explicit deny in an identity-based policy“): Schlüssel im Portal prüfen (Content API aktiv? IP-/Domain-Beschränkung?). Ohne Schlüssel bleibt alles beim Alten. Schlüssel lokal: `TRIPADVISOR_API_KEY` in `packages/worker/.dev.vars`.

Warum Tripadvisor: kein Google Places (kostet), kein SerpApi und kein Scraping (im Betrieb nicht möglich). Tripadvisor hat eine offizielle API mit freiem Kontingent. Ob sie bei kleinen Häusern wirklich hilft, wissen wir erst nach dem Messen (Schritt 5).

## To-do-Liste

| # | Was | Wer | Dauer |
|---|---|---|---|
| 1 | Konto anlegen, Tageslimit setzen, Schlüssel erzeugen | du | ca. 15 min |
| 2 | Bedingungen lesen (Speichern, Anzeige, Quellenangabe) und Ergebnis notieren | du | ca. 15 min |
| 3 | Schlüssel und Netzfreigabe in der Cloud-Umgebung eintragen, neue Claude-Sitzung starten | du | ca. 5 min |
| 4 | Adapter nach der echten Doku bauen, gegen die echte API prüfen | Claude | eine Sitzung |
| 5 | Wirkung messen und Gewicht prüfen | Claude, dann du | eine Sitzung |
| 6 | Lokal testen und Rückmeldung geben | du | – |

## 1. Konto, Limit, Schlüssel

1. Auf **developer-tripadvisor.com** ein Konto anlegen (Content API). Du gibst eine Kreditkarte an, weil Abrufe über dem Freikontingent berechnet werden.
2. **Tageslimit („max daily budget“) so niedrig wie möglich setzen.** Das ist die harte Kostenbremse auf Anbieterseite, zusätzlich zu unserer eigenen (`rating_calls` = 3000 pro Tag in `product.config.yaml`). Sinnvoll für den Test: ein Limit, das im schlimmsten Fall wenige Euro kostet.
3. Einen **API-Schlüssel** erzeugen.
4. **Schlüssel nie in den Chat kopieren.**

Stand meiner Recherche (nicht aus der Doku selbst bestätigt, bitte auf der Seite gegenprüfen): die ersten 5000 Abrufe im Monat sind frei, danach wird gestaffelt berechnet; Such-Abrufe sind auf 10000 pro Tag begrenzt; Tripadvisor muss angezeigt werden (Logo und Bewertungspunkte aus der Antwort).

## 2. Bedingungen lesen, drei Fragen beantworten

Bitte in den Nutzungsbedingungen der Content API nachsehen und mir antworten:

1. **Speichern:** Dürfen Note und Anzahl Bewertungen länger zwischengespeichert werden? Wir speichern sie 30 Tage je Unterkunft (`EXTERNAL_RATING_TTL_DAYS`). Erlaubt die Doku weniger, kürze ich den Wert.
2. **Anzeige und Quellenangabe:** Welche Form ist Pflicht (Logo, Bewertungspunkte, Link zur Tripadvisor-Seite)? Aktuell steht nur der Text „inkl. Tripadvisor“. Vor echten Kunden muss die Pflichtform dazu.
3. **Fusion:** Ist es erlaubt, die Note mit anderen Quellen zu einem eigenen Wert zu verrechnen und diesen anzuzeigen?

Falls eine Antwort „nein“ ist, ist Tripadvisor für den echten Betrieb keine Lösung. Für den reinen Testbetrieb (nur du) ändert das wenig, und wir suchen dann eine andere Quelle. Bitte die Antworten in einem kurzen Satz je Frage zurückgeben.

## 3. Schlüssel und Netzfreigabe eintragen

Im Menü der Cloud-Umgebung in der Titelleiste der Sitzung auf „Edit“:

- **Network access:** Domains erlauben: `api.content.tripadvisor.com` und `tripadvisor-content-api.readme.io` (Doku). Falls der Anbieter andere Adressen nennt, diese eintragen.
- **Umgebungsvariable:** `REISEPLANER_TRIPADVISOR_API_KEY`.

Danach eine **neue Sitzung** starten (Änderungen gelten erst dort) und schreiben: „Tripadvisor-Adapter bauen und prüfen“.

## 4. Adapter bauen (Claude)

Ablauf in der neuen Sitzung:

1. Doku der Content API lesen (Suche nach Koordinaten, Details mit Note und Anzahl) und den Vertrag festhalten.
2. Adapter hinter `RatingSourcePort` bauen: zod-Schemas für die Antworten, Zuordnung Unterkunft zu Tripadvisor-Eintrag über Name, Ort und Koordinaten. **Eine falsche Zuordnung ist schlimmer als keine:** bei Zweifel gilt „nicht gefunden“.
3. Antworten mit `record-fixture` aufzeichnen, Fixtures und Tests daraus ableiten (ohne Netzwerk lauffähig).
4. In `factory.ts` den echten Adapter statt des ungeprüften einhängen, Umgebungsvariable in die Konfiguration aufnehmen, Anbieter in `providers`-Modus und `testbetrieb pruefen` aufnehmen.
5. Pflichtform der Quellenangabe in der Anzeige umsetzen (Ergebnis aus Schritt 2).
6. `architektur.md` und `konzept.md` anpassen (V5, Abschnitt 6.7, Anbieterliste). Das ist ein Gate und braucht dein Ja.

## 5. Wirkung messen

- `npm run cli -- validate` und ein Testbetrieb-Lauf mit echten Daten: Anteil der Häuser ohne Bewertung **vorher und nachher**, Anteil, den Tripadvisor findet, Anteil falscher Zuordnungen (Stichprobe von 20 Häusern gegen Google Maps und Tripadvisor von Hand).
- Prüfen, ob das Gewicht 0,5 passt: Tripadvisor-Noten liegen oft höher als Booking-Noten. Ich vergleiche Häuser, die beide Quellen haben, und schlage einen Wert vor.
- Ergebnis kommt in `docs/demos/` und `STATUS.md`.

## 6. Nutzen und Rückmeldung

Nach Schritt 5: lokal suchen (Anleitung `docs/runbooks/testbetrieb.md`). In den Ergebnissen steht bei fusionierten Noten „inkl. Tripadvisor“, im Detail erklärt ein Hinweis, wie die Note entsteht. Bitte melden:

- Fehlen immer noch viele Bewertungen? Bei welchen Häusern?
- Stimmen Noten und Anzahlen mit dem überein, was du bei Tripadvisor siehst?
- Stört oder hilft der Hinweis „inkl. Tripadvisor“?

## Wenn Tripadvisor nicht reicht

Bleibt die Abdeckung bei kleinen Häusern schlecht, gibt es zwei Wege, beide ohne Scraping: Häuser ohne Bewertung ehrlich als „noch keine Bewertungen“ zeigen und nach Preis und Ausstattung einordnen (heutiges Verhalten), oder einen weiteren Anbieter mit offizieller API prüfen. Beides entscheiden wir mit den Zahlen aus Schritt 5.
