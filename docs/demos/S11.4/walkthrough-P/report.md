# Dogfood-Walkthrough 2026-09-28T14-04-29-P-all

- Modus: P – Pfad (Nutzerablauf mit Eingaben)
- Flows: suchrahmen, suche, ergebnisse, finale, warnungen, buchung
- Basis-URL: http://localhost:38335 (echter lokaler Stack, Anbieter im Fake-Modus)
- Stand: af85003, gestartet 2026-09-28T14:04:29.034Z
- Ergebnis: ✅ bestanden (171/171 Prüfungen erfüllt)

## Flow „suchrahmen“

Assistent Schritt 1 bis 3 (F1–F3): Startort per Autovervollständigung, Zeitfenster mit Live-Terminanzahl, Freitext per KI in Chips, Regionsvorschläge mit Begründung, Ortsliste mit Fahrzeiten, eigener Ort, Bestätigung.

### 01 Suchrahmen öffnen

- URL: `/suche`
- Screenshot: ![Suchrahmen öffnen](01-suchrahmen-o-ffnen.png)
- Prüfungen:
  - [x] enthält „Schritt“
  - [x] enthält „Suchrahmen“
  - [x] enthält „Regionen“
  - [x] enthält „Orte“
  - [x] enthält „Startort“
  - [x] enthält „Reiseart“
  - [x] enthält „Zeitfenster“
