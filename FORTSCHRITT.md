# FORTSCHRITT – Aufgabenliste vom 01.10.2026 (Abgleich mit dem Buchungsportal-Standard)

Auftrag (Leon, nachts, autonom): Funktionsumfang gegen den Standard großer Buchungsportale prüfen, funktionale Lücken schließen, Code und Performance optimieren, UI-Texte entrümpeln. Keine Architektur-Umbauten, nichts deployen, bestehende Funktionen nur verfeinern. Commit-Kennung: `B<n>` (Funktion), `P<n>` (Optimierung), `T<n>` (Text).

Branch: `feature/booking-complete` (von `claude/software-entwicklung-konzept-gv58jh`, Stand 3242944; später `claude/main` hineingemergt). Nichts davon ist deployt.

**Bewusst nicht gebaut:** Nutzerkonten (konzept.md 2: „Kein Nutzerkonto im MVP“) – stattdessen Buchungsübersicht per E-Mail und „Letzte Suchen“ im Browser. Rezensionsauszüge (konzept.md 15.10, rechtlich offen). Ziele „Preis-Leistung“ und „Komfort“ (Ben geht sie selbst an).

## Übersicht

- [x] **B1** – Ergebnisfilter vollständig: Unterkunftsart, Ausstattungs-Wünsche und Namenssuche im Ergebnis änderbar (konzept.md F5)
- [x] **B2** – Liste seitenweise („Weitere anzeigen“), Sortierung nach Fahrzeit
- [x] **B3** – Preise aktualisieren (dieselbe Suche neu) und „Letzte Suchen“ im Browser
- [x] **B4** – Buchungsübersicht ohne Konto: nur E-Mail eingeben, Liste aller Buchungen per E-Mail
- [x] **B5** – Support-Werkzeug: `npm run cli -- buchungen` (Liste und Einzelansicht mit E-Mail-Status)
- [x] **B6** – Fehlerbehandlung: deutsche Fehlerseite, Zeitlimit für API-Aufrufe, 404 und Netzfehler getrennt, Request-ID in Log und Antwort
- [x] **B7** – Fotos in der Ergebnisliste, Kartenlink in der Detailansicht
- [x] **P1** – Performance: Code-Splitting je Seite, parallele Datenbankabfragen
- [x] **P2** – Aufräumen: toter Code, doppelte Texte
- [x] **T1** – Text-Entrümpelung über alle Seiten
- [x] **Z** – Abschluss: Tests, Walkthroughs, Doku, Push, PR

## Notizen je Aufgabe

### Vorab – Absturz im Such-Assistenten mit aktuellem Chrome (behoben, 3c3c0e5)
Aktuelles Google Chrome gibt bei `window.scrollTo` ein Promise zurück; `useEffect(() => window.scrollTo(…))` gab es an React zurück, das darauf „destroy is not a function“ warf – `/suche` zeigte nur „Unexpected Application Error!“. Gefunden beim ersten Walkthrough mit dem installierten Chrome (Playwrights eigenes Chromium ist älter und zeigte es nicht). Effekte in `Search.tsx` und `Home.tsx` haben jetzt einen Block-Rumpf.

### B1 und B2 – erledigt
- **Unterkunftsart** (Hotel, Pension, Ferienwohnung) als Chips im Filterkasten. Der bestehende Filter `types` nimmt jetzt auch die drei Arten; die Art kommt wie beim Qualitätswert aus Typ und Name der Unterkunft (`domain/filters.ts`, `property-kind.ts`), rohe Anbietertypen gehen weiter.
- **Ausstattung** (Parkplatz, Hund, Sauna, WLAN, Küche, barrierefrei, Familienzimmer) im Ergebnis änderbar; das sind die Wunsch-Chips mit Filterwirkung. Die übrigen Wünsche der Suche (sauber, ruhig, Frühstück, stornierbar) laufen unverändert mit. Damit erfüllt das Ergebnis konzept.md F5 („Unterkunftsart“, Filter der Suche im Ergebnis änderbar).
- **Namenssuche** über der Liste (`q`, Groß-/Kleinschreibung und Akzente egal, 300 ms Pause); sie grenzt die Listen ein, nicht Matrix und Finale.
- **Seitenweise Liste:** `offset`/`limit` an `GET /results` (ohne `limit` wie bisher die ganze Liste), Antwort mit `page: {offset, limit, total}`; die SPA lädt 20 Häuser und hängt mit „Weitere anzeigen (n)“ die nächste Seite an. „Unsere Wahl“ und der Nächte-Hinweis rechnen weiter über die ganze Liste.
- **Sortierung „Fahrzeit“** (nächster Ort zuerst, innerhalb eines Orts nach Preis), nur wenn Fahrzeiten bekannt sind; die Liste nennt die Fahrzeit am Ort („1 h 5 min Fahrt“).
- Nebenbei: Die drei Lesezugriffe von `loadEvaluationData` und die unabhängigen Lesezugriffe der Ergebnis-Route laufen parallel (postgres.js reiht sie auf einer Verbindung ohne Warten hintereinander).
- Walkthrough-Runner: `DOGFOOD_BROWSER_CHANNEL=chrome` nutzt ein installiertes Chrome statt Playwrights Chromium-Download.
- Beleg: Walkthrough `listenfilter` (neu) in `docs/demos/B1/walkthrough-P/` (7/7, Screenshots gelesen); Integrationstest `worker/test/searches.test.ts` (Seiten, Name, Art, Fahrzeit), Domain-Test Unterkunftsart; `npm test` 447 grün.

### B3 – erledigt
- **Preise aktualisieren:** Über „Deine Auswahl“ steht „Preise von HH:MM Uhr“ mit dem Knopf „Preise aktualisieren“. Sind die Preise älter als `RATE_CACHE_TTL_MIN` (30 min), wird daraus ein gelber Hinweis mit hervorgehobenem Knopf. Der Knopf startet dieselbe Suche neu (gleicher Suchrahmen, ALTCHA und Suchgrenzen wie jede Suche) und öffnet sie. Dafür liefert `GET /results` den Suchrahmen mit (`request`, additiv).
- **Letzte Suchen:** Die Startseite zeigt die letzten 5 Suchen dieses Browsers als Links („Füssen · 01.10.–12.10.2026“), einzeln entfernbar (`features/search/recent.ts`, `localStorage`). Einträge älter als die Aufbewahrungsfrist der Suchen (30 Tage) fallen weg, eine gelöschte Suche (404) auch. Die Datenschutzerklärung nennt das.
- Ersatz für „Buchungsverlauf/gespeicherte Suchen“ ohne Nutzerkonto (konzept.md 2 und 11).
- Beleg: Walkthrough `suchverlauf` (neu) in `docs/demos/B3/walkthrough-P/` (6/6, mit vorgestellter Uhr; Screenshots gelesen); Unit-Test `web/test/recent-searches.test.ts`; `npm test` 451 grün.

### B4 – erledigt
- **Buchungsübersicht ohne Konto:** Unter „Meine Buchung“ ist die Buchungsnummer jetzt optional. Nur mit E-Mail schickt der Worker eine E-Mail „Deine Buchungen“ mit allen bestätigten und stornierten Buchungen dieser Adresse (neueste Anreise zuerst, höchstens `BOOKINGS_OVERVIEW_MAX` = 20), jede mit eigenem Zugangslink. Die Antwort bleibt immer 202 (verrät nicht, ob es Buchungen gibt); ALTCHA und 5 Anfragen pro Stunde wie bisher. Kein neuer E-Mail-Typ (Vorlage `access_link` mit zweiter Payload-Form), keine Migration.
- **Randfall Storno-Frist:** Angebote, deren kostenlose Stornierung zum Zeitpunkt der Ansicht schon abgelaufen ist (Ergebnisse später geöffnet oder Anreise in wenigen Tagen), zählen nicht mehr als „kostenlos stornierbar“ – Filter, Finale-Badge, Liste und Detail sehen dasselbe (`freeCancellationAt` in `domain/pricing.ts`, angewandt in `evaluateSearch` mit `now`). Gebuchte Buchungen behalten die echte Frist; Ansicht und Bestätigungs-Mail sagen „(abgelaufen)“ bzw. „Die kostenlose Stornierung endete am …“, die Storno-Vorschau nennt dann Gebühren laut Bedingungen. „nicht stornierbar“ heißt jetzt genauer „nicht kostenlos stornierbar“. Gefunden, weil der Buchungs-Walkthrough heute (01.10.) einen Tarif mit Frist 30.09. als „kostenlos stornierbar“ zeigte.
- Beleg: Walkthrough `buchung` (neuer Schritt 08 „nur mit E-Mail“) in `docs/demos/B4/walkthrough-P/` (8/8, frischer Stack); gerenderte Übersichts-Mail aus dem Postausgang `docs/demos/B4/uebersicht-mail.txt`; Tests `worker/test-node/bookings.test.ts` (Übersicht, Link öffnet die eigene Buchung, unbekannte Adresse), `mail.test.ts`, `domain/test/pricing.test.ts`; `npm test` 455 grün.
- Offen: Ein Index auf `lower(holder_email)` wäre bei vielen Buchungen sinnvoll (heute Tabellenscan, begrenzt durch 5 Anfragen/Stunde); das wäre eine neue Migration (Staging/Produktion: BEN-GATE).

