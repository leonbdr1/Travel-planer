# S9.1 Pflicht- und Transparenzseiten

Befehl: `npm run dogfood -- --mode R --flow pflichtseiten` → Lauf `2026-09-27T21-27-55-R-pflichtseiten`, 22/22 Prüfungen.

- Impressum, AGB, Datenschutz und Kontakt sind von Startseite, Suche und „So funktioniert's“ aus über die Fußzeile
  erreichbar (je drei Wege pro Seite, siehe Notizen im Bericht).
- Impressum, AGB und Datenschutz sind als Platzhalter markiert (BG-02) und enthalten alle Pflichtabschnitte;
  Betreiberdaten, Kontakt und Aufbewahrungsfristen kommen aus `product.config.yaml`.
- „So funktioniert's“ erklärt Datenquelle, Vermittlerrolle, Zahlung, Rangliste und KI-Einsatz und zeigt die
  KI-Kennzeichnungen (`data-ai-provenance="ai_assisted"`); Quellenangaben GeoNames und OpenStreetMap.
- `packages/web/test/ai-labels.test.ts` prüft, dass jede Datei, die KI-Ausgaben zeigt, `AiLabel` rendert.

Gelesen: `01-impressum-u-ber-die-fu-zeile.png`, `05-so-funktioniert-s-mit-ki-kennzeichnungen.png`.
