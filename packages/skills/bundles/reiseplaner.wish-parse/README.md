# reiseplaner.wish-parse

Übersetzt den Freitext-Wunsch aus Schritt 1 des Assistenten in Chips, Themen und Rezensionsthemen (architektur.md 9.2). Erfindet keine Codes; was nicht passt, landet unverändert in `unmatched`.

- **Aufruf:** Worker, `POST /api/v1/wishes/parse`, über den Runner (Budget `llm_usd`, Kostendeckel 0,004 $).
- **Fallback (Aufrufer):** leere Zuordnung und Hinweis „bitte Chips wählen“.
- **Datenschutz:** Gespeichert werden nur die erkannten Codes und Hashes in `skill_runs`, nie der Freitext.
- **Evals:** `evals/dataset.jsonl` (38 Fälle: Treffer, Kultur/Shopping/Strand, Mehrfachwünsche, `unmatched`, Tippfehler, Englisch, Prompt-Injection). `npm run skills:eval -- reiseplaner.wish-parse [--fake]`.
- **Änderungen:** Jede Prompt-Änderung ist eine neue Version (`v1.0.1/`) mit Eval-Lauf; `baseline.json` pflegt die Eval-Engine.