### B5 – erledigt
- `npm run cli -- buchungen [--status …] [--limit …]` listet die letzten Buchungen, `npm run cli -- buchungen <NUMMER>` zeigt eine mit Status, Zeiten (Europe/Berlin), Hotel-Bestätigungsnummer, LiteAPI-Kennung, letztem Fehler und dem Versandstand aller E-Mails; bei einer vertippten Nummer nennt es ähnliche. Nur lesend, E-Mail maskiert. Neue Repo-Funktionen `listBookings`, `bookingsByRefPrefix`, `outboxForBooking`.
- Ein Admin-Bereich im Browser ist bewusst nicht gebaut: Zahlung und Abwicklung liegen bei LiteAPI, die Entwicklerseite ist nur lokal; für den Support genügt das Werkzeug. Anleitung: `docs/runbooks/support-buchungen.md`.
- Beleg: `docs/demos/B5/cli-output.txt` (gegen die lokale Datenbank nach den Buchungs-Walkthroughs); Test `packages/cli/test/bookings.test.ts`.

### B6 – erledigt
- **Fehlerseite:** Der Router zeigt statt „Unexpected Application Error!“ (englisch, mit Stacktrace) eine kurze deutsche Seite mit „Neu laden“ und „Zur Startseite“, Kopf und Fuß bleiben (`components/RouteError.tsx`). Kann ein Tab nach einem Deploy den Seitencode nicht mehr laden, heißt sie „Neue Version verfügbar“.
- **API-Client:** Zeitlimit 30 s (`API_REQUEST_TIMEOUT_MS`), verlorene Verbindung und Zeitüberschreitung als deutsche Meldung, ein eigener Abbruch (neue Filter, Seite verlassen) bleibt ein Abbruch. Serverfehler nennen eine kurze Fehler-ID.
- **Worker:** Jede Antwort trägt `X-Request-Id` (Cloudflare-Ray-ID oder UUID); Fehler (≥ 500) und langsame Anfragen (≥ 3 s, `SLOW_REQUEST_MS`) schreiben eine Logzeile mit Methode, Routenmuster (ohne IDs und Buchungsnummern), Status, Dauer und Request-ID; auch „unhandled“ trägt die ID. So findet der Support zur Fehler-ID des Gastes die Logzeile.
- **Seiten:** Detailansicht, Buchungsformular und Ergebnisliste unterscheiden „gibt es nicht“ (404) von Verbindungs- und Serverfehlern; die Detailansicht bietet im Fehlerfall den Weg zurück. Der Suchlauf zeigt nach drei gescheiterten Abfragen „Verbindung unterbrochen – wir versuchen es weiter …“ und setzt eine Fehlermeldung zurück, wenn der Link korrigiert wird (vorher blieb „Diese Suche gibt es nicht“ stehen). Das Buchungsformular prüft die E-Mail-Adresse und schneidet Leerzeichen ab.
- Beleg: Walkthrough `fehler` (neu) in `docs/demos/B6/walkthrough-P/` (7/7, Fehler per Netzwerk-Abfangen erzeugt); Tests `web/test/api-client.test.ts`, `worker/test-node/hardening.test.ts` (Request-ID); `npm test` 463 grün.

### B7 – erledigt
- **Fotos in der Liste:** Jede Unterkunft der Ergebnisliste zeigt ihr Hauptfoto (`photo_url` gab es schon, es wurde nicht angezeigt), verlinkt auf die Detailansicht, `loading="lazy"`.
- **Karte:** Die Detailansicht hat neben der Adresse „Karte ↗“: OpenStreetMap an der Position der Unterkunft (neues Feld `hotel.location`, additiv), ohne Position eine Suche nach Name und Adresse. Die Karte wird nicht eingebettet (keine Drittanbieter-Anfragen beim Seitenaufruf).
- Beleg: Walkthrough `listenfilter` prüft die Fotos (`docs/demos/B7/walkthrough-listenfilter/`), `buchung` den Kartenlink; Screenshots gelesen.

### P1 – erledigt
- **Code-Splitting:** Startseite und Such-Assistent im Hauptbundle, alle anderen Seiten laden beim ersten Aufruf (`router.tsx`, `lazy`); React und Router in einem eigenen Chunk, der über Releases im Browser-Cache bleibt. Hauptbundle 802 kB (249 kB gzip) → 389 kB (123 kB gzip) + React-Chunk 317 kB (101 kB gzip); Ergebnisseite 32 kB, Detail 28 kB extra.
- **Datenbank:** Unabhängige Lesezugriffe gehen gemeinsam raus (postgres.js reiht sie auf einer Verbindung ohne Warten hintereinander): `loadEvaluationData` (3 Abfragen), Ergebnis-Route (Rezensionen ∥ Orte, dann Auswertung ∥ Ortsdaten: 6 → 2 Wartezeiten), Detail-Route (Rezensionen ∥ zwischengespeicherte Details). Indizes für die heißen Abfragen (`offers(search_id)`, `search_combinations(search_id, id)`) bestehen schon.
- **Rendering:** Ergebnisliste seitenweise (B2), Fotos mit `loading="lazy"` und fester Höhe (kein Springen beim Laden).

### P2 – erledigt
- Entfernt: `deleteExpiredRateLimits` und `deleteStaleTravelTimes` (Dubletten, die Wartung löscht inline in `repos/maintenance.ts`), `QualityBadge` (durch `RatingPair` ersetzt), `clearState`, `formatKm`, rund 25 nicht mehr genutzte UI-Texte (alte Satz-Variante des Finales, Schritt-Kacheln, Hinweise). Ein `<Label>` ohne Feld in der Sortierleiste entfernt.
- TODO/FIXME: keine im Code. Die „⟂“-Vermerke (ungeprüfte Anbieter-Verträge in `providers/liteapi`, `reference-price`, Ausstattungs-IDs in `chips.ts`/`features.ts`) bleiben bewusst stehen: sie brauchen echte Sandbox-Antworten (BG-05).
- Ungenutzte Domain-Konstanten (`SEARCH_TOKEN_TTL_DAYS`, `LITEAPI_MAX_RETRIES`, `LITEAPI_MAX_CONCURRENCY_SANDBOX`) und `isGoal` bleiben: sie stehen als Startwerte in `architektur.md` 6.14.
- Formatierung/Linting: Das Repo hat keinen Formatter oder Linter (neue Abhängigkeit wäre BEN-GATE); strenger Typecheck (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) ist grün. `npm run check:status` war schon vor dieser Liste rot (S11.12 bis S11.15 fehlten im Plan) – im Plan nachgetragen, jetzt grün.