- Überschriften: „Deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl. [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 1 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Startort

Städte und Orte in Deutschland, Österreich, der Schweiz und Südtirol.

Maximale Fahrzeit (Auto)
Keine Begrenzung
1 Stunde
1 h 30 min
2 Stunden
2 h 30 min
3 Stunden
4 Stunden
5 Stunden
6 Stunden
Reiseart

Was möchtest du vor Ort machen? Mehrfachauswahl möglich.

Wandern
Bergpanorama
Seen
Natur und Ruhe
Radfahren
Wellness
Wintersport
Städte und Kultur
Wein und Kulinarik
Familie
Zeitfenster
Früheste Anreise
Späteste Abreise
Nächte
1
2
3
4
5
6
7
8
9
10
11
12
13
14
Anreise an diesen Wochentagen
Mo
Di
Mi
Do
Fr
Sa
So
Daraus entstehen 6 Termine: 09.10., 16.10., 23.10., 30.10. …
Reisende
Erwachsene
1
2
3
4
5
6
Zimmer
1
2
3
4
5
Kinder
Kind hinzufügen
Budget in € (optional)

Gilt für den gesamten Aufenthalt inklusive Steuern und Gebühren.

Worauf legst du Wert?

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

Wir sortieren danach aus, was nicht passt: zu teuer, zu schwach bewertet, mit Warnsignalen. Zwischen den besten Unterkünften entscheidest du am Ende selbst. Sterne und Mindestbewertung kannst du im Ergebnis unter „Weitere Filter“ setzen.

Wünsche an die Unterkunft
Besonders sauber
Ruhig
Mit Frühstück
Kostenlos stornierbar
Parkplatz
Hund erlaubt
Sauna oder Wellness
WLAN
Küche
Barrierefrei
Familienzimmer
Weitere Wünsche in eigenen Worten (optional)
Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl.
In Chips übersetzen
0/300
Weiter zu den Regionen
Orte direkt eingeben

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft
… (217 weitere Zeichen)
```

</details>

### 02 Startort „Stutt“ → Stuttgart

- URL: `/suche`
- Screenshot: ![Startort „Stutt“ → Stuttgart](02-startort-stutt-stuttgart.png)
- Prüfungen:
  - [x] Element `[data-origin="2825297"]` vorhanden (1)
- Überschriften: „Deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl. [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 1 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Startort

Städte und Orte in Deutschland, Österreich, der Schweiz und Südtirol.

Maximale Fahrzeit (Auto)
Keine Begrenzung
1 Stunde
1 h 30 min
2 Stunden
2 h 30 min
3 Stunden
4 Stunden
5 Stunden
6 Stunden
Reiseart

Was möchtest du vor Ort machen? Mehrfachauswahl möglich.

Wandern
Bergpanorama
Seen
Natur und Ruhe
Radfahren
Wellness
Wintersport
Städte und Kultur
Wein und Kulinarik
Familie
Zeitfenster
Früheste Anreise
Späteste Abreise
Nächte
1
2
3
4
5
6
7
8
9
10
11
12
13
14
Anreise an diesen Wochentagen
Mo
Di
Mi
Do
Fr
Sa
So
Daraus entstehen 6 Termine: 09.10., 16.10., 23.10., 30.10. …
Reisende
Erwachsene
1
2
3
4
5
6
Zimmer
1
2
3
4
5
Kinder
Kind hinzufügen
Budget in € (optional)

Gilt für den gesamten Aufenthalt inklusive Steuern und Gebühren.

Worauf legst du Wert?

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

Wir sortieren danach aus, was nicht passt: zu teuer, zu schwach bewertet, mit Warnsignalen. Zwischen den besten Unterkünften entscheidest du am Ende selbst. Sterne und Mindestbewertung kannst du im Ergebnis unter „Weitere Filter“ setzen.

Wünsche an die Unterkunft
Besonders sauber
Ruhig
Mit Frühstück
Kostenlos stornierbar
Parkplatz
Hund erlaubt
Sauna oder Wellness
WLAN
Küche
Barrierefrei
Familienzimmer
Weitere Wünsche in eigenen Worten (optional)
Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl.
In Chips übersetzen
0/300
Weiter zu den Regionen
Orte direkt eingeben

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft
… (217 weitere Zeichen)
```

</details>

### 03 Zeitfenster 01.10.–30.11.2026, 2 Nächte, Anreise Freitag, Wandern

- URL: `/suche`
- Screenshot: ![Zeitfenster 01.10.–30.11.2026, 2 Nächte, Anreise Freitag, Wandern](03-zeitfenster-01-10-30-11-2026-2-na-chte-a.png)
- Prüfungen:
  - [x] enthält „9 Termine“
  - [x] enthält „02.10.“
  - [x] enthält „Fr“
- Überschriften: „Deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl. [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 1 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Startort

Städte und Orte in Deutschland, Österreich, der Schweiz und Südtirol.

Maximale Fahrzeit (Auto)
Keine Begrenzung
1 Stunde
1 h 30 min
2 Stunden
2 h 30 min
3 Stunden
4 Stunden
5 Stunden
6 Stunden
Reiseart

Was möchtest du vor Ort machen? Mehrfachauswahl möglich.

Wandern
Bergpanorama
Seen
Natur und Ruhe
Radfahren
Wellness
Wintersport
Städte und Kultur
Wein und Kulinarik
Familie
Zeitfenster
Früheste Anreise
Späteste Abreise
Nächte
1
2
3
4
5
6
7
8
9
10
11
12
13
14
Anreise an diesen Wochentagen
Mo
Di
Mi
Do
Fr
Sa
So
Daraus entstehen 9 Termine: 02.10., 09.10., 16.10., 23.10. …
Reisende
Erwachsene
1
2
3
4
5
6
Zimmer
1
2
3
4
5
Kinder
Kind hinzufügen
Budget in € (optional)

Gilt für den gesamten Aufenthalt inklusive Steuern und Gebühren.

Worauf legst du Wert?

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

Wir sortieren danach aus, was nicht passt: zu teuer, zu schwach bewertet, mit Warnsignalen. Zwischen den besten Unterkünften entscheidest du am Ende selbst. Sterne und Mindestbewertung kannst du im Ergebnis unter „Weitere Filter“ setzen.

Wünsche an die Unterkunft
Besonders sauber
Ruhig
Mit Frühstück
Kostenlos stornierbar
Parkplatz
Hund erlaubt
Sauna oder Wellness
WLAN
Küche
Barrierefrei
Familienzimmer
Weitere Wünsche in eigenen Worten (optional)
Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl.
In Chips übersetzen
0/300
Weiter zu den Regionen
Orte direkt eingeben

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft
… (217 weitere Zeichen)
```

</details>

### 04 Zu viele Termine → verständliche Meldung

- URL: `/suche`
- Screenshot: ![Zu viele Termine → verständliche Meldung](04-zu-viele-termine-versta-ndliche-meldung.png)
- Notiz: Mit Fr, Sa und So entstehen zu viele Termine; danach wieder nur Freitag.
- Prüfungen:
  - [x] enthält „Möglich sind höchstens 12“
- Überschriften: „Deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl. [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 1 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Startort

Städte und Orte in Deutschland, Österreich, der Schweiz und Südtirol.

Maximale Fahrzeit (Auto)
Keine Begrenzung
1 Stunde
1 h 30 min
2 Stunden
2 h 30 min
3 Stunden
4 Stunden
5 Stunden
6 Stunden
Reiseart

Was möchtest du vor Ort machen? Mehrfachauswahl möglich.

Wandern
Bergpanorama
Seen
Natur und Ruhe
Radfahren
Wellness
Wintersport
Städte und Kultur
Wein und Kulinarik
Familie
Zeitfenster
Früheste Anreise
Späteste Abreise
Nächte
1
2
3
4
5
6
7
8
9
10
11
12
13
14
Anreise an diesen Wochentagen
Mo
Di
Mi
Do
Fr
Sa
So
Das ergibt 26 Termine. Möglich sind höchstens 12: Bitte verkürze das Zeitfenster oder wähle weniger Anreisetage.
Reisende
Erwachsene
1
2
3
4
5
6
Zimmer
1
2
3
4
5
Kinder
Kind hinzufügen
Budget in € (optional)

Gilt für den gesamten Aufenthalt inklusive Steuern und Gebühren.

Worauf legst du Wert?

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

Wir sortieren danach aus, was nicht passt: zu teuer, zu schwach bewertet, mit Warnsignalen. Zwischen den besten Unterkünften entscheidest du am Ende selbst. Sterne und Mindestbewertung kannst du im Ergebnis unter „Weitere Filter“ setzen.

Wünsche an die Unterkunft
Besonders sauber
Ruhig
Mit Frühstück
Kostenlos stornierbar
Parkplatz
Hund erlaubt
Sauna oder Wellness
WLAN
Küche
Barrierefrei
Familienzimmer
Weitere Wünsche in eigenen Worten (optional)
Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl.
In Chips übersetzen
0/300
Weiter zu den Regionen
Orte direkt eingeben

Reiseplaner

Wir vermitteln Unter
… (269 weitere Zeichen)
```

</details>

### 05 Freitext per KI in Chips übersetzen

- URL: `/suche`
- Screenshot: ![Freitext per KI in Chips übersetzen](05-freitext-per-ki-in-chips-u-bersetzen.png)
- Prüfungen:
  - [x] enthält „Nicht zugeordnet:“
  - [x] enthält „„Blick auf den See““
  - [x] enthält „Deine Eingabe wird per KI in Auswahl-Chips übersetzt“
  - [x] Element `[data-ai-provenance]` vorhanden (1)
  - [x] Element `[data-testid="wish-chips"] button[aria-pressed="true"]:has-text("Besonders sauber")` vorhanden (1)
  - [x] Element `[data-testid="wish-chips"] button[aria-pressed="true"]:has-text("Ruhig")` vorhanden (1)
- Überschriften: „Deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl. [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 1 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Startort

Städte und Orte in Deutschland, Österreich, der Schweiz und Südtirol.

Maximale Fahrzeit (Auto)
Keine Begrenzung
1 Stunde
1 h 30 min
2 Stunden
2 h 30 min
3 Stunden
4 Stunden
5 Stunden
6 Stunden
Reiseart

Was möchtest du vor Ort machen? Mehrfachauswahl möglich.

Wandern
Bergpanorama
Seen
Natur und Ruhe
Radfahren
Wellness
Wintersport
Städte und Kultur
Wein und Kulinarik
Familie
Zeitfenster
Früheste Anreise
Späteste Abreise
Nächte
1
2
3
4
5
6
7
8
9
10
11
12
13
14
Anreise an diesen Wochentagen
Mo
Di
Mi
Do
Fr
Sa
So
Daraus entstehen 9 Termine: 02.10., 09.10., 16.10., 23.10. …
Reisende
Erwachsene
1
2
3
4
5
6
Zimmer
1
2
3
4
5
Kinder
Kind hinzufügen
Budget in € (optional)

Gilt für den gesamten Aufenthalt inklusive Steuern und Gebühren.

Worauf legst du Wert?

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

Wir sortieren danach aus, was nicht passt: zu teuer, zu schwach bewertet, mit Warnsignalen. Zwischen den besten Unterkünften entscheidest du am Ende selbst. Sterne und Mindestbewertung kannst du im Ergebnis unter „Weitere Filter“ setzen.

Wünsche an die Unterkunft
Besonders sauber
Ruhig
Mit Frühstück
Kostenlos stornierbar
Parkplatz
Hund erlaubt
Sauna oder Wellness
WLAN
Küche
Barrierefrei
Familienzimmer
Weitere Wünsche in eigenen Worten (optional)
Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl.
In Chips übersetzen
35/300
Übernommen und vorausgewählt. Bitte prüfe die Auswahl.
Nicht zugeordnet: „Blick auf den See“. Diese Wünsche können wir nicht gezi
… (359 weitere Zeichen)
```

</details>

### 06 Regionsvorschläge mit Begründung

- URL: `/suche`
- Screenshot: ![Regionsvorschläge mit Begründung](06-regionsvorschla-ge-mit-begru-ndung.png)
- Prüfungen:
  - [x] enthält „Passende Regionen“
  - [x] enthält „passende Orte für Wandern“
  - [x] enthält „Fahrt“
  - [x] enthält „Weiter zu den Orten“
  - [x] Element `[data-testid="region-card"]` vorhanden (5)
  - [x] Element `[data-ai-provenance]` vorhanden (5)
- Überschriften: „Deine Suche“, „Passende Regionen“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 2 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Passende Regionen

Aus unserem Ortskatalog, erreichbar in deiner maximalen Fahrzeit. Wähle eine oder mehrere Regionen.

Schwarzwald
✓

9 passende Orte für Wandern, 50 min–2 h 11 min Fahrt

Mittelgebirge mit Feldberg, Titisee und Schluchsee, Wanderwegen und Kurorten.

KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Allgäu

8 passende Orte für Wandern, 2 h 4 min–2 h 37 min Fahrt

Voralpenland mit Almen, Seen und den Allgäuer Alpen rund um Oberstdorf und Füssen.

KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Pfälzerwald und Deutsche Weinstraße

6 passende Orte für Wandern, 1 h 22 min–1 h 45 min Fahrt

Weinorte entlang der Deutschen Weinstraße und der Pfälzerwald mit seinen Buntsandsteinfelsen.

KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Schwäbische Alb

6 passende Orte für Wandern, 44 min–1 h 14 min Fahrt

Karsthochfläche mit Wasserfällen, Höhlen und Burgen wie Schloss Lichtenstein.

KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Bregenzerwald und Montafon

6 passende Orte für Wandern, 2 h 17 min–2 h 46 min Fahrt

Vorarlberg zwischen Bodensee, Bregenzerwald mit Holzbaukultur und dem Montafon.

KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Zurück
Weiter zu den Orten
Überspringen und Orte selbst eingeben

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenSt
… (26 weitere Zeichen)
```

</details>

### 07 Ortsliste mit Fahrzeiten

- URL: `/suche`
- Screenshot: ![Ortsliste mit Fahrzeiten](07-ortsliste-mit-fahrzeiten.png)
- Notiz: 5 Regionen vorgeschlagen.
- Prüfungen:
  - [x] enthält „Orte für deine Suche“
  - [x] enthält „Fahrzeit“
  - [x] enthält „von 10 Orten ausgewählt“
  - [x] enthält „Kombinationen“
- Überschriften: „Deine Suche“, „Orte für deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 3 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Orte für deine Suche

Wir durchsuchen alle ausgewählten Orte an allen Terminen. Streiche Orte oder füge eigene hinzu.

9 von 10 Orten ausgewählt
9 Orte × 9 Termine = 81 Kombinationen
Schwarzwald
Baiersbronn
Fahrzeit 1 h 20 min

Weitläufige Gemeinde im Nordschwarzwald nahe dem Nationalpark, bekannt für ihre Gastronomie.

Wandern
Wein und Kulinarik
Natur und Ruhe
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Hinterzarten
Fahrzeit 1 h 49 min

Kurort im Hochschwarzwald mit Moor, Ravennaschlucht und Skisprungschanze.

Wandern
Natur und Ruhe
Wellness
Wintersport
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Titisee-Neustadt
Fahrzeit 1 h 52 min

Ferienort am Titisee, nah an Feldberg und Wutachschlucht.

Seen
Wandern
Familie
Wintersport
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Todtnau
Fahrzeit 1 h 57 min

Ort am Feldberg mit Wasserfall, Rodelbahn und Skigebieten.

Wandern
Familie
Wintersport
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Bad Wildbad
Fahrzeit 50 min

Thermalkurort im Enztal mit Baumwipfelpfad auf dem Sommerberg.

Wellness
Familie
Wandern
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Freudenstadt
Fahrzeit 1 h 15 min

Stadt mit weitläufigem Marktplatz und Wegen in den Nordschwarzwald.

Städte und Kultur
Wandern
Wellness
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Triberg im Schwarzwald
Fahrzeit 1 h 33 min

Ort an den Triberger Wasserfällen mit Kuckucksuhren-Tradition.

Familie
Städte und Kultur
Wandern
KI-gestützt erstellt, redaktionelle Prüfung ausst
… (777 weitere Zeichen)
```

</details>

### 08 Eigenen Ort hinzufügen (Tübingen)

- URL: `/suche`
- Screenshot: ![Eigenen Ort hinzufügen (Tübingen)](08-eigenen-ort-hinzufu-gen-tu-bingen.png)
- Prüfungen:
  - [x] enthält „Tübingen“
  - [x] enthält „Eigener Ort“
- Überschriften: „Deine Suche“, „Orte für deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“, „KI-gestützt erstellt, redaktionelle Prüfung ausstehend [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 3 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Orte für deine Suche

Wir durchsuchen alle ausgewählten Orte an allen Terminen. Streiche Orte oder füge eigene hinzu.

10 von 10 Orten ausgewählt
10 Orte × 9 Termine = 90 Kombinationen
Schwarzwald
Baiersbronn
Fahrzeit 1 h 20 min

Weitläufige Gemeinde im Nordschwarzwald nahe dem Nationalpark, bekannt für ihre Gastronomie.

Wandern
Wein und Kulinarik
Natur und Ruhe
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Hinterzarten
Fahrzeit 1 h 49 min

Kurort im Hochschwarzwald mit Moor, Ravennaschlucht und Skisprungschanze.

Wandern
Natur und Ruhe
Wellness
Wintersport
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Titisee-Neustadt
Fahrzeit 1 h 52 min

Ferienort am Titisee, nah an Feldberg und Wutachschlucht.

Seen
Wandern
Familie
Wintersport
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Todtnau
Fahrzeit 1 h 57 min

Ort am Feldberg mit Wasserfall, Rodelbahn und Skigebieten.

Wandern
Familie
Wintersport
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Bad Wildbad
Fahrzeit 50 min

Thermalkurort im Enztal mit Baumwipfelpfad auf dem Sommerberg.

Wellness
Familie
Wandern
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Freudenstadt
Fahrzeit 1 h 15 min

Stadt mit weitläufigem Marktplatz und Wegen in den Nordschwarzwald.

Städte und Kultur
Wandern
Wellness
KI-gestützt erstellt, redaktionelle Prüfung ausstehend
Triberg im Schwarzwald
Fahrzeit 1 h 33 min

Ort an den Triberger Wasserfällen mit Kuckucksuhren-Tradition.

Familie
Städte und Kultur
Wandern
KI-gestützt erstellt, redaktionelle Prüfung aus
… (857 weitere Zeichen)
```

</details>

### 09 Ortsliste bestätigen

- URL: `/suche`
- Screenshot: ![Ortsliste bestätigen](09-ortsliste-besta-tigen.png)
- Prüfungen:
  - [x] enthält „Ortsliste bestätigt“
  - [x] enthält „Kombinationen“
- Überschriften: „Deine Suche“, „Ortsliste bestätigt“, „Suche starten“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 3 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Ortsliste bestätigt

10 Orte × 9 Termine = 90 Kombinationen

Suche starten

Wir fragen jetzt alle Kombinationen aus Ort und Termin gleichzeitig ab. Das dauert meist unter einer Minute.

Baiersbronn
Hinterzarten
Titisee-Neustadt
Todtnau
Bad Wildbad
Freudenstadt
Triberg im Schwarzwald
Schluchsee
St. Blasien
Tübingen
Zurück
Suche starten

Zum Schutz vor automatisierten Anfragen löst dein Browser eine kleine Rechenaufgabe. Es werden keine Cookies gesetzt.

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

## Flow „suche“

Kombinationssuche (F4): 5 Orte × 12 Termine, Start mit ALTCHA im Browser, Fortschritt „x von 60“, Matrix füllt sich live, Hinweis bei Teilergebnissen.

### 10 Ortsliste bestätigt: 60 Kombinationen

- URL: `/suche`
- Screenshot: ![Ortsliste bestätigt: 60 Kombinationen](10-ortsliste-besta-tigt-60-kombinationen.png)
- Prüfungen:
  - [x] enthält „Ortsliste bestätigt“
  - [x] enthält „5 Orte × 12 Termine = 60 Kombinationen“
  - [x] enthält „Suche starten“
  - [x] enthält „Rechenaufgabe“
- Überschriften: „Deine Suche“, „Ortsliste bestätigt“, „Suche starten“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 3 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Ortsliste bestätigt

5 Orte × 12 Termine = 60 Kombinationen

Suche starten

Wir fragen jetzt alle Kombinationen aus Ort und Termin gleichzeitig ab. Das dauert meist unter einer Minute.

Baiersbronn
Hinterzarten
Titisee-Neustadt
Todtnau
Bad Wildbad
Zurück
Suche starten

Zum Schutz vor automatisierten Anfragen löst dein Browser eine kleine Rechenaufgabe. Es werden keine Cookies gesetzt.

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 11 Suche gestartet: Fortschritt und Matrix mit Platzhaltern

- URL: `/suche/d6744399-80d4-4e46-a15a-d565007fbc1a#t=vCGfCStVQT24qwuBzuRRy3y6TMb0Y7eIIT5MECF0UHk`
- Screenshot: ![Suche gestartet: Fortschritt und Matrix mit Platzhaltern](11-suche-gestartet-fortschritt-und-matrix-m.png)
- Prüfungen:
  - [x] enthält „Kombinationen“
  - [x] enthält „Preis-Matrix“
  - [x] Element `[data-testid="matrix"]` vorhanden (1)
  - [x] Element `[role="progressbar"]` vorhanden (1)
- Überschriften: „Deine Suche läuft“, „Preis-Matrix (Gesamtpreis ab)“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Deine Suche läuft

12 von 60 Kombinationen

241 Angebote

Preis-Matrix (Gesamtpreis ab)
Ort	Fr 02.10.	Fr 09.10.	Fr 16.10.	Fr 23.10.	Fr 30.10.	Fr 06.11.	Fr 13.11.	Fr 20.11.	Fr 27.11.	Fr 04.12.	Fr 11.12.	Fr 18.12.
Baiersbronn	ab 177 €	ab 142 €	ab 153 €	ab 157 €	ab 206 €	ab 142 €	ab 149 €	ab 105 €	ab 118 €	ab 184 €	ab 158 €	ab 161 €
Hinterzarten												
Titisee-Neustadt												
Todtnau												
Bad Wildbad												
Neue Suche

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 12 Suche abgeschlossen: 60 von 60, Matrix gefüllt

- URL: `/suche/d6744399-80d4-4e46-a15a-d565007fbc1a#t=vCGfCStVQT24qwuBzuRRy3y6TMb0Y7eIIT5MECF0UHk`
- Screenshot: ![Suche abgeschlossen: 60 von 60, Matrix gefüllt](12-suche-abgeschlossen-60-von-60-matrix-gef.png)
- Notiz: Matrix: 60 Zellen mit Angebot, 0 ohne Daten.
- Prüfungen:
  - [x] enthält „60 von 60 Kombinationen“
  - [x] enthält „Angebote“
  - [x] enthält „ab “
  - [x] enthält nicht „wird gesucht“
  - [x] Element `[data-testid="matrix"] td[data-state="offer"]` vorhanden (60)
- Überschriften: „Deine Suche läuft“, „Preis-Matrix (Gesamtpreis ab)“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Deine Suche läuft

60 von 60 Kombinationen

810 Angebote

Alle Kombinationen sind abgefragt. Wir prüfen jetzt die Rezensionen der besten Unterkünfte …
Preis-Matrix (Gesamtpreis ab)
Ort	Fr 02.10.	Fr 09.10.	Fr 16.10.	Fr 23.10.	Fr 30.10.	Fr 06.11.	Fr 13.11.	Fr 20.11.	Fr 27.11.	Fr 04.12.	Fr 11.12.	Fr 18.12.
Baiersbronn	ab 177 €	ab 142 €	ab 153 €	ab 157 €	ab 206 €	ab 142 €	ab 149 €	ab 105 €	ab 118 €	ab 184 €	ab 158 €	ab 161 €
Hinterzarten	ab 123 €	ab 188 €	ab 185 €	ab 179 €	ab 176 €	ab 156 €	ab 145 €	ab 95 €	ab 142 €	ab 137 €	ab 203 €	ab 190 €
Titisee-Neustadt	ab 197 €	ab 138 €	ab 112 €	ab 159 €	ab 161 €	ab 124 €	ab 149 €	ab 84 €	ab 158 €	ab 174 €	ab 168 €	ab 163 €
Todtnau	ab 206 €	ab 216 €	ab 190 €	ab 167 €	ab 206 €	ab 170 €	ab 154 €	ab 168 €	ab 115 €	ab 205 €	ab 221 €	ab 211 €
Bad Wildbad	ab 144 €	ab 143 €	ab 121 €	ab 151 €	ab 155 €	ab 123 €	ab 83 €	ab 122 €	ab 114 €	ab 158 €	ab 151 €	ab 107 €
Neue Suche

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

## Flow „ergebnisse“

Ergebnisse (F5, F7, F9, F10, Akzeptanzbeispiel 1): Suche Stuttgart, 5 Orte × 9 Freitage; Matrix mit Farbstufen, Liste mit Schnäppchen-Begründung, Sortierung, Zellfilter, Filter ohne neue Suche, Detailansicht mit Score-Aufschlüsselung, Seite zur Rangliste.

### 13 Suche 5 Orte × 9 Termine gestartet und abgeschlossen

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Suche 5 Orte × 9 Termine gestartet und abgeschlossen](13-suche-5-orte-9-termine-gestartet-und-abg.png)
- Prüfungen:
  - [x] enthält „45 von 45 Kombinationen“
  - [x] enthält „Deine Auswahl“
  - [x] enthält „Alle Angebote“
  - [x] enthält „Preise abgerufen um“
  - [x] enthält „Bestes Angebot“
  - [x] enthält „So berechnen wir die Rangliste“
  - [x] enthält „pro Nacht“
  - [x] enthält „Schnäppchen“
  - [x] Element `[data-testid="result-matrix"]` vorhanden (1)
  - [x] Element `[data-testid="bargain-reason"]` vorhanden (31)
  - [x] Element `[data-testid="result-filters"]` vorhanden (1)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

45 von 45 Kombinationen

605 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

41 Unterkünfte aussortiert
Günstigste deiner Auswahl
Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

GESAMTPREIS
84 €
Details und Buchung

+11 € gegenüber Hotel Almrausch

Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 20.11. – So 22.11.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

Dafür: Ruhig · Küche

Dafür nicht: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere

anderer Ort: Hinterzarten

GESAMTPREIS
95 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Gasthof Rose
8,9
1059 Bewertungen
★★
Ruhig
Bequeme Betten
Gute Lage

Baiersbronn · Fr 20.11. – So 22.11.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

Dafür: Ruhig · Bequeme Betten · Gute Lage · + 2 weitere

Dafür nicht: Sauna oder Wellness · Besonders sauber

Bewertung +1,1 · anderer Ort: Baiersbronn

GESAMTPREIS
105 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard
… (18620 weitere Zeichen)
```

</details>

### 14 Sortierung nach Preis

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Sortierung nach Preis](14-sortierung-nach-preis.png)
- Notiz: Matrix mit 45 Zellen; Liste mit 46 Einträgen, jede Unterkunft genau einmal (46 verschiedene Unterkünfte).
- Prüfungen:
  - [x] Element `[data-testid="sort"] [aria-checked="true"]` vorhanden (1)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

45 von 45 Kombinationen

605 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

41 Unterkünfte aussortiert
Günstigste deiner Auswahl
Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

GESAMTPREIS
84 €
Details und Buchung

+11 € gegenüber Hotel Almrausch

Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 20.11. – So 22.11.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

Dafür: Ruhig · Küche

Dafür nicht: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere

anderer Ort: Hinterzarten

GESAMTPREIS
95 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Gasthof Rose
8,9
1059 Bewertungen
★★
Ruhig
Bequeme Betten
Gute Lage

Baiersbronn · Fr 20.11. – So 22.11.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

Dafür: Ruhig · Bequeme Betten · Gute Lage · + 2 weitere

Dafür nicht: Sauna oder Wellness · Besonders sauber

Bewertung +1,1 · anderer Ort: Baiersbronn

GESAMTPREIS
105 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard
… (18547 weitere Zeichen)
```

</details>

### 15 Klick auf eine Matrix-Zelle filtert die Liste

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Klick auf eine Matrix-Zelle filtert die Liste](15-klick-auf-eine-matrix-zelle-filtert-die-.png)
- Prüfungen:
  - [x] enthält „Nur “
  - [x] enthält „Alle Orte und Termine zeigen“
  - [x] Element `[data-testid="result-list"]` vorhanden (1)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

45 von 45 Kombinationen

605 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

41 Unterkünfte aussortiert
Günstigste deiner Auswahl
Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

GESAMTPREIS
84 €
Details und Buchung

+11 € gegenüber Hotel Almrausch

Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 20.11. – So 22.11.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

Dafür: Ruhig · Küche

Dafür nicht: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere

anderer Ort: Hinterzarten

GESAMTPREIS
95 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Gasthof Rose
8,9
1059 Bewertungen
★★
Ruhig
Bequeme Betten
Gute Lage

Baiersbronn · Fr 20.11. – So 22.11.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

Dafür: Ruhig · Bequeme Betten · Gute Lage · + 2 weitere

Dafür nicht: Sauna oder Wellness · Besonders sauber

Bewertung +1,1 · anderer Ort: Baiersbronn

GESAMTPREIS
105 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard
… (5257 weitere Zeichen)
```

</details>

### 16 Filter ohne neue Suche: Budget 200 € lässt einen Teil übrig

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Filter ohne neue Suche: Budget 200 € lässt einen Teil übrig](16-filter-ohne-neue-suche-budget-200-la-sst.png)
- Notiz: Budget 200 €: 32 Unterkünfte, 200 passende Angebote (vorher: 46 Unterkünfte, 605 passende Angebote); alle 32 angezeigten Gesamtpreise ≤ 200 €.
- Prüfungen:
  - [x] Element `[data-testid="result-total"]` vorhanden (32)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

45 von 45 Kombinationen

605 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

41 Unterkünfte aussortiert
Günstigste deiner Auswahl
Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

GESAMTPREIS
84 €
Details und Buchung

+11 € gegenüber Hotel Almrausch

Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 20.11. – So 22.11.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

Dafür: Ruhig · Küche

Dafür nicht: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere

anderer Ort: Hinterzarten

GESAMTPREIS
95 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Gasthof Rose
8,9
1059 Bewertungen
★★
Ruhig
Bequeme Betten
Gute Lage

Baiersbronn · Fr 20.11. – So 22.11.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 18.11.2026, 17:00

Dafür: Ruhig · Bequeme Betten · Gute Lage · + 2 weitere

Dafür nicht: Sauna oder Wellness · Besonders sauber

Bewertung +1,1 · anderer Ort: Baiersbronn

GESAMTPREIS
105 €
Details und Buchung

+21 € gegenüber Hotel Almrausch

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 20.11. – So 22.11.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard
… (11922 weitere Zeichen)
```

</details>

### 17 Filter ohne neue Suche: Budget 50 €

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Filter ohne neue Suche: Budget 50 €](17-filter-ohne-neue-suche-budget-50.png)
- Prüfungen:
  - [x] enthält „Keine Unterkunft erfüllt diese Filter“
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

