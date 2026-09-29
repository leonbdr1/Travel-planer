# FORTSCHRITT – Aufgabenliste vom 29.09.2026

Arbeitsweise: strikt der Reihe nach, eine Aufgabe gleichzeitig, jede Aufgabe mindestens ein eigener Commit. Zu Beginn jeder Sitzung zuerst diese Datei lesen und bei der ersten offenen Aufgabe weitermachen. Commit-Kennung der Aufgaben: `F<n>` (z. B. `F2`).

Branch: `claude/hopeful-fermat-jechzj`. Nichts davon ist deployt (Online schalten macht Ben).

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
- Offen: `architektur.md` 6.8 nennt noch den Median – Nachtrag in `docs/architektur-nachtrag.md`, Übernahme braucht Bens Freigabe.

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
- Offen/bekannte Grenze: Vorauswahl und Finale nehmen je Haus das günstigste Angebot nach Gesamtpreis (meist die kürzere Variante); Nachtrag für `architektur.md` in `docs/architektur-nachtrag.md` wartet auf Freigabe.

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

## Stand nach allen Aufgaben (29.09.2026)
Alle 14 Aufgaben (0–13) erledigt, committet und auf `claude/hopeful-fermat-jechzj` gepusht; nichts deployt. Offene Punkte für Ben: `architektur.md`-Nachtrag freigeben (`docs/architektur-nachtrag.md`), Migrationen `20261015a`/`20261016a` gegen Staging/Produktion, redaktionelle Prüfung der Orts-Attraktivität (BG-11), „Preis-Leistung“ und „Komfort“ überarbeiten (Aufgabe 0), Schwellen mit echten Daten kalibrieren.

### Abschlussprüfung
- Alle Pfad-Walkthroughs zusammen (`npm run dogfood -- --mode P`): 366/366 Prüfungen bestanden, Bericht in `docs/demos/Aufgaben-Gesamt/report-P-all.md`. Dabei behoben: lange Labels in „Deine Auswahl“ brechen auf 390 px jetzt um; eine veraltete Textprüfung im Walkthrough `ergebnisse` angepasst.