### T1 – erledigt
Grundsatz: Text nur, wo er Information trägt; Pflichtangaben (Vertragspartner, kein Widerrufsrecht, Stornobedingungen, Beträge vor Ort vor der Zahlung, KI-Kennzeichnung, Quellenangaben, Ranking-Kriterien) bleiben.
- **Startseite:** Großbuchstaben-Zeile über der Überschrift und die drei Schritt-Kacheln weg; Unterzeile auf einen Satz („Viele Orte und Termine in einer Suche.“). Die Statuszeile „API: ok · Datenbank: ok“ sehen Gäste nur noch, wenn etwas ausfällt (lokal weiter immer).
- **Suchassistent:** Hilfeabsätze zu Reiseart, Reisemuster, Nächten, Budget und Ziel entfernt (der Ziel-Umschalter erklärt sich mit einer Zeile); „Schritt 1 von 3“ nur noch für Screenreader (die Schrittleiste zeigt es); Karten- und Ortslisten-Einleitungen gekürzt; die zwei Karten „Ortsliste bestätigt“ und „Suche starten“ zu einer zusammengelegt, ohne Erklärsatz und ohne ALTCHA-Hinweis (steht in der Datenschutzerklärung).
- **Ergebnisse:** Zähler kurz („25 Unterkünfte passen, 13 aussortiert.“), keine Einleitung unter „Alle Angebote“, Matrix-Legende auf eine Zeile, Legende des Finales einklappbar (OSM-Quellenangabe bleibt sichtbar), Aussortier-Gründe kürzer, kein Erklärsatz unter der Preisleiter, „Gesamtpreis“ in Großbuchstaben über jedem Preis durch „gesamt · … pro Nacht“ ersetzt, „Details und alle Termine“ → „Details“, der Hinweis „Mögliche Gebühren vor Ort … nicht bekannt“ auf jeder Karte → „evtl. zzgl. Kurtaxe“ (vor der Zahlung steht er weiter ausführlich), Begründung beim Schnäppchen „(gleiches Zimmer: 85 € statt im Mittel 138 €)“, Abschnitte „Nur größere Unterkünfte“ und „Ohne Bewertungen“ mit je einem Satz.
- **Detail:** Zimmerübersicht, Qualitätswert („Unser Qualitätswert“), Rezensionscheck, Vergleichspreis und Ausstattung mit kurzen Sätzen; die Zahl geprüfter Bewertungen steht nur noch einmal.
- **Buchung:** kürzere Hinweise (E-Mail, Preisänderung, Zahlung offen/fehlgeschlagen, Storno-Vorschau), AGB-Bestätigung in einem Satz, Gast-Feld „Gast in Zimmer 1“; „Meine Buchung“ in einem Satz.
- **Info-Seiten:** Einleitungen gekürzt; „So funktioniert's“ behauptete noch, die Standardsortierung verbinde Qualität und Preis – korrigiert (Standard ist der Preis); die Rangliste-Seite nennt die neue Sortierung nach Fahrzeit.
- Beleg: Screenshots von Start, Assistent, Ergebnis, Detail und Buchungsformular gelesen; alle Pfad-Walkthroughs auf dem Endstand (siehe Z).

### Z – erledigt
- `claude/main` hatte inzwischen 5 neue Commits (Suchformular neu geordnet, Startort optional, Startseite mit einem Knopf, Gate mit weiteren Passwörtern, Kritik-Labels). Gemergt; Konflikte so gelöst, dass deren Entscheidungen gelten (ein Knopf auf der Startseite, keine große Regionenkarte) und meine Ergänzungen dazukommen („Letzte Suchen“, kürzere Texte auch für die neuen Felder).
- Auf dem Merge-Stand: alle Pfad-Walkthroughs 410/410 (111 Schritte, 21 Flows), Rundgang 30/30, Typecheck, 465 Tests, 94 pgTAP-Zusicherungen, Build, Claims, STATUS, Lieferkette grün: `docs/demos/Abschluss-B/`.
- Nebenbei behoben: Der Rundgang `start` war seit F1 rot (erwartete den Knopf „Suche starten“, die Suchleiste hat „Suchen“); `npm run check:status` war rot (S11.12–S11.15 fehlten im Plan).
- Branch gepusht, Pull Request gegen `claude/main` (der frühere Basis-Branch `claude/software-entwicklung-konzept-gv58jh` existiert auf GitHub nicht mehr). Nicht deployt.

---

# Aufgabenliste vom 29.09.2026 (abgeschlossen)

Arbeitsweise: strikt der Reihe nach, eine Aufgabe gleichzeitig, jede Aufgabe mindestens ein eigener Commit. Zu Beginn jeder Sitzung zuerst diese Datei lesen und bei der ersten offenen Aufgabe weitermachen. Commit-Kennung der Aufgaben: `F<n>` (z. B. `F2`).

Branch: `claude/hopeful-fermat-jechzj`. Nichts davon ist deployt (Online schalten macht Ben).

**Achtung:** Punkte im Abschnitt „Offene Punkte aus Brainstormings“ werden erst umgesetzt, wenn Ben ausdrücklich „setz es um“ sagt (siehe `CLAUDE.md` §Brainstorm-Modus). Nicht automatisch weitermachen.

## Offene Punkte aus Brainstormings

Ergebnisse der Brainstormings, funktional formuliert. Format: `- [ ] **B<n>** – <was der Nutzer sehen oder tun können soll> (<Datum>[, Archiv: docs/brainstorming/<datei>.md])`. Nach der Umsetzung abhaken und die `F<n>`-Kennung mit Commit ergänzen.

- (noch keine)

## Übersicht

- [x] **Aufgabe 0** – Priorisierung vermerkt: „Günstig und sauber“ zuerst, „Preis-Leistung“ und „Komfort“ aktuell unfertig
- [x] **Aufgabe 1** – Startseite im Stil üblicher Buchungsseiten (Ortssuche, Kalender mit zwei Klicks)
- [x] **Aufgabe 2** – Rechenfehler „Alle Termine und Tarife“ (Vergleich nur über dasselbe Zimmer)
- [x] **Aufgabe 3** – Standortsuche: Postleitzahlen, fehlende Orte, manuelle Mehrfachauswahl von Orten
- [x] **Aufgabe 4** – Flexible Übernachtungsanzahl (z. B. 2 bis 3 Nächte)
- [x] **Aufgabe 5** – Personenzahl und Zimmerlogik
- [x] **Aufgabe 6** – Hotels und Ferienwohnungen fair unterscheiden (Bewertungsanzahl, Schimmel)
- [x] **Aufgabe 7** – Qualitätswert und Bewertungsanzeige (echte Note und unser Wert nebeneinander)
- [x] **Aufgabe 8** – Attraktivität von Regionen und Orten
- [x] **Aufgabe 9** – Info-Button an der Preismatrix und Seite zum Filtersystem
- [x] **Aufgabe 10** – Labels, Legende und Texte in „Deine Auswahl“
- [x] **Aufgabe 11** – Bilder vergrößerbar (Lightbox)
- [x] **Aufgabe 12** – Ausstattungs-Labels auf Deutsch
- [x] **Aufgabe 13** – Kartenansicht für Regionen

## Notizen je Aufgabe

### Aufgabe 0 – erledigt
Vermerkt in `CLAUDE.md` (Abschnitt „Aktueller Fokus“), `README.md`, `STATUS.md`, `HANDOFF.md` §Frontier und `docs/konzept.md` 9.9: „Günstig und sauber“ hat Priorität, „Preis-Leistung“ und „Komfort“ sind **aktuell unfertig** (offener Punkt für später). Offen: nichts.

### Aufgabe 1 – erledigt
- Suchleiste wie bei Buchungsportalen (`packages/web/src/features/search/SearchBar.tsx`): Startort, Fahrzeit, Anreise/Abreise, Reisende – auf der Startseite (mit „Suchen“, führt mit denselben Angaben in Schritt 1) und oben in Schritt 1 der Suche.
- Kalender (`DateRangePicker.tsx`, Logik in `calendar.ts` mit Tests): Klick auf „Anreise frühestens“ öffnet ein Kalenderfenster (zwei Monate, auf dem Handy einer). Erster Klick setzt die Anreise, das Fenster springt direkt auf „Abreise spätestens“ (Feld hervorgehoben, Zeitraum folgt der Maus), zweiter Klick setzt die Abreise und schließt. Vergangene Tage und Zeiträume über der Höchstlänge sind gesperrt.
- Reisende als Aufklappfeld mit Plus/Minus (Erwachsene, Kinder mit Alter, Zimmer), Zusammenfassung „2 Erwachsene · 1 Kind · 1 Zimmer“.
- Nächte und Anreise-Wochentage stehen darunter in „Wie lange und ab welchem Wochentag?“ mit Terminvorschau.
- Beleg: Walkthrough `startseite` (neu) in `docs/demos/F1/walkthrough-P/` (Screenshots gelesen, 390 px ohne Querscrollen); `suchrahmen` und `suche` weiterhin grün; `npm test` 408 grün.
- Offen: Ortssuche selbst (PLZ, Mehrfachauswahl) folgt in Aufgabe 3; flexible Nächte in Aufgabe 4.

