# FORTSCHRITT – Aufgabenliste vom 29.09.2026

Arbeitsweise: strikt der Reihe nach, eine Aufgabe gleichzeitig, jede Aufgabe mindestens ein eigener Commit. Zu Beginn jeder Sitzung zuerst diese Datei lesen und bei der ersten offenen Aufgabe weitermachen. Commit-Kennung der Aufgaben: `F<n>` (z. B. `F2`).

Branch: `claude/hopeful-fermat-jechzj`. Nichts davon ist deployt (Online schalten macht Ben).

## Übersicht

- [x] **Aufgabe 0** – Priorisierung vermerkt: „Günstig und sauber“ zuerst, „Preis-Leistung“ und „Komfort“ aktuell unfertig
- [x] **Aufgabe 1** – Startseite im Stil üblicher Buchungsseiten (Ortssuche, Kalender mit zwei Klicks)
- [ ] **Aufgabe 2** – Rechenfehler „Alle Termine und Tarife“ (Vergleich nur über dasselbe Zimmer)
- [ ] **Aufgabe 3** – Standortsuche: Postleitzahlen, fehlende Orte, manuelle Mehrfachauswahl von Orten
- [ ] **Aufgabe 4** – Flexible Übernachtungsanzahl (z. B. 2 bis 3 Nächte)
- [ ] **Aufgabe 5** – Personenzahl und Zimmerlogik
- [ ] **Aufgabe 6** – Hotels und Ferienwohnungen fair unterscheiden (Bewertungsanzahl, Schimmel)
- [ ] **Aufgabe 7** – Qualitätswert und Bewertungsanzeige (echte Note und unser Wert nebeneinander)
- [ ] **Aufgabe 8** – Attraktivität von Regionen und Orten
- [ ] **Aufgabe 9** – Info-Button an der Preismatrix und Seite zum Filtersystem
- [ ] **Aufgabe 10** – Labels, Legende und Texte in „Deine Auswahl“
- [ ] **Aufgabe 11** – Bilder vergrößerbar (Lightbox)
- [ ] **Aufgabe 12** – Ausstattungs-Labels auf Deutsch
- [ ] **Aufgabe 13** – Kartenansicht für Regionen

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
