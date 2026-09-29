# Nachtrag zu `architektur.md` (wartet auf Bens Freigabe)

`architektur.md` wird nur mit Bens Freigabe geändert (CLAUDE.md, Regel 6). Die Aufgabenliste vom 29.09.2026 (`FORTSCHRITT.md`) ändert Fachlogik; die betroffenen Stellen stehen hier, bis Ben das Nachziehen freigibt.

## 6.8 Schnäppchen (Aufgabe 2)

- **Bisher:** Preis pro Nacht höchstens `BARGAIN_DATE_FACTOR` × Median *aller* Terminpreise derselben Art (derselbe Termin zählte mit).
- **Jetzt:** Vergleichswert ist der **Durchschnitt derselben Art (Haus, Zimmer, Verpflegung, Stornobedingungen) an den anderen Terminen**; der Termin selbst und andere Zimmer zählen nicht. Begründung nennt „hier X € gesamt, an deinen anderen Terminen im Mittel Y € gesamt“ mit Y = Durchschnitt × Nächte. Code: `packages/domain/src/bargains.ts` (`otherDatesMean`).
- Beispiel (Ben): „Die Kleine“ 182 €, 184 €, 128 € → Vergleich (182 + 184) / 2 = 183 €, 30 % günstiger (vorher fälschlich 182 € und 29 %).

## 6.1 Termine, 6.8 Schnäppchen, 7.3 Suchauftrag, Ergebnisse (Aufgabe 4)

- Suchauftrag: optionales Feld `nights_max` (Nächtezahl als Bereich). `generateStayDates` erzeugt je Anreisetag alle Längen von `nights` bis `nights_max`, die ins Zeitfenster passen; `max_dates` zählt jede Variante.
- Preis-Matrix: Spalten und Zellen je (Anreise, Abreise); Zellfilter der Ergebnisse mit optionalem `checkout`.
- Schnäppchen vergleichen nur Termine mit derselben Nächtezahl (`stayKind` mit `nights`).
- Neu `packages/domain/src/nights.ts` (`extraNights`), Konstanten `EXTRA_NIGHT_CHEAP_RATIO` 0,7 / `EXTRA_NIGHT_EXPENSIVE_RATIO` 1,3; Ergebnisse tragen `extra_night` je Listeneintrag und `nights_summary`. Details: `docs/logik/flexible-naechte.md`.