45 von 45 Kombinationen

605 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

46 Unterkünfte aussortiert
Keine Unterkunft passt zu deinem Ziel und deinen Filtern. Probiere ein anderes Ziel oder sieh dir alle Angebote an.
Alle Angebote

Jede Unterkunft mit ihrem besten Angebot, mit Filtern, Sortierung und Preis-Matrix.

0 Unterkünfte, 0 passende Angebote

Preise abgerufen um 16:04 Uhr. Preise können sich bis zur Buchung ändern.

Sortierung
Bestes Angebot
Preis
Bewertung
So berechnen wir die Rangliste
Filter
Budget gesamt (€)
Verpflegung
egal
ohne
Frühstück
Halbpension
Vollpension
All inclusive
Nur kostenlos stornierbar
Weitere Filter: Sterne und Bewertungen
Filter anwenden
Filter der Suche
Ort	Fr 02.10.	Fr 09.10.	Fr 16.10.	Fr 23.10.	Fr 30.10.	Fr 06.11.	Fr 13.11.	Fr 20.11.	Fr 27.11.
Baiersbronn	–	–	–	–	–	–	–	–	–
Hinterzarten	–	–	–	–	–	–	–	–	–
Titisee-Neustadt	–	–	–	–	–	–	–	–	–
Todtnau	–	–	–	–	–	–	–	–	–
Bad Wildbad	–	–	–	–	–	–	–	–	–

