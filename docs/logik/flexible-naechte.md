# Flexible Nächtezahl (Aufgabe 4, Entwurf und Umsetzung)

Stand 29.09.2026. Ergänzt `architektur.md` 6.1 (Termine) und 6.8 (Schnäppchen); Übernahme dort braucht Bens Freigabe (`docs/architektur-nachtrag.md`).

## Ziel

Der Nutzer kann statt einer festen Nächtezahl einen Bereich angeben, z. B. „2 bis 3 Nächte“. Er soll sehen, ob eine zusätzliche Nacht deutlich teurer oder deutlich günstiger ist als die Nächte davor – statt unbemerkt teuer zu verlängern oder ein günstiges langes Wochenende zu verpassen.

## Termine

- Neues Feld `nights_max` im Suchauftrag (optional; fehlt es oder ist es gleich `nights`, verhält sich alles wie bisher).
- Für jeden erlaubten Anreisetag entsteht je Nächtezahl von `nights` bis `nights_max` ein Termin (Anreise, Abreise), solange die Abreise im Zeitfenster liegt. Beispiel Freitag, 2–3 Nächte: Fr–So und Fr–Mo.
- Die Obergrenze für Termine (`max_dates`) zählt jede Variante; die Terminvorschau zeigt deshalb, wie viele Termine entstehen.
- Suche, Zwischenspeicher und Kombinationen sind schon je (Ort, Anreise, Abreise) angelegt; die Preis-Matrix zeigt jede Variante als eigene Spalte („Fr 02.10. – So 04.10.“ und „Fr 02.10. – Mo 05.10.“), der Zellfilter kennt die Abreise.

## Vergleich zwischen den Nächtezahlen

Verglichen wird immer **dieselbe Art Aufenthalt**: dasselbe Haus, dasselbe Zimmer, dieselbe Verpflegung, dieselben Stornobedingungen, **dieselbe Anreise** – nur die Nächtezahl unterscheidet sich (wie beim Schnäppchen, Aufgabe 2).

Für zwei benachbarte Varianten *n* und *n+1* Nächte:

- **Preis der Zusatznacht** = Gesamtpreis(*n+1*) − Gesamtpreis(*n*).
- **Nachtpreis bisher** = Gesamtpreis(*n*) / *n*.
- Einordnung (Konstanten in `packages/domain/src/constants.ts`):
  - **günstig**: Zusatznacht ≤ `EXTRA_NIGHT_CHEAP_RATIO` (0,7) × Nachtpreis bisher → „3. Nacht nur +48 €“ (grün). Hier lohnt sich das Verlängern.
  - **teuer**: Zusatznacht ≥ `EXTRA_NIGHT_EXPENSIVE_RATIO` (1,3) × Nachtpreis bisher → „3. Nacht +140 € (teurer als die Nächte davor)“ (orange).
  - sonst **normal**: „3. Nacht +92 €, etwa wie die Nächte davor“ (neutral).
- Welche Variante die beste ist, entscheidet die Einordnung: Bei „günstig“ ist die längere Variante die bessere (mehr Urlaub für wenig Geld), bei „teuer“ die kürzere; bei „normal“ entscheidet der Nutzer nach Zeit. Das ist eine Preisaussage, keine Ersparnis-Behauptung: Die Zahlen kommen aus den Angeboten dieser Suche.

## Anzeige

- **Suchformular:** „Nächte“ als Bereich „von … bis …“ (Standard: gleich, also fest).
- **Liste:** Bei der Unterkunft steht unter dem Preis die Einordnung für ihr angezeigtes Angebot, sofern es dieselbe Art mit einer Nacht mehr gibt.
- **Detailansicht:** Block „Eine Nacht mehr?“ mit einer Zeile je Anreise und Zimmer: Varianten mit Gesamtpreis und Preis pro Nacht, Preis der Zusatznacht und Einordnung.
- **Übersicht über der Liste:** Wie viele Unterkünfte die Zusatznacht günstig bzw. teuer anbieten und was sie im Mittel kostet.

## Wechselwirkungen

- **Schnäppchen (Aufgabe 2):** vergleicht nur Termine mit derselben Nächtezahl (sonst würde ein Fr–Mo-Termin gegen Fr–So-Termine verglichen).
- **Liste, Vorauswahl, Finale:** zeigen je Unterkunft ihr günstigstes passendes Angebot nach Gesamtpreis (meist die kürzeste Variante); die Einordnung der Zusatznacht steht daneben. Bekannte Grenze: Die Preisregeln des Ziels vergleichen Gesamtpreise; wenn ein Haus nur lange Varianten hat, wirkt es teurer. Das betrifft vor allem „Preis-Leistung“ und „Komfort“, die ohnehin noch unfertig sind.
