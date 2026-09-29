# Attraktivität von Regionen und Orten (Aufgabe 8, Entwurf und Umsetzung)

Stand 29.09.2026. Ergänzt `architektur.md` 5.2 (Katalog) und 6.2 (Vorschläge); Übernahme dort braucht Bens Freigabe (`docs/architektur-nachtrag.md`).

## Problem

Ein Nebenort ohne Bergbahn, ohne Wanderwege und ohne Touristen ist deutlich billiger als Oberstdorf oder St. Anton. In Preis-Matrix und Liste sieht er deshalb wie ein Schnäppchen aus – im Urlaub hat man dort aber wenig davon. Solche Orte sollen **nicht verschwinden, aber markiert** werden: „Günstiger, hat aber auch weniger zu bieten.“

## Bewertung eines Ortes: fünf Kriterien, je 0 bis 3

| Kriterium | Katalogort | eigener Ort (nicht im Katalog) |
|---|---|---|
| **B – Bekanntheit** (Tourismus, Ruf als Urlaubsort) | von Hand eingeschätzt (`data/catalog/attraktivitaet.yaml`) | Großstadt ab 100.000 Einwohnern 3, Stadt ab 20.000 2, sonst 1; liegt ein Katalogort höchstens 8 km entfernt, mindestens dessen Wert − 1 |
| **A – Bergbahnen, Skigebiet, große Sehenswürdigkeiten** | von Hand eingeschätzt | Metropole ab 500.000 Einwohnern 3, Großstadt 2; Katalogort in 8 km: dessen Wert − 1; sonst 0 |
| **W – Wander- und Radwege, Strand oder Shopping** | höchste Themenstärke von „Wandern“, „Radfahren“, „Strand und Meer“ und „Shopping und Großstadt“ im Katalog (seit F14: Großstädte und Badeorte werden an ihrer Hauptaktivität gemessen, nicht nur an Wanderwegen) | Katalogort in 8 km: dessen Wert − 1; sonst 1 |
| **V – Vielfalt der Aktivitäten** | Zahl der Themen mit Stärke ≥ 2: 0 → 0, 1 → 1, 2–3 → 2, ab 4 → 3 | Großstadt 3; Katalogort in 8 km: dessen Wert − 1; sonst 0 |
| **I – Infrastruktur** (Restaurants, Läden, Gästeinformation) | Einwohner: unter 1.500 → 1, unter 10.000 → 2, sonst 3; bekannte Urlaubsorte (B = 3) mindestens 3 | wie Katalogort |

**Wert** = 10 × (2·B + 2·A + 1,5·W + 1·V + 1·I) / 22,5, auf eine Nachkommastelle. Bekanntheit und Attraktionen zählen doppelt, weil sie am stärksten bestimmen, was man vor Ort erleben kann.

Beispiele: Oberstdorf (B 3, A 3, W 3, V 3, I 3) = 10,0; Köln als eigener Ort (3, 3, 1, 3, 3) = 8,7; ein Dorf ohne Katalogort in der Nähe mit 800 Einwohnern (1, 0, 1, 0, 1) = 2,0; dasselbe Dorf 5 km neben Oberstdorf (2, 2, 2, 2, 1) = 6,2.

## Stufen und Kennzeichnung

| Wert | Stufe | Anzeige |
|---|---|---|
| ab 8,0 | **Top-Urlaubsort** | grün |
| 6,0 bis 7,9 | **Beliebter Urlaubsort** | neutral |
| 4,0 bis 5,9 | **Ruhiger Ort** | neutral |
| unter 4,0 | **Wenig los** | orange, Hinweis „Günstiger, hat aber wenig zu bieten“ |

## Regionen

Wert einer Region = Mittel der drei besten Orte der Region (eine Region lebt von ihren Hauptorten; ein paar ruhige Nebenorte ziehen sie nicht herunter).

## Anzeige

- **Regionen (Schritt 2):** Stufe und Wert an jeder Region, beim Draufhalten die Hauptorte.
- **Orte (Schritt 3):** Stufe an jedem Ort, beim Draufhalten die fünf Kriterien.
- **Preis-Matrix und Liste:** Orte mit „Wenig los“ tragen eine orange Markierung mit „Günstiger, hat aber wenig zu bieten“; alle anderen die Stufe klein neben dem Ortsnamen.

## Grenzen

- Bekanntheit und Attraktionen sind für die 300 Katalogorte ein KI-Entwurf wie der Katalog selbst (Prüfung BG-11).
- Eigene Orte werden aus Einwohnerzahl und nahen Katalogorten geschätzt. Eine spätere Ausbaustufe kann Bergbahnen und Wanderrouten aus OpenStreetMap zählen (Overpass ist freigegeben, BG-20).