### Aufgabe 2 – erledigt
- **Ursache:** Andere Zimmer flossen nicht ein (der Vergleich lief schon nach Zimmer, Verpflegung und Stornobedingungen). Der Fehler war, dass der Vergleichswert der **Median über alle Termine desselben Zimmers inklusive des Schnäppchen-Termins selbst** war: Median von 182 €, 184 €, 128 € = 182 € (dass das zufällig dem Gartenblick-Preis entsprach, ließ es wie ein Mischen der Zimmer aussehen).
- **Behoben** in `packages/domain/src/bargains.ts` (`otherDatesMean`): Vergleichswert ist jetzt der **Durchschnitt desselben Zimmers (gleiche Verpflegung, gleiche Stornobedingungen) nur an den anderen Terminen**. Bens Beispiel: (182 + 184) / 2 = 183 € → 30 % günstiger (vorher 182 € / 29 %). Auch die Schwelle für die Markierung (höchstens 80 % des Vergleichswerts) nutzt jetzt diesen Wert.
- **Andere Stellen geprüft:** Plausibilitätsprüfung für Häuser ohne Bewertungen (Median bewerteter Häuser – das geprüfte Haus ist unbewertet, zählt also nicht mit), Sterne-Falle (Median der Häuser mit weniger Sternen – das geprüfte Haus hat mehr Sterne, zählt nicht mit), Zimmergruppen in der Detailansicht (je Zimmer „ab“-Preis, korrekt), Aufpreis im Finale (Differenz zum günstigsten Finalisten, gewollt verschiedene Häuser). Kein weiterer Fall derselben Fehlerquelle gefunden.
- Texte: Seite „So berechnen wir die Rangliste“ nennt jetzt den Durchschnitt der anderen Termine.
- Beleg: `npm run demo -- f2` → `docs/demos/F2/demo-output.txt` (Bens Beispiel ok; echte Suche über den lokalen Stack: 28 Schnäppchen-Begründungen gegen die Angebote der Detailansicht nachgerechnet, 0 abweichend); `npm test` 410 grün.
- Offen: `architektur.md` 6.8 nennt noch den Median – Nachtrag inzwischen in `architektur.md` 6.16 übernommen (Freigabe 30.09.2026).

### Aufgabe 3 – erledigt
**Teilschritt 3a – Ortsdaten (erledigt):**
- Ursache: Die lokale Ortsdatenbank war ein Entwicklungsauszug aus GeoNames `cities1000` **ohne Postleitzahlen** und ohne Orte unter 1.000 Einwohnern (die echten GeoNames-Downloads sind in der Bau-Umgebung gesperrt; der Produktivimport O3.1 steht aus). Die Suche nach Postleitzahlen war im Code schon vorgesehen, es fehlten nur die Daten.
- Neu: 5.926 weitere Orte ab 500 Einwohnern (GeoNames `cities500`) und Postleitzahlen für DE (OpenStreetMap, ODbL), AT und CH, erzeugt mit `data/geonames/dev-extract/build-extra.ts`; Quellen und Grenzen in `data/geonames/README.md`. Die Quellenangabe OpenStreetMap nennt jetzt auch Postleitzahlen.
- Bestehende lokale Datenbanken importieren beim nächsten `npm run dev` automatisch nach (`packages/cli/src/seed.ts`).
- Beleg: `npm run demo -- f3` → `docs/demos/F3/demo-output.txt` (87629 → Füssen, 10115 → Berlin, 6580 → St. Anton, 3920 → Zermatt, Balderschwang …); Tests in `packages/cli/test/catalog.test.ts`; `npm test` 412 grün.
- Offen: Orte unter 500 Einwohnern und einzelne Sammelgemeinden fehlen weiter, bis Ben den echten GeoNames-Import (O3.1) ausführt.

**Teilschritt 3b – manuelle Mehrfachauswahl von Orten (erledigt):**
- Schritt 1 hat unter der Suchleiste den Block „Wohin soll es gehen?“ mit beiden Wegen nebeneinander: links „Orte vorschlagen lassen“ (wie bisher über Startort, Fahrzeit und Reiseart), rechts „Orte selbst wählen“ – Ort oder Postleitzahl eintippen, auswählen, beliebig oft wiederholen (bis 10 Orte); gewählte Orte erscheinen als Chips mit Fahrzeit und lassen sich per × entfernen (`OwnPlacesPicker.tsx`).
- Mit eigenen Orten gibt es zwei Knöpfe: „Weiter zu den Regionen“ (eigene Orte **zusätzlich** zu den Vorschlägen) oder „Nur in diesen N Orten suchen“.
- In Schritt 3 stehen die eigenen Orte als Gruppe „Deine Orte“ über den vorgeschlagenen Regionen, bleiben ausgewählt, und die Vorschläge füllen nur die übrigen Plätze. Ein neuer Startort, eine andere Fahrzeit oder Reiseart verwirft nur die Vorschläge, nicht die eigenen Orte; deren Fahrzeiten werden bei neuem Startort neu berechnet.
- Vertrag: `PlaceDto` hat zusätzlich `geonameid` (additiv, Standard `null`).
- Beleg: Walkthrough `orte` in `docs/demos/F3/walkthrough-P/` (Startort per PLZ 70173, Köln + Frankfurt + Berlin, nur eigene Orte = 6 Kombinationen; danach Köln + Berlin zusammen mit Schwarzwald-Vorschlägen, Suche abgeschlossen); Screenshots gelesen; `npm test` 414 grün.

### Aufgabe 4 – erledigt
- Ansatz: `docs/logik/flexible-naechte.md`.
- Suchformular: „Nächte“ als Bereich „2 bis 3“ (Standard fest). Jede Anreise wird mit jeder Länge gesucht (Fr–So und Fr–Mo), die Terminvorschau zeigt die Varianten.
- Vergleich: dasselbe Haus, Zimmer, Verpflegung, Stornobedingungen und dieselbe Anreise; Preis der Zusatznacht = Gesamtpreis(n+1) − Gesamtpreis(n), verglichen mit dem Nachtpreis der kürzeren Variante: „günstig“ (≤ 70 %, grün: „3. Nacht nur +60 € – lohnt sich“), „teuer“ (≥ 130 %, orange: „deutlich teurer als die Nächte davor“), sonst neutral.
- Anzeige: Matrix-Spalte je Variante („Fr 02.10. / 3 Nächte“), Übersicht „3 statt 2 Nächte?“ über der Liste, Hinweis bei jeder Unterkunft in der Liste und je Termin/Zimmer in der Detailansicht.
- Schnäppchen vergleichen nur gleiche Nächtezahlen.
- Simulierte Unterkünfte: ab der 3. Nacht gibt jedes vierte Haus Rabatt, jedes vierte verlangt deutlich mehr (nur Aufenthalte ab 3 Nächten betroffen), damit alle drei Fälle vorführbar sind.
- Beleg: Walkthrough `naechte` in `docs/demos/F4/walkthrough-P/` (6 Termine, 8 Hinweise: 2 günstig, 5 normal, 1 teuer), Screenshots gelesen; Unit-Tests `packages/domain/test/nights.test.ts`, `dates.test.ts`, `scoring.test.ts`; `npm test` 419 grün.
- Offen/bekannte Grenze: Vorauswahl und Finale nehmen je Haus das günstigste Angebot nach Gesamtpreis (meist die kürzere Variante); Nachtrag für `architektur.md` in `architektur.md` 6.16 (freigegeben 30.09.2026) wartet auf Freigabe.