Klicke auf eine Zelle, um nur diese Kombination zu sehen. Grün = günstig, Orange = teuer. ★ = Schnäppchen · – = kein passendes Angebot · „keine Daten“ = für diese Kombination kam keine Antwort

Keine Unterkunft erfüllt diese Filter. Lockere die Filter, um mehr Ergebnisse zu sehen.
Neue Suche

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste


… (117 weitere Zeichen)
```

</details>

### 18 Detailansicht mit allen Terminen und Score-Aufschlüsselung

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a/unterkunft/lpf-4792-819-0#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Detailansicht mit allen Terminen und Score-Aufschlüsselung](18-detailansicht-mit-allen-terminen-und-sco.png)
- Prüfungen:
  - [x] enthält „Alle Termine und Tarife“
  - [x] enthält „So setzt sich der Qualitätswert zusammen“
  - [x] enthält „Aktualität“
  - [x] enthält „Rezensionscheck“
  - [x] enthält „Bewertungen geprüft am“
  - [x] enthält „Buchen“
  - [x] Element `[data-testid="score-breakdown"]` vorhanden (1)
  - [x] Element `[data-testid="book-offer"]` vorhanden (5)
- Überschriften: „Hotel Almrausch“, „Alle Termine und Tarife“, „So setzt sich der Qualitätswert zusammen“, „Rezensionscheck“, „Beschreibung“, „Ausstattung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zu den Ergebnissen
Hotel Almrausch

★★ · Hotel · Bergstraße 7

7,8
49 Bewertungen
Alle Termine und Tarife
Termin	Zimmer und Tarif	Stornierung	Preis	

Fr 09.10. – So 11.10.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 48 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 07.10.2026, 18:00	
158 €
79,25 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 23.10. – So 25.10.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 47 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 21.10.2026, 18:00	
159 €
79,56 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 30.10. – So 01.11.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 45 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 28.10.2026, 17:00	
161 €
80,59 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 06.11. – So 08.11.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 88 % besser als der Durchschnitt deiner Suche · 22 % günstiger als dieselbe Unterkunft an deinen anderen Terminen
	kostenlos stornierbar bis 04.11.2026, 17:00	
124 €
62,20 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 20.11. – So 22.11.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 178 % besser als der Durchschnitt deiner Suche · 47 % günstiger als dieselbe Unterkunft an deinen anderen Termi
… (1559 weitere Zeichen)
```

</details>

### 19 Vergleichspreis auf Abruf

- URL: `/suche/29297711-cb73-47ff-abba-02c463b6ec1a/unterkunft/lpf-4792-819-0#t=vEonUv8OCmnSuRBXOey5auBSXOotBuolSQvHD7ZhyPQ`
- Screenshot: ![Vergleichspreis auf Abruf](19-vergleichspreis-auf-abruf.png)
- Notiz: Vergleichspreise für 3 Termine: Für diesen Termin liegt kein öffentlicher Vergleichspreis vor. | Öffentlicher Preis bei Expedia: 155 € | Öffentlicher Preis bei Expedia: 170 €
- Prüfungen:
  - [x] enthält nicht „Bestpreis“
  - [x] enthält nicht „spare“
  - [x] enthält nicht „günstiger als bei“
  - [x] Element `[data-testid="reference-price"]` vorhanden (3)
- Überschriften: „Hotel Almrausch“, „Alle Termine und Tarife“, „So setzt sich der Qualitätswert zusammen“, „Rezensionscheck“, „Beschreibung“, „Ausstattung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zu den Ergebnissen
Hotel Almrausch

★★ · Hotel · Bergstraße 7

7,8
49 Bewertungen
Alle Termine und Tarife
Termin	Zimmer und Tarif	Stornierung	Preis	

Fr 09.10. – So 11.10.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 48 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 07.10.2026, 18:00	
158 €
79,25 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)

Für diesen Termin liegt kein öffentlicher Vergleichspreis vor.

	Buchen

Fr 23.10. – So 25.10.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 47 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 21.10.2026, 18:00	
159 €
79,56 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)

Öffentlicher Preis bei Expedia: 155 €

Zwischengespeicherter Preis für denselben Aufenthalt, Stand 16:05 Uhr. Zimmer und Bedingungen können abweichen.

	Buchen

Fr 30.10. – So 01.11.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 45 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 28.10.2026, 17:00	
161 €
80,59 € pro Nacht
zzgl. 8,40 € vor Ort (z. B. Kurtaxe)

Öffentlicher Preis bei Expedia: 170 €

Zwischengespeicherter Preis für denselben Aufenthalt, Stand 16:05 Uhr. Zimmer und Bedingungen können abweichen.

	Buchen

Fr 06.11. – So 08.11.
Titisee-Neustadt
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 88 % besser als der Durchschnitt deiner Suche · 22 % günstiger als dieselbe Unterkunft an deinen anderen Terminen
	kostenlos stornierbar bis 04.11.2026, 17:00	
124 €
62,20 € 
… (1855 weitere Zeichen)
```

</details>

### 20 Seite „So berechnen wir die Rangliste“

- URL: `/ranking`
- Screenshot: ![Seite „So berechnen wir die Rangliste“](20-seite-so-berechnen-wir-die-rangliste.png)
- Prüfungen:
  - [x] enthält „Qualitätswert“
  - [x] enthält „Preis“
  - [x] enthält „Schnäppchen“
  - [x] enthält „Provisionen oder Margen haben keinen Einfluss“
- Überschriften: „So berechnen wir die Rangliste“, „Qualitätswert“, „Preis“, „Schnäppchen“, „„Deine Auswahl“: So sortieren wir vor“, „Lob-Labels“, „Andere Sortierungen“, „Was nicht einfließt“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
So berechnen wir die Rangliste

Die Standardsortierung „Bestes Angebot“ verbindet Qualität und Preis. Wir erklären hier die Hauptkriterien, damit du nachvollziehen kannst, warum ein Angebot oben steht.

Qualitätswert

Grundlage ist der Durchschnitt der Gästebewertungen. Unterkünfte mit wenigen Bewertungen werden zum Gesamtmittel gezogen, damit eine 5,0 aus drei Bewertungen nicht vor einer 9,0 aus 400 Bewertungen landet. Wo verfügbar, fließen die Aktualität der Bewertungen, ein gesonderter Sauberkeitswert und Warnhinweise aus dem Rezensionscheck ein.

Preis

Verglichen wird der Gesamtpreis des Aufenthalts inklusive aller im Voraus zu zahlenden Steuern und Gebühren, umgerechnet auf den Preis pro Nacht. Der Rangwert gewichtet Qualität mit 60 % und den Preis mit 40 %. Schnäppchen erhalten einen Bonus von 5 Prozentpunkten.

Schnäppchen

Ein Angebot gilt als Schnäppchen, wenn es im Vergleich innerhalb deiner Suche deutlich günstiger ist: gegenüber dem Durchschnitt aller Treffer, gegenüber derselben Unterkunft an deinen anderen Terminen oder gegenüber vergleichbaren Unterkünften im selben Ort. Jede Markierung nennt ihre Begründung.

„Deine Auswahl“: So sortieren wir vor

Je nach deinem Ziel sortieren wir Unterkünfte aus, die deine Filter nicht erfüllen, keine Bewertungen haben, bei denen Gäste von Schimmel, Ungeziefer oder Schmutz berichten, die 4 oder mehr Sterne zum Preis eines einfachen Hauses haben, aber keine geprüften guten Bewertungen, die für dein Ziel zu schwach bewertet oder zu teuer sind, oder für die es ein Angebot gibt, das nicht teurer, mindestens gleich gut bewertet ist u
… (1167 weitere Zeichen)
```

</details>

## Flow „finale“

Entscheidungshilfe (F15–F17, konzept.md 9.9–9.11): Ziel „Günstig und sauber“ im Suchformular, Suche Stuttgart → 5 Orte × 3 Freitage; oben „Deine Auswahl“ mit höchstens 4 Finalisten, die günstigste zuerst, bei den anderen Aufpreis und was er bringt, ohne Empfehlung; aussortierte Unterkünfte mit Gründen; Zielwechsel ohne neue Suche; Lob-Labels in Liste und Detailansicht; Sterne und Mindestbewertung unter „Weitere Filter“.

### 21 Suchformular: Ziel „Günstig und sauber“ mit einem Tipp

- URL: `/suche`
- Screenshot: ![Suchformular: Ziel „Günstig und sauber“ mit einem Tipp](21-suchformular-ziel-gu-nstig-und-sauber-mi.png)
- Prüfungen:
  - [x] enthält „Worauf legst du Wert?“
  - [x] enthält „Günstig und sauber“
  - [x] enthält „Preis-Leistung“
  - [x] enthält „Komfort“
  - [x] enthält „Der Preis zählt am meisten, Sauberkeit ist Pflicht.“
  - [x] enthält „Weitere Filter“
  - [x] enthält nicht „Mindestens Sterne“
  - [x] enthält nicht „Mindeststandard“
  - [x] Element `[data-testid="goal-switch"] [aria-checked="true"][data-goal="sparen"]` vorhanden (1)
