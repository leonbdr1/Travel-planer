# S7.2 Skill `reiseplaner.review-verify`

Befehl: `npm run skills:eval -- reiseplaner.review-verify --fake` → `eval-fake.txt` (44 von 44 Fällen, Kosten 0 $).

- Datensatz `packages/skills/bundles/reiseplaner.review-verify/evals/dataset.jsonl`: 44 Fälle mit Beschwerden,
  Verneinungen, Vergleichen, Lob, Ironie, Fragen, anderen Unterkünften, Schweregraden, Themenwechsel, mehreren
  Ausschnitten und fünf Sprachen (DE, EN, FR, IT, NL).
- Der Fake-Lauf prüft Runner, Schemas, Validatoren und Zuordnung über `snippetId`. Das Fake-Modell ist ein
  Regelwerk, das auf genau diese Fälle abgestimmt ist; sein Ergebnis sagt nichts über die Qualität des echten
  Modells aus.
- Offen: Operator-Lauf mit `claude-haiku-4-5-20251001` gegen den Zielwert 0,9 (BG-07 Schlüssel, BG-19 Zielwert).
  Danach `baseline.json` mit dem echten Score füllen.
