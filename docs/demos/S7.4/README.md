# S7.4 Warnhinweise in der Oberfläche

Befehl: `npm run dogfood -- --mode P --flow warnungen` (echter lokaler Stack, Anbieter im Fake-Modus, Fake-Modell).
Lauf `2026-09-27T20-45-39-P-warnungen`: 21/21 Prüfungen bestanden, keine Konsolenfehler, keine fehlgeschlagenen Anfragen.

Suche Stuttgart → Füssen × 2 Freitage. Nach den Preisen prüft der Workflow die Rezensionen der Top 10 (S7.3).

| Datei | Inhalt |
|---|---|
| `report.md` | Walkthrough-Bericht mit sichtbarem Text je Schritt |
| `03-liste-warnhinweise-ausschnitt.png` | Liste: „Schimmel: 3 (3 in 6 Mon.)“ und „Baulicher Zustand: 4 (4 in 6 Mon.)“ mit KI-Kennzeichnung, sonst „Rezensionen geprüft: keine Auffälligkeiten“ |
| `04-detailansicht-schimmel-3-von-3-in-den-le.png` | Detailansicht „Hotel Schwanen“: **„Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“**, „zuletzt am 19.09.2026 · erheblich“, KI-Kennzeichnung (`data-ai-provenance="ai_assisted"`), im Qualitätswert „Abzüge aus Warnhinweisen − 1,0“ (Akzeptanzbeispiel 4) |
| `05-ohne-auffaelligkeiten-ausschnitt.png` | geprüfte Unterkunft ohne Treffer: „Keine Auffälligkeiten in den geprüften Rezensionen (n geprüft)“ |

Gelesen und bewertet: Warnhinweise nennen Thema, Anzahl, Aktualität, letztes Datum und Schwere; bestätigte
Hinweise tragen die KI-Kennzeichnung; ungeprüfte Hinweise erscheinen als „Hinweis (ungeprüft)“ ohne
Kennzeichnung und ohne Abzug (belegt in `docs/demos/S7.3/` und den Tests `packages/worker/test-node/reviews.test.ts`).
Behoben während des Slices: Das Fake-Modell übersah „abgenutzt“ und „durchgelaufen“; seitdem bestätigt es alle
Beschwerden der simulierten Welt (1.740 Häuser mit Treffern geprüft).
