# reiseplaner.catalog-regions

Katalogentwurf: schlägt je Land Urlaubsregionen mit Kurzbeschreibung und Themen vor (architektur.md 9.2). Ergebnis ist ein Entwurf mit `verified: false`; die Redaktion gibt frei (⛔ BG-11).

- **Aufruf:** CLI `npm run cli -- catalog generate` über die Message Batches API (halber Preis), Kostendeckel 0,06 $ je Aufruf.
- **Modell:** `claude-sonnet-5`; das Modell lehnt `temperature` ab, der Runner lässt den Parameter weg.
- **Evals:** 10 Fälle mit deterministischen Assertions (nur Themen aus dem Vokabular, keine Koordinaten, Beschreibung höchstens 160 Zeichen, keine Claims) und Judge-Rubrik.
