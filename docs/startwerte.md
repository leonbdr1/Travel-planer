# Startwerte zum Bewerten

Stand: 28.09.2026. Alle Werte hier sind **Startwerte**, geschätzt ohne echte Daten. Sie sollen beim Testbetrieb mit echten Hotels (siehe [`runbooks/testbetrieb.md`](runbooks/testbetrieb.md)) geprüft werden.

**So bewertest du sie:** Schreib in die Spalte „Deine Einschätzung“ zum Beispiel „passt“, „strenger“, „lockerer“ oder einen neuen Wert. Noch hilfreicher ist ein konkreter Fall: „Suche Füssen 12.–14.10., Hotel X wurde als zu teuer aussortiert, hätte ich aber gern gesehen.“ Die Werte stehen im Code in `packages/domain/src/constants.ts` bzw. `product.config.yaml`; ändern und Tests nachziehen übernehme ich.

Die „Note“ ist immer die Qualitätsnote auf der 10er-Skala, die das Programm aus den Gästebewertungen errechnet (Abschnitt 6).

## 1. Vorauswahl: wer fliegt raus, bevor du entscheidest

Reihenfolge der Regeln: keine Bewertungen → Warnsignal → Sterne-Falle → zu schwach bewertet → zu teuer → es gibt ein besseres Angebot.

| # | Regel | Startwert | Wirkung im Alltag | Deine Einschätzung |
|---|---|---|---|---|
| 1.1 | Mindestnote „Günstig und sauber“ | **7,0** | Einfache, aber ordentliche Häuser bleiben drin | |
| 1.2 | Mindestnote „Preis-Leistung“ | **7,5** | Knapp über dem Durchschnitt | |
| 1.3 | Mindestnote „Komfort“ | **8,3** | Nur wirklich gut bewertete Häuser | |
| 1.4 | Preisfenster „Günstig und sauber“ | **+35 %** über dem günstigsten geprüften Haus | Bei 100 € fliegt alles über 135 € raus | |
| 1.5 | Preisfenster „Preis-Leistung“ | **+75 %** | Bei 100 € fliegt alles über 175 € raus | |
| 1.6 | Preisfenster „Komfort“ | **keins**, nur dein Budget | Teures bleibt drin, wenn es besser ist | |
| 1.7 | Ohne Bewertungen | **fliegt raus** | Sauberkeit nicht einschätzbar; neue Häuser fehlen dadurch | |
| 1.8 | „Besseres Angebot“: gleich gut heißt | Note höchstens **0,2** schlechter | Ein Haus fliegt raus, wenn ein anderes nicht teurer, mindestens gleich gut ist und alles mitbringt (Frühstück, Sauna …) | |
| 1.9 | Höchstzahl im Finale | **4** Unterkünfte | Mehr wird unübersichtlich, weniger schränkt ein | |

## 2. Warnsignale: raus trotz guter Note

Gezählt wird, wie viele Gäste in den letzten 24 Monaten das Thema erwähnen. „Bestätigt“ heißt: die KI hat die Stelle gelesen und bestätigt. „Ungeprüft“ heißt: nur Stichworttreffer, etwa wenn die KI aus ist.

| # | Thema | Startwert bestätigt | Startwert ungeprüft | Deine Einschätzung |
|---|---|---|---|---|
| 2.1 | Schimmel | **1** Erwähnung | **2** Erwähnungen | |
| 2.2 | Ungeziefer (Bettwanzen, Kakerlaken …) | **1** | **2** | |
| 2.3 | Schmutz / Sauberkeit | **2** | **3** | |

Andere Beschwerden, etwa über Lärm, Personal oder den Zustand, zeigen nur einen Hinweis und sortieren nicht aus.

## 3. Sterne-Falle: billige 4-Sterne-Häuser

| # | Regel | Startwert | Deine Einschätzung |
|---|---|---|---|
| 3.1 | Ab wie vielen Sternen verdächtig | **4 Sterne** und mehr | |
| 3.2 | Was „verdächtig billig“ heißt | Preis pro Nacht unter **70 %** vom mittleren Preis (Median) der Häuser mit höchstens 3 Sternen derselben Suche | |
| 3.3 | Mindestzahl Vergleichshäuser | **3** Häuser mit höchstens 3 Sternen, sonst keine Prüfung | |
| 3.4 | Freigabe | Rezensionscheck gemacht, Note mindestens **8,0**, keine Warnung zu Zustand oder Sauberkeit | |

Beispiel: 3-Sterne-Häuser kosten im Mittel 100 € pro Nacht, ein 4-Sterne-Haus 65 €. Es bleibt nur drin, wenn es geprüft ist, mindestens eine 8,0 hat und niemand über Zustand oder Schmutz klagt.

## 4. Lob-Labels („Gutes Frühstück“, „Besonders sauber“ …)