- Überschriften: „Deine Suche“
- KI-Kennzeichnungen (`data-ai-provenance`): „Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl. [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 1 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Startort

Städte und Orte in Deutschland, Österreich, der Schweiz und Südtirol.

Maximale Fahrzeit (Auto)
Keine Begrenzung
1 Stunde
1 h 30 min
2 Stunden
2 h 30 min
3 Stunden
4 Stunden
5 Stunden
6 Stunden
Reiseart

Was möchtest du vor Ort machen? Mehrfachauswahl möglich.

Wandern
Bergpanorama
Seen
Natur und Ruhe
Radfahren
Wellness
Wintersport
Städte und Kultur
Wein und Kulinarik
Familie
Zeitfenster
Früheste Anreise
Späteste Abreise
Nächte
1
2
3
4
5
6
7
8
9
10
11
12
13
14
Anreise an diesen Wochentagen
Mo
Di
Mi
Do
Fr
Sa
So
Daraus entstehen 3 Termine: 02.10., 09.10., 16.10.
Reisende
Erwachsene
1
2
3
4
5
6
Zimmer
1
2
3
4
5
Kinder
Kind hinzufügen
Budget in € (optional)

Gilt für den gesamten Aufenthalt inklusive Steuern und Gebühren.

Worauf legst du Wert?

Günstig und sauber
Preis-Leistung
Komfort

Der Preis zählt am meisten, Sauberkeit ist Pflicht.

Wir sortieren danach aus, was nicht passt: zu teuer, zu schwach bewertet, mit Warnsignalen. Zwischen den besten Unterkünften entscheidest du am Ende selbst. Sterne und Mindestbewertung kannst du im Ergebnis unter „Weitere Filter“ setzen.

Wünsche an die Unterkunft
Besonders sauber
Ruhig
Mit Frühstück
Kostenlos stornierbar
Parkplatz
Hund erlaubt
Sauna oder Wellness
WLAN
Küche
Barrierefrei
Familienzimmer
Weitere Wünsche in eigenen Worten (optional)
Deine Eingabe wird per KI in Auswahl-Chips übersetzt. Bitte prüfe die Auswahl.
In Chips übersetzen
0/300
Weiter zu den Regionen
Orte direkt eingeben

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterku
… (220 weitere Zeichen)
```

</details>

### 22 Suche abgeschlossen: „Deine Auswahl“ steht oben

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Suche abgeschlossen: „Deine Auswahl“ steht oben](22-suche-abgeschlossen-deine-auswahl-steht-.png)
- Notiz: 3 Finalisten, Gesamtpreise 122.69 € · 137.94 € · 158.49 €; Aufpreise +15.25 €, +35.8 €.
- Prüfungen:
  - [x] enthält „Deine Auswahl“
  - [x] enthält „Wir haben aussortiert“
  - [x] enthält „Günstigste deiner Auswahl“
  - [x] enthält „aussortiert“
  - [x] enthält „Wir empfehlen keinen Favoriten“
  - [x] enthält „Alle Angebote“
  - [x] enthält nicht „Unsere Empfehlung“
  - [x] enthält nicht „Testsieger“
  - [x] Element `[data-testid="finalist"]` vorhanden (3)
  - [x] Element `[data-testid="excluded"]` vorhanden (1)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

15 von 15 Kombinationen

204 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Der Preis zählt am meisten, Sauberkeit ist Pflicht.

43 Unterkünfte aussortiert
Günstigste deiner Auswahl
Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 02.10. – So 04.10.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

GESAMTPREIS
123 €
Details und Buchung

+15 € gegenüber Apartments Alpenblick

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklusive · kostenlos stornierbar · Gutes Frühstück · + 6 weitere

Dafür nicht: Ruhig · Küche

anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
138 €
Details und Buchung

+36 € gegenüber Apartments Alpenblick

Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere

Dafür nicht: Ruhig · Küche

anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
158 €
Details und Buchung

Ob dir ein Aufpreis das wert ist, entscheidest du. Wir empfehlen keinen Favoriten.

Alle A
… (16270 weitere Zeichen)
```

</details>

### 23 Aussortiert, mit Grund und Anzahl

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Aussortiert, mit Grund und Anzahl](23-aussortiert-mit-grund-und-anzahl.png)
- Notiz: Gründe: 1 ohne Bewertungen: Sauberkeit nicht einschätzbar | 1 mit Warnsignalen: Gäste berichten von Schimmel, Ungeziefer oder Schmutz | 7 zu schwach bewertet für dein Ziel | 31 zu teuer für dein Ziel | 3 mit einem besseren Angebot: nicht teurer, mindestens gleich gut bewertet, mit allem, was dieses bietet
- Prüfungen:
  - [x] enthält „zu teuer für dein Ziel“
  - [x] Element `[data-testid="excluded"] li[data-reason]` vorhanden (5)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

15 von 15 Kombinationen

204 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Der Preis zählt am meisten, Sauberkeit ist Pflicht.

43 Unterkünfte aussortiert
1 ohne Bewertungen: Sauberkeit nicht einschätzbar
1 mit Warnsignalen: Gäste berichten von Schimmel, Ungeziefer oder Schmutz
7 zu schwach bewertet für dein Ziel
31 zu teuer für dein Ziel
3 mit einem besseren Angebot: nicht teurer, mindestens gleich gut bewertet, mit allem, was dieses bietet
Günstigste deiner Auswahl
Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 02.10. – So 04.10.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

GESAMTPREIS
123 €
Details und Buchung

+15 € gegenüber Apartments Alpenblick

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklusive · kostenlos stornierbar · Gutes Frühstück · + 6 weitere

Dafür nicht: Ruhig · Küche

anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
138 €
Details und Buchung

+36 € gegenüber Apartments Alpenblick

Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklu
… (16561 weitere Zeichen)
```

</details>

### 24 Aufpreis und was er bringt oder kostet

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Aufpreis und was er bringt oder kostet](24-aufpreis-und-was-er-bringt-oder-kostet.png)
- Notiz: Vergleich: Dafür: Frühstück inklusive · kostenlos stornierbar · Gutes Frühstück · + 6 weitere /  / Dafür nicht: Ruhig · Küche /  / anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10. || Dafür: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere /  / Dafür nicht: Ruhig · Küche /  / anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.
- Prüfungen:
  - [x] enthält „gegenüber“
  - [x] Element `[data-testid="comparison"]` vorhanden (2)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

15 von 15 Kombinationen

204 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Der Preis zählt am meisten, Sauberkeit ist Pflicht.

43 Unterkünfte aussortiert
1 ohne Bewertungen: Sauberkeit nicht einschätzbar
1 mit Warnsignalen: Gäste berichten von Schimmel, Ungeziefer oder Schmutz
7 zu schwach bewertet für dein Ziel
31 zu teuer für dein Ziel
3 mit einem besseren Angebot: nicht teurer, mindestens gleich gut bewertet, mit allem, was dieses bietet
Günstigste deiner Auswahl
Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 02.10. – So 04.10.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

GESAMTPREIS
123 €
Details und Buchung

+15 € gegenüber Apartments Alpenblick

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklusive · kostenlos stornierbar · Gutes Frühstück · + 6 weitere

Dafür nicht: Ruhig · Küche

anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
138 €
Details und Buchung

+36 € gegenüber Apartments Alpenblick

Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklu
… (16561 weitere Zeichen)
```

</details>

### 25 Zielwechsel ohne neue Suche: „Komfort“

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Zielwechsel ohne neue Suche: „Komfort“](25-zielwechsel-ohne-neue-suche-komfort.png)
- Notiz: Komfort-Finalisten: Gasthof Rose, Hotel Kastanienhof, Apartments Am Markt, Hotel Felsenkeller
- Prüfungen:
  - [x] enthält „Qualität zählt mehr als der Preis.“
  - [x] Element `[data-testid="finale"][data-goal="komfort"] [data-testid="finalist"]` vorhanden (4)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

15 von 15 Kombinationen

204 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität zählt mehr als der Preis.

40 Unterkünfte aussortiert
1 ohne Bewertungen: Sauberkeit nicht einschätzbar
1 mit Warnsignalen: Gäste berichten von Schimmel, Ungeziefer oder Schmutz
38 zu schwach bewertet für dein Ziel
Günstigste deiner Auswahl
Gasthof Rose
8,9
1059 Bewertungen
★★
Ruhig
Bequeme Betten
Gute Lage

Baiersbronn · Fr 02.10. – So 04.10.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 30.09.2026, 18:00

GESAMTPREIS
187 €
Details und Buchung

+11 € gegenüber Gasthof Rose

Hotel Kastanienhof
9,1
749 Bewertungen
★★
Besonders sauber
Bequeme Betten

Hinterzarten · Fr 16.10. – So 18.10.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · nicht stornierbar

Dafür: Besonders sauber · Barrierefrei

Dafür nicht: kostenlos stornierbar · Ruhig · Gute Lage · + 3 weitere

anderer Ort: Hinterzarten · anderer Termin: Fr 16.10. – So 18.10.

GESAMTPREIS
198 €
Details und Buchung

+121 € gegenüber Gasthof Rose

Apartments Am Markt
8,5
117 Bewertungen
Besonders sauber
Gute Lage

Todtnau · Fr 16.10. – So 18.10.

im Ortskern

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

Dafür: Sauna oder Wellness · Besonders sauber · Küche

Dafür nicht: Frühstück inklusive · kostenlos stornierbar · Ruhig · + 5 weitere

Bewertung −0,4 · anderer Ort: Todtnau · anderer Termin: Fr 16.10. – So 18.10.

GESAMTP
… (16900 weitere Zeichen)
```

</details>

### 26 Lob-Labels erscheinen von selbst in der Liste

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Lob-Labels erscheinen von selbst in der Liste](26-lob-labels-erscheinen-von-selbst-in-der-.png)
- Notiz: Labels in der Liste: Besonders sauber, Bequeme Betten, Ruhig, Gute Lage, Freundliches Personal, Gutes Frühstück, Schöne Aussicht (24 insgesamt).
- Prüfungen:
  - [x] Element `[data-testid="result-list"] [data-testid="praise-label"]` vorhanden (24)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

15 von 15 Kombinationen

204 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität zählt mehr als der Preis.

40 Unterkünfte aussortiert
1 ohne Bewertungen: Sauberkeit nicht einschätzbar
1 mit Warnsignalen: Gäste berichten von Schimmel, Ungeziefer oder Schmutz
38 zu schwach bewertet für dein Ziel
Günstigste deiner Auswahl
Gasthof Rose
8,9
1059 Bewertungen
★★
Ruhig
Bequeme Betten
Gute Lage

Baiersbronn · Fr 02.10. – So 04.10.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 30.09.2026, 18:00

GESAMTPREIS
187 €
Details und Buchung

+11 € gegenüber Gasthof Rose

Hotel Kastanienhof
9,1
749 Bewertungen
★★
Besonders sauber
Bequeme Betten

Hinterzarten · Fr 16.10. – So 18.10.

im Ort · 1,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · nicht stornierbar

Dafür: Besonders sauber · Barrierefrei

Dafür nicht: kostenlos stornierbar · Ruhig · Gute Lage · + 3 weitere

anderer Ort: Hinterzarten · anderer Termin: Fr 16.10. – So 18.10.

GESAMTPREIS
198 €
Details und Buchung

+121 € gegenüber Gasthof Rose

Apartments Am Markt
8,5
117 Bewertungen
Besonders sauber
Gute Lage

Todtnau · Fr 16.10. – So 18.10.

im Ortskern

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

Dafür: Sauna oder Wellness · Besonders sauber · Küche

Dafür nicht: Frühstück inklusive · kostenlos stornierbar · Ruhig · + 5 weitere

Bewertung −0,4 · anderer Ort: Todtnau · anderer Termin: Fr 16.10. – So 18.10.

GESAMTP
… (16900 weitere Zeichen)
```

