# S11.3 Finale mit Aufpreis-Vergleich – Belege

Stand: 28.09.2026, lokaler Stack, alle Anbieter simuliert.

- `demo-output.txt`: `npm run demo -- s11.3` – eine Suche „Günstig und sauber“ über Füssen, Oberstdorf und Sonthofen, danach alle drei Ziele ohne neue Suche. Je Ziel die günstigste Unterkunft zuerst, bei den anderen Aufpreis, „dafür“ und „dafür nicht“; alle Finalisten aller Ziele sind rezensionsgeprüft, keine Empfehlung in der Antwort.
- `walkthrough-P/report.md`: `npm run dogfood -- --mode P --flow finale`, 36/36 Prüfungen, keine Konsolenfehler.

Gelesen (Screen-Read) und behalten, jeweils auf den Ausschnitt zugeschnitten, um den es im Schritt geht:

| Screenshot | Was er zeigt |
|---|---|
| `01-…` | Suchformular: Ziel mit einem Tipp neben dem Budget, Hinweis auf „Weitere Filter“ |
| `02-…` | „Deine Auswahl“ bei „Günstig und sauber“: zwei Unterkünfte, die günstigste zuerst, rechts „+15 €“ mit „Dafür“ (erste drei Punkte, Rest aufklappbar) und „Dafür nicht“ |
| `05-…` | Zielwechsel auf „Komfort“ ohne neue Suche: vier geprüfte Unterkünfte im 2 × 2-Raster, Lob-Labels, Aufpreise, Qualitätsabstand |
| `07-…` | Detailansicht: Rezensionscheck ohne Auffälligkeiten, „Was Gäste loben“ mit Labels und Zahlen |

Die übrigen Screenshots des Laufs sind nicht eingecheckt (Text und Prüfungen stehen vollständig im Bericht).

Beim ersten Lesen fielen zwei Dinge auf und wurden behoben: „+0 €“ bei fast gleichem Preis (jetzt „etwa gleicher Preis wie …“) und zu lange Listen in schmalen Karten (jetzt höchstens drei Punkte je Seite, „+ N weitere“, 2 × 2-Raster bei vier Finalisten). Die Demo davor zeigte außerdem ungeprüfte Häuser im Komfort-Finale, darunter eines mit Schimmel; Abhilfe siehe `HANDOFF.md` Drift 29.
