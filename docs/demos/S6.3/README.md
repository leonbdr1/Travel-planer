# S6.3 Ergebnisse, Detailansicht und Rangliste

Befehl: `npm run dogfood -- --mode P --flow ergebnisse` (echter lokaler Stack, Anbieter im Fake-Modus).
Lauf `2026-09-27T20-07-45-P-ergebnisse`: 31/31 Prüfungen bestanden, keine Konsolenfehler, keine fehlgeschlagenen Anfragen.

| Datei | Inhalt |
|---|---|
| `report.md` | vollständiger Walkthrough-Bericht mit sichtbarem Text je Schritt |
| `01-ergebnisse-oberer-teil.png` | abgeschlossene Suche 5 Orte × 9 Freitage: Matrix mit Farbstufen und ★, Liste mit Schnäppchen-Begründung (Ausschnitt; die ganze Seite liegt im Walkthrough-Ordner) |
| `03-klick-auf-eine-matrix-zelle-filtert-die-.png` | Zellfilter „Nur Baiersbronn am Fr 02.10.“, Sortierung nach Preis |
| `04-budget-200-oberer-teil.png` | Filter ohne neue Suche: Budget 200 € lässt 31 von 45 Unterkünften übrig; jeder angezeigte Gesamtpreis ≤ 200 € |
| `05-filter-ohne-neue-suche-budget-50.png` | leerer Zustand mit Hinweis zum Lockern der Filter |
| `06-detailansicht-mit-allen-terminen-und-sco.png` | Detailansicht: alle Termine und Tarife, Score-Aufschlüsselung, Rezensionscheck-Platzhalter (M7), Ausstattung, Hinweise |
| `07-vergleichspreis-auf-abruf.png` | Vergleichspreis je Termin auf Abruf: öffentlicher Preis mit Quelle und Stand oder Hinweis „kein Vergleichspreis“ (Ausschnitt) |
| `08-seite-so-berechnen-wir-die-rangliste.png` | Seite „So berechnen wir die Rangliste“ |

Gelesen und bewertet: Matrix, Liste, Filter, Detailansicht und Ranglisten-Seite zeigen die erwarteten Inhalte.
Behoben während des Slices: Das Filterformular wurde bei jeder Antwort zurückgesetzt (Budget ging verloren);
Fake-Fotos fehlten (Platzhalter-SVGs unter `packages/web/public/fake/`); die Legende der Matrix nennt jetzt,
was „keine Daten“ bedeutet; der Vergleichspreis sprengte zunächst die Preisspalte der Detailtabelle
(Breite jetzt begrenzt).