</details>

### 27 Detailansicht: „Was Gäste loben“ mit Zahlen

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5/unterkunft/lpf-4790-811-0#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Detailansicht: „Was Gäste loben“ mit Zahlen](27-detailansicht-was-ga-ste-loben-mit-zahle.png)
- Notiz: Detail: Sauberkeit: 36× gelobt, 0× kritisiert | Betten: 35× gelobt, 0× kritisiert
- Prüfungen:
  - [x] enthält „Was Gäste loben“
  - [x] enthält „× gelobt“
  - [x] enthält „× kritisiert“
  - [x] enthält „ohne KI“
  - [x] Element `[data-testid="praise"] [data-testid="praise-label"]` vorhanden (2)
  - [x] Element `[data-testid="praise-count"]` vorhanden (2)
- Überschriften: „Hotel Kastanienhof“, „Alle Termine und Tarife“, „So setzt sich der Qualitätswert zusammen“, „Rezensionscheck“, „Beschreibung“, „Ausstattung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zu den Ergebnissen
Hotel Kastanienhof

★★ · Hotel · Marktplatz 43

9,1
749 Bewertungen
Alle Termine und Tarife
Termin	Zimmer und Tarif	Stornierung	Preis	

Fr 02.10. – So 04.10.
Hinterzarten
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 48 % besser als der Durchschnitt deiner Suche
	nicht stornierbar	
203 €
101,58 € pro Nacht
Vergleichspreis anzeigen
	Buchen

Fr 02.10. – So 04.10.
Hinterzarten
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 33 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 30.09.2026, 18:00	
226 €
112,86 € pro Nacht
Vergleichspreis anzeigen
	Buchen

Fr 09.10. – So 11.10.
Hinterzarten
	
Doppelzimmer Komfort mit Balkon
mit Frühstück
	nicht stornierbar	
234 €
116,86 € pro Nacht
Vergleichspreis anzeigen
	Buchen

Fr 09.10. – So 11.10.
Hinterzarten
	
Doppelzimmer Komfort mit Balkon
mit Frühstück
	kostenlos stornierbar bis 07.10.2026, 18:00	
260 €
129,84 € pro Nacht
Vergleichspreis anzeigen
	Buchen

Fr 16.10. – So 18.10.
Hinterzarten
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 52 % besser als der Durchschnitt deiner Suche
	nicht stornierbar	
198 €
98,81 € pro Nacht
Vergleichspreis anzeigen
	Buchen

Fr 16.10. – So 18.10.
Hinterzarten
	
Doppelzimmer Standard
mit Frühstück
Schnäppchen Preis-Leistung 37 % besser als der Durchschnitt deiner Suche
	kostenlos stornierbar bis 14.10.2026, 18:00	
220 €
109,79 € pro Nacht
Vergleichspreis anzeigen
	Buchen
