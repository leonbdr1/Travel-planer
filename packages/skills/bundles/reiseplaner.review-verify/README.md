# reiseplaner.review-verify

Prüft die Ausschnitte der Stichwortsuche im Rezensionscheck (architektur.md 6.10): Ist das eine tatsächliche Beschwerde zum Thema? Verneinungen, Vergleiche und Lob zählen nicht.

- **Aufruf:** Workflow-Schritt `reviews-verify` über den Runner (Budget `llm_usd`, Kostendeckel 0,01 $).
- **Fallback (Aufrufer):** Treffer werden als „ungeprüft“ gezählt, ohne Abzug im Score.
- **Datenschutz:** Namen der Verfasser, E-Mail-Adressen und Telefonnummern werden vorher entfernt (architektur.md 9.3).
- **Evals:** `evals/dataset.jsonl` (52 Fälle: Beschwerden, Verneinungen, Vergleiche, Lob, Ironie, Fragen, andere Unterkünfte, Schweregrade, 15 Sprachen seit 1.1.0, mehrere Ausschnitte).
