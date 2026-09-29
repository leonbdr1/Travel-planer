# S11.10 Rückmeldungen vom 29.09.2026

Bens Rückmeldungen aus dem Testbetrieb mit echten Hotels, umgesetzt am 29.09.2026. Alle Belege mit simulierten Anbietern (keine Schlüssel in der Sitzung).

| Rückmeldung | Umsetzung | Beleg |
|---|---|---|
| Ausgeblendete Unterkünfte „ohne Bewertungen und auffällig billig, auffällig gut ausgestattet oder für dein Ziel nicht einschätzbar“ sehen können | Eigener Abschnitt unter „Alle Angebote“ mit Grund je Haus; Finale und „Unsere Wahl“ unverändert | `walkthrough-P/` Schritt „Aussortierte Unterkünfte ohne Bewertungen“ |
| Schnäppchen-Sterne unklar, Begründung beim Draufhalten | Hinweis in der Preis-Matrix: Unterkunft, Zimmer, Verpflegung, Begründung | `walkthrough-P/` Schritt „Maus auf einen ★-Preis“ |
| Preisvergleich berücksichtigt Zimmer? | Vorher nicht (günstigstes Angebot des Hauses, egal welches Zimmer). Jetzt nur dasselbe Zimmer mit derselben Verpflegung und denselben Stornobedingungen | `packages/domain/test/scoring.test.ts` („date bargains compare the same room“) |
| Beschreibung „<p><strong>…“ kaputt | Überschriften, Absätze und Listen statt Markup | `walkthrough-P/` Schritt „Detailansicht“, `packages/domain/test/rich-text.test.ts` |
| „Wichtige Hinweise“ auf Englisch | LiteAPI-Details mit `language=de` angefordert (gegen die echte API ungeprüft, HANDOFF Drift 38); Hinweise als Liste; englische Texte gekennzeichnet | `packages/providers/test/liteapi-fake.test.ts`, `packages/cli/test/testbetrieb.test.ts` |
| `CONNECT_TIMEOUT …hyperdrive.local:5432` (×8), Suche verzögert | Lokaler Datenbank-Server teilt PGlites Sitzung stückweise statt je Verbindung | `db-verbindungen/` (unten) |

## Lokale Datenbank: vorher und nachher

`db-verbindungen/test-vorher-nachher.txt`: Eine Verbindung bleibt 5 s offen (wie ein Suchschritt, der auf LiteAPI wartet), eine zweite fragt mit `connect_timeout` 3 s an.

| | Ergebnis der zweiten Verbindung |
|---|---|
| serieller Proxy (vorher) | `write CONNECT_TIMEOUT 127.0.0.1:… after 3006 ms` – Bens Fehlermeldung |
| Wire-Server (nachher) | Antwort nach 3 ms |

Walkthrough `langsam` (`REISEPLANER_FAKE_LATENCY_MS=4000 npm run dogfood -- --mode P --flow langsam`), 5 Orte × 12 Termine, jeder simulierte Anbieteraufruf 2–6 s:

| | Serverfehler der Seite | längste Zeit ohne neue Anzeige | bis zu den Ergebnissen |
|---|---|---|---|
| vorher (`db-verbindungen/vorher/report.md`) | 8 × HTTP 500 auf `/api/v1/searches/{id}` | 26 s (0 und 12 von 60 nie angezeigt) | 80 s |
| nachher (`db-verbindungen/nachher/report.md`) | 0 | 22 s (Rezensionscheck nach 60 von 60) | 78 s |

Beide Läufe zeigen im Kopf des Berichts den Commit `fa77254`; der Unterschied lag im Arbeitsverzeichnis (vorher: `local.ts` und `serial-proxy.ts` aus `fa77254`, nachher: Wire-Server).