So setzt sich der Qualitätswert zusammen
Durchschnitt 9,3 aus 749 Bewertungen
Wenige Bewertungen werden zum Gesamtmittel 7,5 gezogen (Gewicht 
… (1173 weitere Zeichen)
```

</details>

### 28 Sterne und Mindestbewertung unter „Weitere Filter“

- URL: `/suche/ba039f2a-12a8-45d7-8013-ea7acab855d5#t=H3TMtXSoLm1DBPAR0FKN3crIF-y3jFr8aWIl-_WS4Po`
- Screenshot: ![Sterne und Mindestbewertung unter „Weitere Filter“](28-sterne-und-mindestbewertung-unter-weiter.png)
- Prüfungen:
  - [x] enthält „Weitere Filter: Sterne und Bewertungen“
  - [x] enthält „Sterne ab“
  - [x] enthält „Bewertung ab“
  - [x] enthält „Sterne sagen wenig über Sauberkeit und Zustand.“
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

15 von 15 Kombinationen

204 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Der Preis zählt am meisten, Sauberkeit ist Pflicht.

43 Unterkünfte aussortiert
Günstigste deiner Auswahl
Apartments Alpenblick
7,7
17 Bewertungen
★★★
Ruhig

Hinterzarten · Fr 02.10. – So 04.10.

außerhalb · 5,9 km zur Ortsmitte

Apartment mit Küche · ohne Verpflegung · nicht stornierbar

GESAMTPREIS
123 €
Details und Buchung

+15 € gegenüber Apartments Alpenblick

Pension Seeblick
7,7
19 Bewertungen
★★
Gutes Frühstück
Gute Lage

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 4,0 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklusive · kostenlos stornierbar · Gutes Frühstück · + 6 weitere

Dafür nicht: Ruhig · Küche

anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
138 €
Details und Buchung

+36 € gegenüber Apartments Alpenblick

Hotel Almrausch
7,8
49 Bewertungen
★★
Besonders sauber

Titisee-Neustadt · Fr 09.10. – So 11.10.

außerhalb · 3,2 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Frühstück inklusive · kostenlos stornierbar · Besonders sauber · + 3 weitere

Dafür nicht: Ruhig · Küche

anderer Ort: Titisee-Neustadt · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
158 €
Details und Buchung

Ob dir ein Aufpreis das wert ist, entscheidest du. Wir empfehlen keinen Favoriten.

Alle A
… (16487 weitere Zeichen)
```

</details>

## Flow „warnungen“

Rezensionscheck (F8, Akzeptanzbeispiel 4): Suche Stuttgart → Füssen × 2 Freitage; die Rezensionen der Top 10 werden geprüft. „Hotel Schwanen“ zeigt in Liste und Detailansicht „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“ mit KI-Kennzeichnung; eine geprüfte Unterkunft ohne Treffer zeigt „keine Auffälligkeiten“.

### 29 Suchrahmen gesetzt und eigener Ort Füssen gewählt

- URL: `/suche`
- Screenshot: ![Suchrahmen gesetzt und eigener Ort Füssen gewählt](29-suchrahmen-gesetzt-und-eigener-ort-fu-ss.png)
- Prüfungen:
  - [x] enthält „1 Ort × 2 Termine = 2 Kombinationen“
  - [x] enthält „Suche starten“
- Überschriften: „Deine Suche“, „Ortsliste bestätigt“, „Suche starten“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung

Schritt 3 von 3

Deine Suche
1
Suchrahmen
→
2
Regionen
→
3
Orte
Ortsliste bestätigt

1 Ort × 2 Termine = 2 Kombinationen

Suche starten

Wir fragen jetzt alle Kombinationen aus Ort und Termin gleichzeitig ab. Das dauert meist unter einer Minute.

Füssen
Zurück
Suche starten

Zum Schutz vor automatisierten Anfragen löst dein Browser eine kleine Rechenaufgabe. Es werden keine Cookies gesetzt.

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 30 Suche mit Rezensionscheck abgeschlossen

- URL: `/suche/c503b46f-cb0d-4d18-b6e3-716a6a6d3641#t=W4DTnnD62Ez4Wg9yIyOcemFObrxDDw1B898E1jaFuuc`
- Screenshot: ![Suche mit Rezensionscheck abgeschlossen](30-suche-mit-rezensionscheck-abgeschlossen.png)
- Notiz: Der Rezensionscheck war zu schnell für den Zwischenstand.
- Prüfungen:
  - [x] enthält „Suche abgeschlossen“
  - [x] enthält „2 von 2 Kombinationen“
  - [x] enthält „Alle Angebote“
  - [x] Element `[data-testid="result-warnings"]` vorhanden (4)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

2 von 2 Kombinationen

38 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

11 Unterkünfte aussortiert
Günstigste deiner Auswahl
Pension Waldesruh
8,0
114 Bewertungen
Schöne Aussicht
Besonders sauber

Füssen · Fr 02.10. – So 04.10.

im Ortskern

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 30.09.2026, 18:00

Baulicher Zustand: 4 (4 in 6 Mon.)
GESAMTPREIS
173 €
Details und Buchung

+6 € gegenüber Pension Waldesruh

Landhotel Bären
7,6
2 Bewertungen
★★★

Füssen · Fr 09.10. – So 11.10.

außerhalb · 4,7 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Barrierefrei

Dafür nicht: Schöne Aussicht · Besonders sauber · Restaurant im Haus

Bewertung −0,4 · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
179 €
Details und Buchung

+24 € gegenüber Pension Waldesruh

Gasthof Waldesruh
8,1
44 Bewertungen
★★
Ruhig
Gute Lage

Füssen · Fr 02.10. – So 04.10.

außerhalb · 3,3 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · nicht stornierbar

Dafür: Ruhig · Gute Lage · Parkplatz · + 1 weitere

Dafür nicht: kostenlos stornierbar · Schöne Aussicht · Besonders sauber · + 1 weitere

GESAMTPREIS
197 €
Details und Buchung

+98 € gegenüber Pension Waldesruh

Landhotel Lindenhof
7,8
264 Bewertungen
★★★

Füssen · Fr 02.10. – So 04.10.

im Ortskern

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 30.09.2026, 18:00

Dafür
… (6389 weitere Zeichen)
```

</details>

### 31 Liste: Warnhinweis mit KI-Kennzeichnung

- URL: `/suche/c503b46f-cb0d-4d18-b6e3-716a6a6d3641#t=W4DTnnD62Ez4Wg9yIyOcemFObrxDDw1B898E1jaFuuc`
- Screenshot: ![Liste: Warnhinweis mit KI-Kennzeichnung](31-liste-warnhinweis-mit-ki-kennzeichnung.png)
- Notiz: Liste: 4 Unterkünfte mit Warnhinweisen, 6 geprüft ohne Auffälligkeiten.
- Prüfungen:
  - [x] enthält „Schimmel: 3 (3 in 6 Mon.)“
  - [x] enthält „KI-gestützte Auswertung von Gästebewertungen“
  - [x] Element `[data-testid="result-warnings"] [data-ai-provenance="ai_assisted"]` vorhanden (4)
  - [x] Element `[data-testid="result-review-ok"]` vorhanden (6)
- Überschriften: „Suche abgeschlossen“, „Deine Auswahl“, „Alle Angebote“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“, „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Suche abgeschlossen

2 von 2 Kombinationen

38 Angebote

Deine Auswahl

Wir haben aussortiert, was nicht zu deinem Ziel passt. Zwischen diesen Unterkünften entscheidest du.

Günstig und sauber
Preis-Leistung
Komfort

Qualität und Preis zählen gleich viel.

11 Unterkünfte aussortiert
Günstigste deiner Auswahl
Pension Waldesruh
8,0
114 Bewertungen
Schöne Aussicht
Besonders sauber

Füssen · Fr 02.10. – So 04.10.

im Ortskern

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 30.09.2026, 18:00

Baulicher Zustand: 4 (4 in 6 Mon.)
GESAMTPREIS
173 €
Details und Buchung

+6 € gegenüber Pension Waldesruh

Landhotel Bären
7,6
2 Bewertungen
★★★

Füssen · Fr 09.10. – So 11.10.

außerhalb · 4,7 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 07.10.2026, 18:00

Dafür: Barrierefrei

Dafür nicht: Schöne Aussicht · Besonders sauber · Restaurant im Haus

Bewertung −0,4 · anderer Termin: Fr 09.10. – So 11.10.

GESAMTPREIS
179 €
Details und Buchung

+24 € gegenüber Pension Waldesruh

Gasthof Waldesruh
8,1
44 Bewertungen
★★
Ruhig
Gute Lage

Füssen · Fr 02.10. – So 04.10.

außerhalb · 3,3 km zur Ortsmitte

Doppelzimmer Standard · mit Frühstück · nicht stornierbar

Dafür: Ruhig · Gute Lage · Parkplatz · + 1 weitere

Dafür nicht: kostenlos stornierbar · Schöne Aussicht · Besonders sauber · + 1 weitere

GESAMTPREIS
197 €
Details und Buchung

+98 € gegenüber Pension Waldesruh

Landhotel Lindenhof
7,8
264 Bewertungen
★★★

Füssen · Fr 02.10. – So 04.10.

im Ortskern

Doppelzimmer Standard · mit Frühstück · kostenlos stornierbar bis 30.09.2026, 18:00

Dafür
… (6389 weitere Zeichen)
```

</details>

### 32 Detailansicht: Schimmel 3 von 3 in den letzten 6 Monaten, KI-gestützt

- URL: `/suche/c503b46f-cb0d-4d18-b6e3-716a6a6d3641/unterkunft/lpf-4757-1070-1#t=W4DTnnD62Ez4Wg9yIyOcemFObrxDDw1B898E1jaFuuc`
- Screenshot: ![Detailansicht: Schimmel 3 von 3 in den letzten 6 Monaten, KI-gestützt](32-detailansicht-schimmel-3-von-3-in-den-le.png)
- Prüfungen:
  - [x] enthält „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“
  - [x] enthält „KI-gestützte Auswertung von Gästebewertungen“
  - [x] enthält „erheblich“
  - [x] enthält „Bewertungen geprüft am“
  - [x] enthält „Abzüge aus Warnhinweisen“
  - [x] enthält nicht „Hinweis (ungeprüft)“
  - [x] Element `[data-testid="review-check"] [data-ai-provenance="ai_assisted"]` vorhanden (1)
  - [x] Element `[data-testid="warning"][data-verified="true"]` vorhanden (1)
- Überschriften: „Hotel Schwanen“, „Alle Termine und Tarife“, „So setzt sich der Qualitätswert zusammen“, „Rezensionscheck“, „Beschreibung“, „Ausstattung“
- KI-Kennzeichnungen (`data-ai-provenance`): „KI-gestützte Auswertung von Gästebewertungen [ai_assisted]“
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zu den Ergebnissen
Hotel Schwanen

★★★★ · Hotel · Marktplatz 29

7,8
334 Bewertungen
Alle Termine und Tarife
Termin	Zimmer und Tarif	Stornierung	Preis	

Fr 02.10. – So 04.10.
Füssen
	
Doppelzimmer Standard
mit Frühstück
	nicht stornierbar	
355 €
177,50 € pro Nacht
zzgl. 12,00 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 02.10. – So 04.10.
Füssen
	
Doppelzimmer Standard
mit Frühstück
	kostenlos stornierbar bis 30.09.2026, 18:00	
394 €
197,22 € pro Nacht
zzgl. 12,00 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 09.10. – So 11.10.
Füssen
	
Doppelzimmer Komfort mit Balkon
mit Frühstück
	nicht stornierbar	
293 €
146,57 € pro Nacht
zzgl. 12,00 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen

Fr 09.10. – So 11.10.
Füssen
	
Doppelzimmer Komfort mit Balkon
mit Frühstück
	kostenlos stornierbar bis 07.10.2026, 18:00	
326 €
162,86 € pro Nacht
zzgl. 12,00 € vor Ort (z. B. Kurtaxe)
Vergleichspreis anzeigen
	Buchen
So setzt sich der Qualitätswert zusammen
Durchschnitt 9,1 aus 334 Bewertungen
Wenige Bewertungen werden zum Gesamtmittel 7,5 gezogen (Gewicht wie 50 Bewertungen)
8,9
Aktualität
8,8
Sauberkeit
kein gesonderter Sauberkeitswert
Abzüge aus Warnhinweisen
− 1,0
Qualitätswert
7,8
Rezensionscheck
KI-gestützte Auswertung von Gästebewertungen
Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten
zuletzt am 20.09.2026 · erheblich
Was Gäste loben
Ruhig
Freundliches Personal
Bequeme Betten
Ruhe: 24× gelobt, 0× kritisiert
Personal: 21× gelobt, 0× kritisiert
Betten: 19× gelobt, 1× kritisiert

Gezählt ohne KI aus den Feldern „Positiv“ und „N
… (824 weitere Zeichen)
```

</details>

### 33 Geprüfte Unterkunft ohne Auffälligkeiten

- URL: `/suche/c503b46f-cb0d-4d18-b6e3-716a6a6d3641/unterkunft/lpf-4757-1070-10#t=W4DTnnD62Ez4Wg9yIyOcemFObrxDDw1B898E1jaFuuc`
- Screenshot: ![Geprüfte Unterkunft ohne Auffälligkeiten](33-gepru-fte-unterkunft-ohne-auffa-lligkeit.png)
- Prüfungen:
  - [x] enthält „Keine Auffälligkeiten in den geprüften Rezensionen“
  - [x] enthält „Bewertungen geprüft am“
  - [x] Element `[data-testid="review-no-issues"]` vorhanden (1)
- Überschriften: „Ferienwohnung Sonnenhof“, „Alle Termine und Tarife“, „So setzt sich der Qualitätswert zusammen“, „Rezensionscheck“, „Beschreibung“, „Ausstattung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zu den Ergebnissen
Ferienwohnung Sonnenhof

Ferienwohnung · Sonnenweg 29

7,2
29 Bewertungen
Alle Termine und Tarife
Termin	Zimmer und Tarif	Stornierung	Preis	

Fr 02.10. – So 04.10.
Füssen
	
Apartment mit Küche
ohne Verpflegung
Schnäppchen Preis-Leistung 104 % besser als der Durchschnitt deiner Suche · 54 % günstiger als vergleichbare Unterkünfte in Füssen
	kostenlos stornierbar bis 30.09.2026, 18:00	
118 €
59,18 € pro Nacht
Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.
Vergleichspreis anzeigen
	Buchen

Fr 09.10. – So 11.10.
Füssen
	
Apartment mit Küche
ohne Verpflegung
Schnäppchen Preis-Leistung 31 % besser als der Durchschnitt deiner Suche · 32 % günstiger als vergleichbare Unterkünfte in Füssen
	kostenlos stornierbar bis 07.10.2026, 18:00	
183 €
91,64 € pro Nacht
Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.
Vergleichspreis anzeigen
	Buchen
So setzt sich der Qualitätswert zusammen
Durchschnitt 6,8 aus 29 Bewertungen
Wenige Bewertungen werden zum Gesamtmittel 7,5 gezogen (Gewicht wie 50 Bewertungen)
7,2
Aktualität
7,2
Sauberkeit
kein gesonderter Sauberkeitswert
Abzüge aus Warnhinweisen
–
Qualitätswert
7,2
Rezensionscheck

Keine Auffälligkeiten in den geprüften Rezensionen (29 geprüft).

29 Bewertungen geprüft am 28.09.2026, 16:05.

Beschreibung

Ferienwohnung Sonnenhof ist ein Ferienquartier mit 1 Zimmerkategorien. Simulierte Beschreibung im Entwicklungsmodus.

Anreise ab 15:00, Abreise bis 10:30

Ausstattung
Parkplatz
Kostenloses WLAN
Sauna
Wellnessbereich
Küche
Bar
Terrasse
Garten
Frühstücksbuffet
Hallenbad
Nichtraucherzimmer

Wichtig
… (364 weitere Zeichen)
```

</details>

## Flow „buchung“

Buchung (F11–F13, Akzeptanzbeispiel 5): Suche Füssen × 2 Freitage → Detailansicht → Buchungsformular mit Pflicht-Bestätigungen → simulierte Zahlung (Fake-Modus) → Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer → Buchungsansicht → Stornierung mit Kostenvorschau → Zugangslink unter „Meine Buchung“.

### 34 Suche abgeschlossen, Detailansicht geöffnet

- URL: `/suche/ecab11f1-ba8d-4968-9892-5774cdf1aea0/unterkunft/lpf-4757-1070-10#t=r_iUuBSIGxS4kQIsxZ-DSM1cgk5y7ttuz6s8xjccfvI`
- Screenshot: ![Suche abgeschlossen, Detailansicht geöffnet](34-suche-abgeschlossen-detailansicht-geo-ff.png)
- Prüfungen:
  - [x] enthält „Alle Termine und Tarife“
  - [x] enthält „Buchen“
  - [x] Element `[data-testid="book-offer"]` vorhanden (2)
- Überschriften: „Ferienwohnung Sonnenhof“, „Alle Termine und Tarife“, „So setzt sich der Qualitätswert zusammen“, „Rezensionscheck“, „Beschreibung“, „Ausstattung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zu den Ergebnissen
Ferienwohnung Sonnenhof

Ferienwohnung · Sonnenweg 29

7,2
29 Bewertungen
Alle Termine und Tarife
Termin	Zimmer und Tarif	Stornierung	Preis	

Fr 02.10. – So 04.10.
Füssen
	
Apartment mit Küche
ohne Verpflegung
Schnäppchen Preis-Leistung 104 % besser als der Durchschnitt deiner Suche · 54 % günstiger als vergleichbare Unterkünfte in Füssen
	kostenlos stornierbar bis 30.09.2026, 18:00	
118 €
59,18 € pro Nacht
Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.
Vergleichspreis anzeigen
	Buchen

Fr 09.10. – So 11.10.
Füssen
	
Apartment mit Küche
ohne Verpflegung
Schnäppchen Preis-Leistung 31 % besser als der Durchschnitt deiner Suche · 32 % günstiger als vergleichbare Unterkünfte in Füssen
	kostenlos stornierbar bis 07.10.2026, 18:00	
183 €
91,64 € pro Nacht
Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.
Vergleichspreis anzeigen
	Buchen
So setzt sich der Qualitätswert zusammen
Durchschnitt 6,8 aus 29 Bewertungen
Wenige Bewertungen werden zum Gesamtmittel 7,5 gezogen (Gewicht wie 50 Bewertungen)
7,2
Aktualität
7,2
Sauberkeit
kein gesonderter Sauberkeitswert
Abzüge aus Warnhinweisen
–
Qualitätswert
7,2
Rezensionscheck

Keine Auffälligkeiten in den geprüften Rezensionen (29 geprüft).

29 Bewertungen geprüft am 28.09.2026, 16:05.

Beschreibung

Ferienwohnung Sonnenhof ist ein Ferienquartier mit 1 Zimmerkategorien. Simulierte Beschreibung im Entwicklungsmodus.

Anreise ab 15:00, Abreise bis 10:30

Ausstattung
Parkplatz
Kostenloses WLAN
Sauna
Wellnessbereich
Küche
Bar
Terrasse
Garten
Frühstücksbuffet
Hallenbad
Nichtraucherzimmer

Wichtig
… (364 weitere Zeichen)
```

</details>

### 35 Buchungsformular mit Angebot, Pflicht-Bestätigungen und Hinweis auf Beträge vor Ort

- URL: `/buchen/ecab11f1-ba8d-4968-9892-5774cdf1aea0/lpf-4757-1070-10/1672#t=r_iUuBSIGxS4kQIsxZ-DSM1cgk5y7ttuz6s8xjccfvI`
- Screenshot: ![Buchungsformular mit Angebot, Pflicht-Bestätigungen und Hinweis auf Beträge vor Ort](35-buchungsformular-mit-angebot-pflicht-bes.png)
- Prüfungen:
  - [x] enthält „Dein Angebot“
  - [x] enthält „Gesamtpreis“
  - [x] enthält „Deine Angaben“
  - [x] enthält „Gäste je Zimmer“
  - [x] enthält „Vertragspartner für den Aufenthalt ist die Unterkunft“
  - [x] enthält „kein Widerrufsrecht“
  - [x] enthält „Weiter zur Zahlung“
  - [x] Element `[data-testid="booking-summary"]` vorhanden (1)
  - [x] Element `[data-testid="guest-row"]` vorhanden (1)
- Überschriften: „Buchen“, „Dein Angebot“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
← Zurück zur Unterkunft
Buchen
Dein Angebot

Ferienwohnung Sonnenhof

Füssen · Fr 02.10. – So 04.10. · 2 Nächte

Apartment mit Küche · ohne Verpflegung

kostenlos stornierbar bis 30.09.2026, 18:00

Gesamtpreis
118,35 €

Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.

Deine Angaben
Vorname
Nachname
E-Mail

An diese Adresse schicken wir die Bestätigung und den Link zu deiner Buchung.

Telefon (optional)
Gäste je Zimmer
Zimmer 1: Name eines Gastes – Vorname
Nachname
Bestätigungen
Ich habe die AGB gelesen und akzeptiere sie. Mir ist bekannt, dass Reiseplaner Unterkünfte vermittelt; Vertragspartner für den Aufenthalt ist die Unterkunft.
AGB lesen
Mir ist bekannt, dass bei Beherbergung zu einem festen Termin kein Widerrufsrecht besteht (§ 312g Abs. 2 Nr. 9 BGB). Es gelten die Stornobedingungen des Tarifs.
Weiter zur Zahlung

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 36 Angebot reserviert, Zahlungsseite (simuliert)

- URL: `/buchung/KB3CQZJW/zahlung`
- Screenshot: ![Angebot reserviert, Zahlungsseite (simuliert)](36-angebot-reserviert-zahlungsseite-simulie.png)
- Notiz: Der Preis hatte sich geändert; der neue Preis wurde im Dialog bestätigt.
- Prüfungen:
  - [x] enthält „Zahlung“
  - [x] enthält „Simulierte Zahlung (Entwicklungsmodus)“
  - [x] enthält „Testzahlung abschließen“
  - [x] enthält „wir sehen keine Kartendaten“
- Überschriften: „Zahlung“, „Simulierte Zahlung (Entwicklungsmodus)“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Zahlung

Zu zahlen: 124,27 €. Die Zahlung wickelt LiteAPI (Nuitée) ab; wir sehen keine Kartendaten.

Buchungsnummer: KB3CQZJW · Ferienwohnung Sonnenhof

Simulierte Zahlung (Entwicklungsmodus)

Im Entwicklungsmodus wird keine echte Zahlung ausgelöst. Die Schaltfläche simuliert die Rückkehr vom Zahlungsanbieter.

Testzahlung abschließen

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 37 Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer

- URL: `/buchung/KB3CQZJW/abschluss`
- Screenshot: ![Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer](37-besta-tigung-mit-buchungsnummer-und-hote.png)
- Notiz: Buchungsnummer KB3CQZJW, Bestätigungsnummer der Unterkunft HCN-679285.
- Prüfungen:
  - [x] enthält „Buchung bestätigt“
  - [x] enthält „BUCHUNGSNUMMER“
  - [x] enthält „BESTÄTIGUNGSNUMMER DER UNTERKUNFT“
  - [x] enthält „HCN-“
  - [x] enthält „Vertragspartner für den Aufenthalt ist“
  - [x] enthält „e***@example.org“
  - [x] Element `[data-testid="booking-ref"]` vorhanden (1)
  - [x] Element `[data-testid="hotel-confirmation"]` vorhanden (1)
  - [x] Element `[data-testid="view-booking"]` vorhanden (1)
- Überschriften: „Buchung bestätigt“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Buchung bestätigt

Wir haben dir die Bestätigung an e***@example.org geschickt.

BUCHUNGSNUMMER
KB3CQZJW
BESTÄTIGUNGSNUMMER DER UNTERKUNFT
HCN-679285

Gesamtpreis: 124,27 €

Ferienwohnung Sonnenhof, Füssen

Fr 02.10. – So 04.10. · 2 Nächte

Apartment mit Küche · ohne Verpflegung

1 Zimmer, 2 Gäste

kostenlos stornierbar bis 30.09.2026, 18:00

Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.

Vertragspartner für den Aufenthalt ist Ferienwohnung Sonnenhof. Mit der Bestätigungsnummer der Unterkunft kannst du die Buchung auch direkt dort prüfen; zeige sie bei der Anreise vor.

Buchung ansehen oder stornieren

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 38 Buchungsansicht mit Stornierung und Kostenvorschau

- URL: `/buchung/KB3CQZJW#a=eyJiIjoiZWUyZDhjNzgtM2IzMi00MzBiLWI1YzItZjViMjI3YmQ4NTJmIiwicCI6ImFjY2VzcyIsImUiOjE3OTMxOTYzNTQsImgiOiJfMVA1eWw2V2VTVEZDUmNRQXBFMGdmIn0.FZ5ITTUicMV3fXbwNMnBNQuUW3-MRAm9wgPNONUwSoQ`
- Screenshot: ![Buchungsansicht mit Stornierung und Kostenvorschau](38-buchungsansicht-mit-stornierung-und-kost.png)
- Prüfungen:
  - [x] enthält „Deine Buchung“
  - [x] enthält „bestätigt“
  - [x] enthält „Buchung stornieren?“
  - [x] enthält „Die Stornierung ist jetzt kostenlos“
  - [x] Element `[data-testid="cancel-confirm"]` vorhanden (1)
- Überschriften: „Deine Buchung“, „Stornierung“, „Buchung stornieren?“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Deine Buchung
bestätigt
BUCHUNGSNUMMER
KB3CQZJW
BESTÄTIGUNGSNUMMER DER UNTERKUNFT
HCN-679285

Gesamtpreis: 124,27 €

Ferienwohnung Sonnenhof, Füssen

Fr 02.10. – So 04.10. · 2 Nächte

Apartment mit Küche · ohne Verpflegung

1 Zimmer, 2 Gäste

kostenlos stornierbar bis 30.09.2026, 18:00

Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.

Gebucht von: Erika Mustermann (e***@example.org)

Vertragspartner für den Aufenthalt ist Ferienwohnung Sonnenhof. Mit der Bestätigungsnummer der Unterkunft kannst du die Buchung auch direkt dort prüfen; zeige sie bei der Anreise vor.

Stornierung
Buchung stornieren

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
Buchung stornieren?
Die Stornierung ist jetzt kostenlos. Du erhältst 124,27 € zurück.
Buchung behalten
Jetzt stornieren
```

</details>

### 39 Buchung storniert

- URL: `/buchung/KB3CQZJW#a=eyJiIjoiZWUyZDhjNzgtM2IzMi00MzBiLWI1YzItZjViMjI3YmQ4NTJmIiwicCI6ImFjY2VzcyIsImUiOjE3OTMxOTYzNTQsImgiOiJfMVA1eWw2V2VTVEZDUmNRQXBFMGdmIn0.FZ5ITTUicMV3fXbwNMnBNQuUW3-MRAm9wgPNONUwSoQ`
- Screenshot: ![Buchung storniert](39-buchung-storniert.png)
- Prüfungen:
  - [x] enthält „storniert“
  - [x] enthält „Stornogebühr 0,00“
  - [x] enthält „Erstattung“
  - [x] Element `[data-testid="cancelled-note"]` vorhanden (1)
- Überschriften: „Deine Buchung“, „Stornierung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Deine Buchung
storniert
BUCHUNGSNUMMER
KB3CQZJW
BESTÄTIGUNGSNUMMER DER UNTERKUNFT
HCN-679285

Gesamtpreis: 124,27 €

Ferienwohnung Sonnenhof, Füssen

Fr 02.10. – So 04.10. · 2 Nächte

Apartment mit Küche · ohne Verpflegung

1 Zimmer, 2 Gäste

kostenlos stornierbar bis 30.09.2026, 18:00

Mögliche Gebühren vor Ort (z. B. Kurtaxe) sind nicht bekannt.

Gebucht von: Erika Mustermann (e***@example.org)

Vertragspartner für den Aufenthalt ist Ferienwohnung Sonnenhof. Mit der Bestätigungsnummer der Unterkunft kannst du die Buchung auch direkt dort prüfen; zeige sie bei der Anreise vor.

Stornierung

Storniert. Stornogebühr 0,00 €, Erstattung 124,27 €.

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

### 40 „Meine Buchung“: Zugangslink anfordern

- URL: `/buchung`
- Screenshot: ![„Meine Buchung“: Zugangslink anfordern](40-meine-buchung-zugangslink-anfordern.png)
- Prüfungen:
  - [x] enthält „Meine Buchung“
  - [x] enthält „Wenn die Angaben zu einer Buchung passen“
- Überschriften: „Meine Buchung“
- KI-Kennzeichnungen (`data-ai-provenance`): keine
- Konsolenfehler: keine
- Fehlgeschlagene Anfragen: keine

<details><summary>Sichtbarer Text</summary>

```text
Entwicklungsmodus: Alle Anbieter (Unterkünfte, Fahrzeiten, KI, E-Mail) sind simuliert. Es werden keine echten Buchungen ausgelöst.
Reiseplaner
ARBEITSTITEL
Suche
So funktioniert's
Meine Buchung
Meine Buchung

Gib deine Buchungsnummer und die E-Mail-Adresse der Buchung ein. Wir schicken dir einen Link, mit dem du die Buchung ansehen oder stornieren kannst.

Wenn die Angaben zu einer Buchung passen, schicken wir dir gleich einen Link per E-Mail.

Reiseplaner

Wir vermitteln Unterkünfte; Vertragspartner ist die jeweilige Unterkunft.

Rechtliches

Impressum
AGB
Datenschutz
Kontakt
So funktioniert's
So berechnen wir die Rangliste

Datenquellen

Ortsdaten: GeoNames (CC BY 4.0)
Fahrzeiten auf Basis von Kartendaten © OpenStreetMap-Mitwirkende (ODbL)
```

</details>