### Aufgabe 5 – erledigt
- Ansatz: `docs/logik/zimmer-und-personen.md`.
- Zimmergröße aus der Belegung des Anbieters, sonst aus dem Namen („für 6 Personen“, „Einzelzimmer“, „Familienzimmer“ …), sonst unbekannt (= passt). Ein Zimmer passt bis 2 Plätze über der Gruppengröße pro Zimmer; größer = „größer als nötig“.
- Preisbildung: je Haus und Termin das günstigste (und günstigste stornierbare) Angebot **nur unter passenden Zimmern** – bei mehreren passenden Zimmern sind alle Kandidaten, für „Günstig und sauber“ zählt nur das günstigste. Größere Zimmer fließen nicht in Liste, Matrix, Schnäppchen, Vorauswahl, Finale und „Unsere Wahl“ ein, werden aber gezeigt: Häuser mit nur größeren Wohnungen unten unter „Nur größere Unterkünfte frei“ (buchbar), in der Detailansicht grau mit Hinweis.
- Detailansicht: „Zimmer dieser Unterkunft an deinen Terminen“ – alle Zimmer mit „ab“-Preis und Größe, passende zuerst.
- „Komfort“: nur vorbereitet (`comfortRoomPrice` in `packages/domain/src/rooms.ts`, 50 % günstigstes + 50 % Median der passenden Zimmer), nicht verdrahtet (Aufgabe 0).
- Datenbank: Migration `supabase/migrations/20261015a_offer_rooms.sql` (additiv, nur lokal), pgTAP-Test `offer_rooms.sql`.
- Beleg: Walkthrough `zimmer` in `docs/demos/F5/walkthrough-P/` (1 Erwachsener: 4 Ferienwohnungen nur mit Wohnungen für 4 → unten, 11 Häuser in der Liste; Zimmerübersicht gelesen); Unit-Tests `packages/domain/test/rooms.test.ts`; `npm test` 426 grün, `npm run db:test` grün.
- Offen: Migration gegen Staging/Produktion (Ben); Schwelle `ROOM_OVERSIZE_EXTRA` = 2 ggf. mit echten Daten nachjustieren.

### Aufgabe 6 – erledigt
- Ansatz: `docs/logik/unterkunftsarten.md` (Unterkunftsarten Hotel / Pension / Ferienwohnung aus Anbieter-Typ oder Name).
- **Bewertungsanzahl:** Der Durchschnitt zählt ab 30 (Hotel), 25 (Pension/Gasthof) bzw. 20 (Ferienwohnung) Bewertungen voll. Bens Beispiel 8,7 aus 17: Hotel 8,2, Pension 8,3, Ferienwohnung 8,5 – eine Ferienwohnung wird nur noch leicht herabgesetzt. „Viele Bewertungen“ (Bonus im Vergleichspreis, Label) gilt ab 500 / 150 / 60.
- **Schimmel und ähnliche Mängel** (Schimmel, Ungeziefer, Schmutz, Zustand, Geruch): Abzug × 0,6 (Hotel), × 1 (Pension), × 1,6 (Ferienwohnung), Höchstabzug bei Ferienwohnungen 3 statt 2 Punkte. Aussortiert wird eine Ferienwohnung schon ab 2 Gästen und 5 % der geprüften Bewertungen (Schimmel/Ungeziefer), ein Hotel wie bisher ab 3 Gästen und 10 %.
- Anzeige: Aufschlüsselung in der Detailansicht nennt Art und Schwelle; Seite „So berechnen wir die Rangliste“ erklärt die Unterschiede.
- Beleg: `npm run demo -- f6` → `docs/demos/F6/demo-output.txt`; Tests `packages/domain/test/property-kind.test.ts`; `npm test` 433 grün.
- Offen: Schwellen mit echten Daten kalibrieren; Nachtrag für `architektur.md` wartet auf Freigabe.

### Aufgabe 7 – erledigt
- Berechnung passt jetzt zu Aufgabe 6: Bens Beispiel (Ferienwohnung, 8,7 aus 17) wird nur noch auf 8,5 statt 8,2 gezogen (vorher mit Aktualität 8,0); Aktualität und Abzüge wirken wie bisher.
- Anzeige in Liste, „Deine Auswahl“ und Detailansicht: **beide Werte nebeneinander** – die Gästebewertung (umrandet, z. B. „8,7 · 17 Gästebewertungen“) und **unser Wert** (gefüllt) mit kleinem „i“.
- Das „i“ öffnet beim Draufhalten (Handy: Tippen) ein kleines Info-Panel wie bei Reiseportalen: Überschrift „Warum 8,5 statt 8,7?“, ein Satz zum Unterschied und nur die Gründe, die bei dieser Unterkunft zutreffen (z. B. „Bei Ferienwohnungen zählt die Note ab 20 Bewertungen voll. Bei 17 gleichen wir sie etwas an den Durchschnitt aller Unterkünfte (7,5) an.“, „Neuere Bewertungen fallen schlechter aus (−0,1).“, „Abzug für gemeldete Mängel (−0,6).“), dazu Link „So berechnen wir unseren Wert“. Neues UI-Bauteil `InfoPopover` (`packages/ui`), bleibt auf schmalen Bildschirmen im Bild.
- Beleg: Walkthrough `bewertung` in `docs/demos/F7/walkthrough-P/` (Liste, Info-Panel, Detail, Handy 390 px), Screenshots gelesen; `npm test` 433 grün.

### Aufgabe 8 – erledigt
- Ansatz: `docs/logik/orts-attraktivitaet.md`. Fünf Kriterien je 0–3: Bekanntheit, Bergbahnen/Skigebiet/Sehenswürdigkeiten (beide für alle 308 Katalogorte von Hand eingeschätzt in `data/catalog/attraktivitaet.yaml`, doppelt gewichtet), Wander- und Radwege und Vielfalt (aus den Katalog-Themen), Infrastruktur (Einwohnerzahl). Wert 0–10, Stufen „Top-Urlaubsort“ (ab 8), „Beliebter Urlaubsort“ (ab 6), „Ruhiger Ort“ (ab 4), „Wenig los“.
- Eigene Orte (nicht im Katalog): aus Einwohnerzahl und dem nächsten Katalogort in 8 km (eine Stufe schwächer); Großstädte gelten als gut, abgelegene Dörfer als „Wenig los“.
- Regionen: Mittel der drei besten Orte, mit Stufe und Hauptorten.
- Anzeige: Stufe an Regionen (Schritt 2) und Orten (Schritt 3) mit „i“ und Kriterien; in der Preis-Matrix unter jedem Ortsnamen; „Wenig los“-Orte in Liste und „Deine Auswahl“ orange markiert: „Balderschwang: günstiger, hat aber wenig zu bieten“. Nichts wird aussortiert. Rechenweise auf der Seite „So berechnen wir die Rangliste“ (Abschnitt „So bewerten wir Orte und Regionen“).
- St. Anton am Arlberg in den Katalog aufgenommen (Region „Bregenzerwald und Montafon“, KI-Entwurf).
- Datenbank: Migration `20261016a_place_attractiveness.sql` (nur lokal), pgTAP-Test; lokale Datenbanken importieren den Katalog automatisch nach.
- Beleg: Walkthrough `attraktivitaet` in `docs/demos/F8/walkthrough-P/` (Regionen mit Stufe, Info-Panel, Balderschwang als „wenig los“ in Matrix und Liste), Screenshots gelesen; Tests `packages/domain/test/attractiveness.test.ts`; `npm test` 442 grün.
- Offen: Einschätzungen redaktionell prüfen (BG-11); Ausbau mit OpenStreetMap-Zählung von Bergbahnen und Wanderrouten möglich.