Themen: Frühstück, Sauberkeit, Ruhe, Personal, Betten, Aussicht, Lage. Die Wörterliste gibt es auf Deutsch, Englisch, Französisch, Italienisch und Niederländisch; sie steht in `packages/domain/src/praise-lexicon.yaml`.

| # | Regel | Startwert | Deine Einschätzung |
|---|---|---|---|
| 4.1 | Mindestens so viele lobende Gäste | **3** | |
| 4.2 | Anteil Lob an allen Erwähnungen des Themas | mindestens **80 %** | |
| 4.3 | Berücksichtigte Bewertungen | letzte **24 Monate** | |
| 4.4 | Labels pro Haus in der Liste | höchstens **3** (die meistgelobten) | |
| 4.5 | Sperre durch Warnhinweise | „Besonders sauber“ nicht bei Warnung zu Sauberkeit, Schimmel, Ungeziefer oder Geruch; „Ruhig“ nicht bei Lärm; „Bequeme Betten“ nicht bei Zustand; „Schöne Aussicht“ nicht bei „weicht von Beschreibung ab“ | |

## 5. Finale: Vergleich untereinander

| # | Regel | Startwert | Deine Einschätzung |
|---|---|---|---|
| 5.1 | Notenunterschied wird angezeigt ab | **0,3** | |
| 5.2 | Punkte je Seite („Dafür“ / „Dafür nicht“) | **3**, Rest unter „+ N weitere“ | |
| 5.3 | Reihenfolge der Punkte | Frühstück, Halbpension, kostenlos stornierbar, Sauna, Pool, Lob-Labels, übrige Ausstattung | |
| 5.4 | „Etwa gleicher Preis“ | wenn der Aufpreis gerundet 0 € ist (unter 50 Cent) | |
| 5.5 | Lage „im Ortskern“ / „im Ort“ | bis **0,6 km** / bis **2 km** vom Ortsmittelpunkt, sonst „außerhalb“ | |

## 6. Qualitätsnote

| # | Regel | Startwert | Bedeutung | Deine Einschätzung |
|---|---|---|---|---|
| 6.1 | Ausgangswert bei wenigen Bewertungen | **7,5** mit Gewicht von **50** Bewertungen | Ein Haus mit fünf 10er-Bewertungen bekommt keine 10, sondern etwa 7,7 | |
| 6.2 | Einfluss aktueller Bewertungen | letzte **12 Monate**, höchstens **±0,75** Notenpunkte | Ein Haus, das zuletzt besser oder schlechter wurde, rutscht mit | |
| 6.3 | Abzug für Beschwerden | höchstens **2,0** Notenpunkte | | |

## 7. Rangliste und Schnäppchen („Alle Angebote“)

| # | Regel | Startwert | Deine Einschätzung |
|---|---|---|---|
| 7.1 | Gewichtung in „Bestes Angebot“ | Qualität **60 %**, Preis **40 %** | |
| 7.2 | Schnäppchen „Preis-Leistung“ | Note je Euro mindestens **30 %** besser als der Mittelwert, Note mindestens **7,0**, mindestens 10 Vergleichsangebote | |
| 7.3 | Schnäppchen „Termin“ | mindestens **20 %** günstiger als dasselbe Haus an anderen Terminen, mindestens 3 Termine | |
| 7.4 | Schnäppchen „Ort“ | mindestens **25 %** günstiger als vergleichbare Häuser im Ort, Note höchstens 1,0 schlechter | |

## 8. Rezensionscheck: wie viele Häuser geprüft werden

| # | Regel | Startwert | Kosten / Wirkung | Deine Einschätzung |
|---|---|---|---|---|
| 8.1 | Häuser in der ersten Runde | **10** | wahrscheinliche Finalisten aller drei Ziele zuerst | |
| 8.2 | Nachprüfrunden | bis zu **2** mit je höchstens **4** Häusern | nur wenn ein ungeprüftes Haus ins Finale rutschen würde | |
| 8.3 | Bewertungen pro Haus | höchstens **100**, nicht älter als **24 Monate** | | |
| 8.4 | Ergebnis wird wiederverwendet | **30 Tage** | spart KI-Kosten bei erneuter Suche | |
| 8.5 | KI-Tagesbudget | **5 $** | danach nur Stichworttreffer („ungeprüft“) | |

## 9. Grenzen, die du beim Testen spüren könntest

| # | Grenze | Startwert | Deine Einschätzung |
|---|---|---|---|
| 9.1 | Suchen pro Stunde / pro Tag | **10** / **30** | |
| 9.2 | Orte pro Suche | **10** | |
| 9.3 | Termine pro Suche / Kombinationen | **12** / **120** | |
| 9.4 | Nächte | höchstens **14** | |
| 9.5 | Fahrzeitabfragen (openrouteservice) pro Tag | **450** | |

Wenn du beim Testen an eine dieser Grenzen stößt, sag Bescheid. Für deinen eigenen Test kann ich sie hochsetzen.
