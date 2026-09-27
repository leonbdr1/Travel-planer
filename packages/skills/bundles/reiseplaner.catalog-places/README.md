# reiseplaner.catalog-places

Katalogentwurf: schlägt je Region Orte vor, die sich als Unterkunftsbasis eignen, mit Themenstärke 1 bis 3, Kurzbeschreibung und Suchradius (architektur.md 9.2). Koordinaten kommen nie aus dem Modell, sondern aus dem Abgleich mit der Ortsdatenbank (`geo_localities`).

- **Aufruf:** CLI `npm run cli -- catalog generate` über die Message Batches API, Kostendeckel 0,08 $ je Aufruf.
- **Modell:** `claude-sonnet-5` ohne `temperature` (vom Modell abgelehnt).
- **Evals:** 10 Fälle mit deterministischen Assertions und Judge-Rubrik.