### Aufgabe 9 – erledigt
- **Prüfung (Meldung an Ben):** Ja, die „ab“-Preise der Preis-Matrix sind vorgefiltert. `matrixCells` → `buildMatrix` (`packages/domain/src/ranking.ts`) nimmt je Zelle nur Angebote, die die Filter bestehen, deren Zimmer passt (Aufgabe 5) und deren Unterkunft die Regeln des Ziels besteht (`admissibleFor` → `admissibleHotelIds` in `packages/domain/src/preselect.ts`). Heraus fallen: Warnsignale (gehäufte Beschwerden über Schimmel, Ungeziefer, Schmutz), zu schwach bewertet für das Ziel (mit der Ausnahme „deutlich günstiger“), Sterne-Falle, Häuser ohne Bewertungen mit auffälligem Preis oder auffälliger Ausstattung. **Bewusst drin bleiben** (so gewollt, aber zur Kenntnis): Häuser mit nur wenigen Schimmel-Meldungen (Warnhinweis mit Abzug, Bens Entscheidung vom 29.09.), Häuser ohne Rezensionscheck (Warnsignale sind dort unbekannt) und unauffällige Häuser ohne Bewertungen. Nicht angewandt werden in der Matrix die Regeln „zu teuer für das Ziel“ und „besseres Angebot vorhanden“ (die gelten nur für „Deine Auswahl“).
- Neben der Preis-Matrix steht jetzt die Überschrift „Preis-Matrix (Gesamtpreis ab)“ mit „i“; beim Draufhalten (Handy: Tippen) erscheint ein kurzer Hinweis „Vorgefiltert“ mit dem, was nicht eingerechnet ist, und dem Link „Mehr Details hier“. Der Hinweis ist nicht dauerhaft sichtbar.
- Neue Seite „So filtern wir“ (`/so-filtern-wir`, `packages/web/src/pages/FilterSystem.tsx`) mit allen Filterstufen und den gültigen Werten, auch im Fußbereich verlinkt.
- Beleg: Walkthrough `filter` in `docs/demos/F9/walkthrough-P/`, Screenshots gelesen; `npm test` grün.

### Aufgabe 10 – erledigt
- Unter „Deine Auswahl“ steht statt der Wortketten eine **Legende** in zwei Spalten: „Verglichen mit der günstigsten Unterkunft“ – grün = zusätzlich, weiß = gleich, durchgestrichen = fehlt, „Unsere Wahl“ = bestes Verhältnis aus Preis und Bewertung; „Aus Gästebewertungen“ – **gelb = Lob, grau = Kritik**, dazu: „Lob und Kritik stammen aus Bewertungen von Gästen, nicht von der Unterkunft.“ Jede Farbe mit einem Beispiel-Label.
- Kritik-Labels (z. B. „Baulicher Zustand“) sind jetzt grau mit kleinem Warnsymbol (vorher orange), damit die Legende stimmt; „fehlt“ ist weiß durchgestrichen statt grau.
- Der KI-artige Satz („Ob dir ein Aufpreis das wert ist, entscheidest du …“) ist ersetzt durch „Links steht der Preis, darunter der Aufpreis zur günstigsten Unterkunft.“
- Nebenbei behoben: Die Bewertungsanzeige aus Aufgabe 7 war in „Deine Auswahl“ auf 390 px zu breit.
- Beleg: Walkthrough `finale` in `docs/demos/F10/walkthrough-P/` (Schritt 05 zeigt die Legende), Screenshots gelesen; `npm test` grün.

### Aufgabe 11 – erledigt
- Fotos in der Detailansicht sind anklickbar (leichter Zoom beim Draufhalten; beim vierten Foto „+N Fotos“, wenn es mehr gibt). Ein Klick öffnet eine Galerie (`Lightbox` in `packages/ui`): Foto groß auf dunklem Grund, Vor/Zurück als Knöpfe, mit den Pfeiltasten und per Wischen auf dem Handy, Zähler „2 / 3“, Vorschaubilder zum Springen, Schließen mit × oder Escape; am Ende geht es wieder zum ersten Foto.
- Beleg: Walkthrough `bilder` in `docs/demos/F11/walkthrough-P/` (Desktop und 390 px), Screenshots gelesen; `npm test` grün.

### Aufgabe 12 – erledigt
- Zentrale Übersetzungstabelle `packages/domain/src/facilities-de.ts`: rund 190 übliche englische Ausstattungsnamen von LiteAPI/Booking (inkl. Bens Liste: WLAN verfügbar, Kostenloses WLAN, Parkplatz, Kostenloser Parkplatz, Nichtraucherzimmer, Heizung, Terrasse, Garten, Haustiere erlaubt, Wandern, Angeln, Radfahren, Tourenberatung) → deutsches Label und Gruppe. Groß-/Kleinschreibung, Leerzeichen und „&“ egal; doppelte Einträge fallen weg.
- Anzeige „schöner verpackt“: Die Detailansicht zeigt die Ausstattung in Gruppen mit Symbol (Internet, Parken und Mobilität, Essen und Trinken, Wellness und Sport, Draußen, Aktivitäten, Zimmer und Wohnung, Familie und Haustiere, Barrierefreiheit, Service), jeder Eintrag mit Häkchen.
- **Keine englischen Begriffe mehr:** Unbekannte Namen werden nicht angezeigt, nur gezählt („Dazu 2 weitere Angaben des Anbieters, die wir noch nicht übersetzen.“), und der Worker schreibt sie ins Log (`facility untranslated`, keine personenbezogenen Daten) – damit kann Ben die Tabelle im Testbetrieb ergänzen.
- Die simulierten Unterkünfte liefern ihre Ausstattung jetzt wie die echte LiteAPI auf Englisch (vorher schon deutsch), damit die Übersetzung sichtbar geprüft wird.
- Weitere englische Labels im Code: keine gefunden (Verpflegung, Wünsche, Lob, Badges sind bereits deutsch). Zimmernamen und Beschreibungen kommen vom Anbieter (Beschreibungen fordern wir auf Deutsch an, Drift 38) – Zimmernamen wie „Double Room“ werden nicht übersetzt; bitte melden, falls gewünscht.
- Beleg: Walkthrough `ausstattung` in `docs/demos/F12/walkthrough-P/` (prüft, dass keine englischen Begriffe erscheinen), Tests `packages/domain/test/facilities-de.test.ts`; `npm test` 446 grün.

### Aufgabe 13 – erledigt
- Schritt „Regionen“ zeigt oben eine grobe Übersichtskarte (Deutschland, Österreich, Schweiz, Südtirol als vereinfachte Umrisse, einige Großstädte zur Orientierung), darauf dein Startort und alle vorgeschlagenen Regionen; ausgewählte Regionen sind hervorgehoben, beim Draufzeigen auf eine Regionskarte wird genau diese Region markiert und beschriftet.
- Jede Regionskarte hat zusätzlich eine kleine Mini-Karte mit ihrer Lage (z. B. Allgäu im Süden an der Grenze, Schwarzwald im Südwesten).
- Umsetzung ohne Kartenbibliothek und ohne externe Anfragen (neue Abhängigkeiten sind ein BEN-GATE): selbst gezeichnetes SVG (`packages/web/src/features/search/OverviewMap.tsx`); die Lage einer Region ist der Mittelpunkt ihrer Katalogorte (`center` im Vertrag).
- Beleg: Walkthrough `karte` in `docs/demos/F13/walkthrough-P/` (Desktop, Hervorhebung, 390 px), Screenshots gelesen; `npm test` 446 grün.
- Offen: bewusst grob; bei Wunsch nach echter Karte (z. B. OpenStreetMap-Kacheln) wäre das eine neue Abhängigkeit/ein neuer Anbieter (Ben entscheidet).

