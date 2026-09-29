# S11.12 Zweite Bewertungsquelle

Stand 2026-09-29. Reifegrad: `live-verified` im simulierten Stack, **nicht** gegen den echten Anbieter (der Tripadvisor-Adapter fehlt, siehe `HANDOFF.md` Drift 44 und `docs/runbooks/tripadvisor.md`).

- Tests: `npx vitest run packages/worker/test-node/external-ratings.test.ts` (4/4), `packages/domain/test/rating-fusion.test.ts` (5/5), gesamte Suite 351 grün, `npm run db:test` 82 Assertions.
- Walkthrough `npm run dogfood -- --mode R --flow ergebnisse`: 65/65, `walkthrough-R-ergebnisse/report.md`. Gelesen: Schritt 08 (Notiz „Liste: 122 Bewertungen inkl. Tripadvisor“, Hinweis im Detail) und Screenshot `08-…png` (Kopfzeile und Score-Kasten der Detailseite). Keine Konsolenfehler, keine fehlgeschlagenen Anfragen.
- Fund beim ersten Lauf: Die simulierte Quelle bewertete auch Häuser ganz ohne Bewertung, dadurch verschwand der Abschnitt „Ohne Bewertungen“ (Walkthrough rot, 24/27). Behoben: Die Fake-Quelle kennt Häuser ohne jede Bewertung nicht.
- Offen: echter Adapter, Pflichtform der Quellenangabe, Gewicht 0,5 mit echten Daten prüfen, `architektur.md`/`konzept.md` anpassen (BEN-GATE).
