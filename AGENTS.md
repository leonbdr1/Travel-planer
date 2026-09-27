# AGENTS.md – Review-Richtlinien (Codex-PR-Review)

Diese Datei steuert das Pflicht-Review jedes Pull Requests. Grundlage: `CLAUDE.md`, `docs/architektur.md`, `docs/umsetzungsplan.md`. Befunde werden nach Schwere eingestuft; **P1 blockiert den Merge**.

## P1 – blockierend

1. **Fail-open bei Kostenbremsen und Schutz:** Jeder Pfad, der bei einem Fehler von `budget_reserve`, `increment_rate_limit`, der ALTCHA-Prüfung oder einer Tageskontingent-Prüfung den Aufruf *durchlässt*. Richtig ist immer „nicht erlaubt“.
2. **Phantom-Wiring:** Code, der als fertig gemeldet wird, aber keinen realen Aufrufer oder Konsumenten hat (`built` statt `wired`), oder eine STATUS-Zeile, deren Reifegrad nicht durch eine Demo über den realen Einstiegspunkt belegt ist.
3. **Secrets und personenbezogene Daten:** Schlüssel, Tokens oder vollständige E-Mail-Adressen in Logs, Antworten, Fixtures oder Commits; Zahlungsdaten im Produkt; `transactionId`/`prebookId` aus dem Client übernommen.
4. **RLS und Migrationen:** Neue Tabelle ohne RLS, ohne Policy für `app_rw` oder mit Grants an `anon`/`authenticated`; Änderung einer bestehenden Migration statt einer neuen Datei; Migration ohne `_VERIFY.sql.notrun`.
5. **Claims und KI-Kennzeichnung:** Preis- oder Ersparnis-Behauptung ohne Datengrundlage („Bestpreis“, „garantiert“ …); KI-Fläche ohne `AiLabel` mit `data-ai-provenance`.
6. **Nicht-hermetische Tests:** Tests, die Netzwerk, Docker oder Secrets brauchen, oder die gegen Produktion schreiben.
7. **Workflow-Idempotenz:** Workflow-Schritte, die bei Wiederholung doppelt schreiben oder mehr als IDs und Zähler zurückgeben.

## P2 – vor dem Merge beheben oder begründen

- Produktwerte (Marke, Domain, E-Mail, Betreiber, Preise, Schwellen, Limits) als Literal im Code statt aus `product.config.yaml` bzw. `packages/domain/src/constants.ts`.
- Fehlende zod-Prüfung an einer Grenze (HTTP, Anbieter-Antwort, Konfiguration, Datenbankzeile).
- IO, Zeit oder Zufall ohne Parameter in `packages/domain`.
- Regel aus `architektur.md` Abschnitt 6 ohne Unit-Test.
- Anbieter-Zugriff an den Ports in `packages/providers` vorbei oder Adapter ohne Fake.
- Geld nicht als Integer in Cent mit Währung; Zeiten nicht in UTC.
- Neue Abhängigkeit oder Änderung an ausführungssteuernden Dateien ohne Operator-Freigabe.

## P3 – Hinweise

- Lesbarkeit, Benennung, Kommentare, die das Warum nicht erklären.
- Deutsche UI-Texte außerhalb von `packages/web/src/i18n/de.ts`.

## Vorgehen

- Plan-Abweichungen werden nicht still akzeptiert: Der PR muss sie als `⟂ drift` im Plan und in `HANDOFF.md` §Frontier nennen.
- Ein PR, der eine STATUS-Zeile hochstuft, enthält den Beleg unter `docs/demos/<slice-id>/`.