## Nachtrag 1: Suchseite neu geordnet (Ben, 29.09.2026) – erledigt
- **„Wohin soll es gehen?“ steht ganz oben.** Darin zwei Wege mit je einem Häkchen: „Orte vorschlagen lassen“ (mit **Startort und Fahrzeit**, nur dort) und „Orte selbst wählen“ (mehrere Orte). Beide zusammen, oder nur einer; mindestens einer bleibt an. Nur eigene Orte: kein Startort nötig, dann gibt es aber auch keine Fahrzeiten.
- **Darunter, verbunden:** „Wann und mit wem?“ mit Datum (Kalender) und Reisenden, gilt für beide Wege.
- **Startseite:** nur noch ein Button „Suche starten“ (keine Eingabefelder mehr); alles Weitere auf `/suche`.
- **Passende Regionen:** das große Übersichtsbild ist raus, die kleinen Karten je Region bleiben.
- Technik: Zustand `suggest` und `pickOwn`; der Startort ist in der Anfrage leer, wenn nur eigene Orte gewählt sind (`origin` im Vertrag optional, Migration `20261017a_search_origin_optional.sql` mit pgTAP-Test `supabase/tests/search_origin_optional.sql`, nur lokal ausgeführt, Staging/Produktion bleibt BEN-GATE).
- **Korrektur (Ben, 29.09.):** Bei „nur eigene Orte“ fehlten die Fahrzeiten, weil ich den Startort ausgeblendet hatte. Jetzt gibt es dort ein optionales Feld „Startort (optional)“; mit Startort stehen die Fahrzeiten wieder neben den Orten (auch bei Vorschlägen und gemischt).
- **Korrektur 2 (Ben, 29.09.):** In „Deine Auswahl“ hieß die Kritik zur Sauberkeit nur „Sauberkeit“ (wirkte wie Lob) → jetzt „Nicht sauber“; „Lärm“ heißt jetzt „Lautstärke“ (auch in der Legende). Das Infofeld „i“ neben „Unser Wert“ wurde von der Liste abgeschnitten (`overflow-hidden`) → behoben, der Walkthrough `finale` prüft es jetzt.
- Beleg: Walkthroughs `startseite`, `orte`, `karte`, `naechte`, `zimmer` angepasst und Screenshots gelesen; `npm test` 448 grün, `npm run db:test` grün.

## Stand nach allen Aufgaben (29.09.2026)
Alle 14 Aufgaben (0–13) erledigt, committet und auf `claude/hopeful-fermat-jechzj` gepusht; nichts deployt. Offene Punkte für Ben: `architektur.md`-Nachtrag freigeben (`architektur.md` 6.16 (freigegeben 30.09.2026)), Migrationen `20261015a`/`20261016a` gegen Staging/Produktion, redaktionelle Prüfung der Orts-Attraktivität (BG-11), „Preis-Leistung“ und „Komfort“ überarbeiten (Aufgabe 0), Schwellen mit echten Daten kalibrieren.

### Abschlussprüfung
- Alle Pfad-Walkthroughs zusammen (`npm run dogfood -- --mode P`): 366/366 Prüfungen bestanden, Bericht in `docs/demos/Aufgaben-Gesamt/report-P-all.md`. Dabei behoben: lange Labels in „Deine Auswahl“ brechen auf 390 px jetzt um; eine veraltete Textprüfung im Walkthrough `ergebnisse` angepasst.

# Aufgabenliste vom 29.09.2026, spät (F14–F18)

Auftrag von Ben: Regionensystem überarbeiten (ein Highlight-Ort → Ortsname), Europa-Erweiterung komplett mit groben Fahrzeitblöcken und Flug-Hinweis ab 30 Stunden (nur Anzeige), Rezensionen in anderen Sprachen erkennen, Kultur und Shopping trennen. Branch: `claude/inspiring-knuth-tmiduy` (entspricht `main`). Nichts davon ist deployt.

- [x] **F14** – Themen: Kultur und Shopping getrennt, dazu Strand
- [x] **F15** – Europa-Erweiterung: Ortsdaten, Datenbank, Katalog
- [x] **F16** – Fahrzeiten in groben Blöcken, Flug-Hinweis ab 30 Stunden
- [x] **F17** – Regionsname: bei nur einem Highlight-Ort der Ortsname
- [x] **F18** – Rezensionen: Stichwörter in weiteren Sprachen

### F14 – erledigt
- Reiseart: „Städte und Kultur“ heißt jetzt **„Kultur und Sehenswürdigkeiten“** (Altstädte, Museen, schöne Bauwerke); neu **„Shopping und Großstadt“** (Einkaufsstraßen, Kaufhäuser) und **„Strand und Meer“** (für Europa). Der Code `staedte_kultur` bleibt, damit alte Suchen gültig bleiben.
- Katalog neu verschlagwortet: Shopping bei Salzburg, Innsbruck, Bozen, Konstanz, Luzern, Lugano (2) und kleineren Städten wie Kempten, Trier, Würzburg (1); Strand an Nord- und Ostsee. Kleine Kulturorte (Füssen, Rothenburg …) haben kein Shopping.
- Neue Großstadt-Regionen: Berlin und Potsdam, Hamburg und Lübeck, München, Frankfurt und Rhein-Main, Köln und Düsseldorf, Dresden und Elbland, Stuttgart (KI-Entwurf, BG-11).
- Orts-Attraktivität: Kriterium W zählt jetzt Wandern, Radfahren, Strand **oder** Shopping; vorher landete Stuttgart als „Ruhiger Ort“ (5,8), jetzt 6,8, die Region Frankfurt 7,4 statt 6,1.
- KI-Skills `wish-parse`, `catalog-regions`, `catalog-places` als Version 1.1.0 mit dem neuen Vokabular („Städtetrip mit Shopping“ → Kultur und Shopping); Evals im Fake-Modus 38/10/10 bestanden.
- Beleg: `npm run demo -- f14` → `docs/demos/F14/demo-output.txt` (ab Stuttgart, 6 h: Shopping → Köln/Düsseldorf, Frankfurt, Stuttgart, München, Bodensee; Allgäu nicht dabei; Kultur → Romantische Straße, Bodensee, Mittelrhein …); Walkthrough `themen` in `docs/demos/F14/walkthrough-P/`, Screenshots gelesen.

### F15 – erledigt
- **Ortsdaten:** 15.668 Orte in 19 weiteren Ländern (Italien, Frankreich, Spanien, Portugal, Benelux, Dänemark, Tschechien, Polen, Ungarn, Kroatien, Slowenien, Slowakei, Griechenland, Großbritannien, Irland, Norwegen, Schweden) ab 3.000 Einwohnern plus kleine Katalogorte wie Vernazza, mit deutschen Namen (Venedig, Rom, Lissabon, Krakau …). Startort und eigene Orte können jetzt überall dort liegen; die Beschriftung lautet z. B. „Venedig, Italien“.
- **Katalog:** 53 neue Regionen mit 195 Orten, u. a. Gardasee, Venedig und Obere Adria, Dolomiten, Comer See und Lago Maggiore, Cinque Terre, Toskana, Rom, Amalfiküste, Sizilien, Sardinien, Paris, Elsass, Côte d’Azur, Provence, Chamonix, Bretagne/Normandie, Loire, Barcelona/Costa Brava, Mallorca, Madrid, Andalusien, Costa Blanca, Kanaren, Lissabon, Porto, Algarve, Madeira, Amsterdam, niederländische Küste, Flandern, Luxemburg, Kopenhagen, dänische Nordsee, Prag, Böhmen, Krakau/Tatra, polnische Ostsee, Budapest, Plattensee, Istrien, Dalmatien, Slowenien, Athen, Kreta, Korfu, London, Schottland, Cornwall, Irland, Fjordnorwegen, Stockholm. KI-Entwurf mit Attraktivitätswerten, redaktionelle Prüfung ausstehend (BG-11). Katalog gesamt: 109 Regionen, 520 Orte, 0 Fehler in `catalog validate`.
- **Datenbank:** Migration `20261018a_europe_countries.sql` (nur lokal; Staging/Produktion ist BEN-GATE) mit pgTAP-Test.
- **Karte:** Die Mini-Karte an jeder Region zeigt für Ziele außerhalb von Deutschland, Österreich und der Schweiz einen groben Europa-Ausschnitt.
- **KI-Skills** Version 1.2.0 (Länderliste, Hinweis auf Flugziele), Evals im Fake-Modus bestanden.
- Beleg: `npm run demo -- f15` → `docs/demos/F15/demo-output.txt` (Startorte Venedig/Lissabon/Krakau, eigene Orte Venedig/Rovinj/Paris, Gardasee ab München bei „Seen“ bis 6 h, Strandregionen in Kroatien und Frankreich); Walkthrough `europa` in `docs/demos/F15/walkthrough-P/` (Strand ab München mit Europa-Mini-Karten, Suche über Venedig bis „Suche abgeschlossen“), Screenshots gelesen.
- Offen: Echte Ortsdaten kommen mit dem GeoNames-Produktivimport (O3.1).

