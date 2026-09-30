# Hotels, Pensionen und Ferienwohnungen fair bewerten (Aufgaben 6 und 7)

Stand 29.09.2026. Ergänzt `architektur.md` 6.7 (Qualitätswert), 6.10 (Vergleichspreis) und 6.15 (Warnsignale); Übernommen in `architektur.md` 6.16 (Freigabe 30.09.2026).

## Unterkunftsarten

Jede Unterkunft wird einer von drei Arten zugeordnet (`packages/domain/src/property-kind.ts`), zuerst über die Art des Anbieters (`hotelType`), sonst über den Namen:

| Art | Beispiele | typische Zahl der Einheiten |
|---|---|---|
| **Hotel** | Hotel, Resort, Hostel, Aparthotel, Landhotel, Boutique-Hotel | viele Zimmer |
| **Pension** | Pension, Gasthof, Gasthaus, Gästehaus, B&B, Bed and Breakfast | einige Zimmer |
| **Ferienwohnung** | Ferienwohnung, Apartment(s), Ferienhaus, Chalet, Villa, Cottage, Privatunterkunft | eine oder wenige Einheiten |

Unbekannt (weder Art noch Name eindeutig) gilt als **Hotel** – das ist die bisherige, strengste Rechnung für wenige Bewertungen; niemand wird dadurch bevorzugt.

## 1. Anzahl der Bewertungen (Aufgabe 6, erster Teil)

Bisher zählte der Durchschnitt ab 30 Bewertungen voll, darunter wurde er zum Gesamtmittel 7,5 gezogen (Gewicht = fehlende Bewertungen bis 30). Das trifft Ferienwohnungen hart: Eine Wohnung mit 17 Bewertungen hat für ihre Art viele Gäste gehabt, ein Hotel mit 17 Bewertungen kaum welche.

**Neu:** Die Schwelle, ab der der Durchschnitt voll zählt, hängt von der Art ab (`SCORE_FULL_WEIGHT_REVIEWS_BY_KIND`):

| Art | voll ab | Beispiel 8,7 aus 17 Bewertungen |
|---|---|---|
| Hotel | 30 Bewertungen | (17 × 8,7 + 13 × 7,5) / 30 = **8,18** |
| Pension | 25 Bewertungen | (17 × 8,7 + 8 × 7,5) / 25 = **8,32** |
| Ferienwohnung | 20 Bewertungen | (17 × 8,7 + 3 × 7,5) / 20 = **8,52** |

Die Ferienwohnung wird also nur noch **ein wenig** herabgesetzt (Bens Wunsch: fair, aber nicht als schlecht dargestellt). Ab 20 Bewertungen zählt ihr Durchschnitt wie der eines Hotels ab 30.

**Viele Bewertungen als Vorteil** (Bonus im Vergleichspreis, Label „viele Bewertungen“): bisher ab 500 für alle. Neu relativ zur Art (`MANY_REVIEWS_MIN_BY_KIND`): Hotel 500, Pension 150, Ferienwohnung 60. Eine hohe Zahl ist bei einem Hotel normal und kein besonderer Vorteil; bei einer Ferienwohnung sind 60 Bewertungen viel.

## 2. Schimmel und ähnliche Mängel (Aufgabe 6, zweiter Teil)

Mängel, die an **einer Einheit** hängen – Schimmel, Ungeziefer, Zustand, Sauberkeit –, wiegen umso schwerer, je weniger Einheiten eine Unterkunft hat. Meldet ein Hotelgast von 1000 Schimmel, betrifft das vermutlich ein Zimmer von vielen; meldet ihn ein Gast einer Ferienwohnung, betrifft es genau die Wohnung, die man bucht.

**Abzug im Qualitätswert** (`UNIT_DEFECT_PENALTY_FACTOR`): Abzug aus dem Rezensionscheck × Faktor der Art, nur für die einheitsgebundenen Themen:

| Art | Faktor | höchster Gesamtabzug |
|---|---|---|
| Hotel | 0,6 | 2,0 |
| Pension | 1,0 | 2,0 |
| Ferienwohnung | 1,6 | 3,0 |

Lärm, Personal, Frühstück usw. bleiben unverändert (Faktor 1).

**Warnsignal (Haus fliegt aus der Auswahl)** (`RED_FLAG_THRESHOLDS_BY_KIND`): bisher für alle „Schimmel/Ungeziefer ab 3 Gästen und 10 % der geprüften Bewertungen, Schmutz ab 4 Gästen und 15 %“. Neu:

| Art | Schimmel / Ungeziefer | Schmutz |
|---|---|---|
| Hotel | ab 3 Gästen und 10 % (wie bisher) | ab 4 Gästen und 15 % (wie bisher) |
| Pension | ab 2 Gästen und 7 % | ab 3 Gästen und 10 % |
| Ferienwohnung | ab 2 Gästen und 5 % | ab 3 Gästen und 8 % |

Neuere Bewertungen zählen wie bisher doppelt; ungeprüfte Stichworttreffer brauchen einen Gast mehr. Ein einzelner Hinweis bleibt auch bei einer Ferienwohnung ein Warnhinweis mit (größerem) Abzug, kein Ausschluss.

## 3. Anzeige: echte Bewertung und unser Wert (Aufgabe 7)

- In Liste, Auswahl und Detailansicht stehen **beide Werte** nebeneinander: die **Gästebewertung** (z. B. 8,7 aus 17 Bewertungen) und **unser Qualitätswert** (z. B. 8,5).
- Ein kleines „i“ neben unserem Wert öffnet beim Draufhalten (auf dem Handy per Tippen) eine kurze Erklärung in der Art eines Reiseportals, mit den Gründen dieser Unterkunft: „Gästebewertung 8,7 aus 17 Bewertungen. Bei Ferienwohnungen zählt ein Durchschnitt ab 20 Bewertungen voll, darunter gleichen wir ihn etwas an den Durchschnitt aller Unterkünfte an. Neuere Bewertungen und geprüfte Hinweise fließen ein.“ Dazu ein Link „So berechnen wir den Qualitätswert“.
- Die Aufschlüsselung in der Detailansicht nennt die Art und ihre Schwelle.
