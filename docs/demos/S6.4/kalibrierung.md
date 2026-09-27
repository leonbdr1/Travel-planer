# Kalibrierung Stufe 1

Quelle: simulierte LiteAPI-Welt (Fake-Modus), Suche Stuttgart, 8 Orte × 9 Freitage; nicht repräsentativ für echte Daten
Suche `2931bbfb-d0e5-4dd1-8629-5b1ed622e149`: 72 Kombinationen, 79 Unterkünfte, 982 Angebote, davon 938 in F (Filter erfüllt, Score vorhanden).

## Qualitätsscore (Stufe 1, je Unterkunft)

| Min | P10 | P25 | Median | P75 | P90 | Max | ohne Bewertungen |
|---|---|---|---|---|---|---|---|
| 6.50 | 6.90 | 7.20 | 7.70 | 8.35 | 8.80 | 9.20 | 4 von 79 |

## Schnäppchenquote je Typ (Anteil an F)

| Typ | Konstante(n) | Anzahl | Quote | Zielkorridor 5.0 % bis 20.0 % |
|---|---|---|---|---|
| value | Faktor 1.3, Qualität ≥ 7 | 172 | 18.3 % | ja |
| date | Faktor 0.8, ≥ 3 Termine | 51 | 5.4 % | ja |
| place | Faktor 0.75, ≥ 5 Vergleichsangebote, Abstand ≤ 1 | 118 | 12.6 % | ja |
| mindestens eins | | 234 | 24.9 % | |

## Preis-Leistung (value)

Median v = Qualität / Preis pro Nacht in €: 0.0673; P90/Median: 1.52.

## Vorschläge

- value: im Korridor, keine Änderung vorgeschlagen.
- date: im Korridor, keine Änderung vorgeschlagen.
- place: im Korridor, keine Änderung vorgeschlagen.
- Unterkünfte ohne Bewertungen: 5.1 %; sie bleiben ohne Score und damit ohne Schnäppchen (6.8).

## Hinweise

- Vorschläge für Konstanten werden erst nach Rückmeldung übernommen (Eskalation, `architektur.md` 6.14).