### F16 – erledigt
- Ansatz: `docs/logik/fahrzeit-bloecke.md`.
- **Je näher, desto genauer:** unter 7 h minutengenau („4 h 17 min“), 7 bis 10 h auf die Stunde („ca. 9 h“), dann Blöcke „über 10 h“ und „über 20 h“, ab 30 h „über 30 h“ mit Flugzeug „Flug empfohlen“ (nur ein Hinweis, Flüge buchen wir nicht). Das gilt an Orten, eigenen Orten und in den Begründungen der Regionen („ca. 8 h bis über 10 h Fahrt“).
- Ferne Ziele (Schätzung über 9 h) fragen den Routendienst nicht mehr ab, die grobe Autobahn-Schätzung reicht; das spart Kontingent.
- Fahrzeit-Auswahl: zusätzlich „bis 7 / 10 / 20 / 30 Stunden“, „egal“ heißt jetzt „egal (ganz Europa)“.
- Nebenbei behoben: Auf dem Handy ragte die Leiste „Wann und mit wem?“ über den Rand, und die Daten waren abgeschnitten.
- Beleg: `npm run demo -- f16` → `docs/demos/F16/demo-output.txt` (ab München: Venedig 4 h 17 min, Split ca. 9 h, Barcelona über 10 h, Lissabon über 20 h, Teneriffa über 30 h mit Flugzeug; bis 20 h keine Kanaren, kein Madeira, keine Algarve); Walkthrough `fahrzeit` in `docs/demos/F16/walkthrough-P/`, Screenshots gelesen (auch 390 px).

### F17 – erledigt
- Hat eine Region unter den Orten, die zu deiner Suche passen, **genau einen Highlight-Ort** (Top-Urlaubsort), steht dieser Ort als Überschrift der Regionskarte, darunter klein „Region …“: z. B. „Bozen“ (Region Eisacktal und Bozen), „Frankfurt am Main“ (Region Frankfurt und Rhein-Main), „Venedig“ (Region Venedig und Obere Adria). Bei **zwei oder mehr** Highlights (Allgäu mit Oberstdorf und Füssen, Elsass) bleibt der Regionsname.
- Gezählt werden nur passende Orte: Bei „Strand und Meer“ heißt Slowenien nicht „Bled“ (kein Meer), Venedig bleibt dann „Venedig und Obere Adria“.
- Die Stufe auf so einer Karte ist die des Orts (Bozen „Top-Urlaubsort 8,7“ statt Regionsmittel 7,7).
- Ohne Themenwahl tragen 39 von 109 Regionen den Namen ihres einzigen Top-Orts (Liste in `docs/demos/F17/demo-output.txt`). **Zur Prüfung:** Bei Regionen, die selbst ein bekanntes Ziel sind, liest sich das teils ungewohnt (Mallorca → „Palma“, Algarve → „Lagos“, Irland → „Dublin“, Zillertal → „Mayrhofen“). Die Unterzeile „Region Mallorca“ bleibt sichtbar; falls gewünscht, kann eine Region im Katalog vom Umbenennen ausgenommen werden.
- Beleg: `npm run demo -- f17` → `docs/demos/F17/demo-output.txt`; Walkthrough `regionsname` in `docs/demos/F17/walkthrough-P/`, Screenshots gelesen.

### F18 – erledigt
- Bewertungen werden **nicht übersetzt**; die Wörter, die zu unseren Kriterien passen, werden direkt in der Sprache des Gasts erkannt. Neu: Spanisch, Portugiesisch, Polnisch, Tschechisch, Kroatisch, Ungarisch, Dänisch, Schwedisch, Norwegisch, Griechisch (vorher Deutsch, Englisch, Französisch, Italienisch, Niederländisch).
- Das gilt für die Beschwerden (Sauberkeit, Schimmel, Ungeziefer, Lärm, Geruch, Zustand, „anders als auf den Fotos“) mit Verneinungen („No había ruido“ → keine Beschwerde) und für das Lob („Desayuno excelente“ → Frühstück gelobt).
- Wörter, die in deutschen Texten etwas anderes heißen, sind bewusst nicht in den Listen (polnisch „kurz“ = Staub, schwedisch „damm“, kroatisch „mir“); ein Test prüft, dass typische deutsche Sätze keine neuen Treffer auslösen.
- Der KI-Prüfschritt `review-verify` (Version 1.1.0) liest die Ausschnitte in ihrer Sprache; 52 Evals bestanden.
- Simulierte Unterkünfte in Europa schreiben einen Teil ihrer Bewertungen und alle Mängel-Beschwerden in der Landessprache.
- Beleg: `npm run demo -- f18` → `docs/demos/F18/demo-output.txt` (Suche über acht europäische Orte: Beschwerden auf Griechisch, Ungarisch und Portugiesisch erkannt und bestätigt); Walkthrough `rezensionen` in `docs/demos/F18/walkthrough-P/` (Chania: griechische Schimmel-Beschwerden als Hinweis „Schimmel: 3 (3 in 6 Mon.)“), Screenshot gelesen.
- „A und B“ aus Bens Nachricht: dazu gab es in dieser Sitzung keine Frage von mir; nichts umgesetzt, bitte bei Bedarf noch einmal beschreiben.

### Abschlussprüfung F14–F18
- Alle Pfad-Walkthroughs zusammen (`npm run dogfood -- --mode P`, 25 Flows inkl. der neuen `themen`, `europa`, `fahrzeit`, `regionsname`, `rezensionen`): **405/405 Prüfungen bestanden**, keine Konsolenfehler; Bericht `docs/demos/Aufgaben-F14-F18/report-P-all.md`.
- Dabei behoben: Im Gesamtlauf liefen die letzten Flows in das Stundenlimit für Abfragen (HTTP 429), weil alle Flows als derselbe Besucher zählen. Das Walkthrough-Werkzeug setzt die Zähler jetzt vor jedem Flow zurück; die Limits im Produkt sind unverändert.
- `npm test` 478 grün, `npm run db:test` grün, Typecheck und Claims-Prüfung grün.

### F19 – Vorschläge nach Entfernung, Auto oder Flugzeug (30.09.2026)
- Ansatz: `docs/logik/ziel-qualitaet.md`; Gesamtanalyse: `docs/analyse-suche-buchung.md`.
- **Je weiter weg, desto besser der Ort:** Bis 4 h Fahrt ist alles willkommen (Wandern ab München: 8 Regionen inkl. ruhigerer Gebiete). Danach braucht eine Region einen Ort mit 4, ab 7 h 6, ab 12 h 8 Punkten (Top-Urlaubsort). Strand, Kultur und Shopping zählen die Fahrzeit doppelt: Strand ab München bis 20 h zeigt Rovinj, Barcelona, Cinque Terre (Monterosso), Dalmatien, Côte d’Azur – keine Nachbarorte. In einer Hotspot-Region bleiben auch etwas kleinere Orte (bis 1,5 Punkte darunter).
- **Schalter Auto / Flugzeug:** Im Flugmodus Kontinente zum Ankreuzen (ohne Häkchen alle), Flugzeit optional, keine Inlandsflüge, nur Top-Ziele (Barcelona, Kreta, Algarve, Mallorca …). Flugzeit ist Luftlinie/750 km/h + 45 min, nur Anzeige.
- **Norwegen:** Fjordnorwegen kommt im Flugmodus bei Bergpanorama und Natur (Bergen), nicht beim Strand.
- **Hinweis** „Je weiter das Ziel entfernt ist, desto bekannter muss es sein“ erscheint, sobald etwas ausgefiltert wurde.
- Offen: Katalog nur Europa (andere Kontinente: leere Liste mit Hinweis); keine Jahreszeit; Flugkosten nicht im Preisvergleich; Inseln beim Auto ohne Fähre. Details L1–L10 in der Analyse.
- Beleg: `npm run demo -- f19` → `docs/demos/F19/demo-output.txt`; Walkthrough `flugzeug` in `docs/demos/F19/`, Screenshots gelesen (auch 390 px).
