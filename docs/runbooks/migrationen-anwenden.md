# Runbook: Migrationen gegen Staging und Produktion (⛔ BEN-GATE)

> **Erst relevant beim Online-Gang.** Stand 30.09.2026 gibt es kein Supabase-Konto; lokal laufen alle Migrationen automatisch. Eine neu angelegte Datenbank bekommt beim Einrichten alle Migrationen auf einmal.

Das kann nur Ben (Konten, Schlüssel): Diese Sitzung hat keinen Zugang zu Supabase. Ausgeführt und geprüft sind die Migrationen bisher **nur lokal** (`npm run db:local`, `npm run db:test`).

## Ausstehende Migrationen (alle additiv, Reihenfolge einhalten)

| Datei | Inhalt | Wirkung auf Bestandsdaten |
|---|---|---|
| `20261015a_offer_rooms` | `offers.room_fit`, `room_capacity`, `room_options` | neue Spalten mit Standardwerten |
| `20261016a_place_attractiveness` | `places.fame`, `attractions` | neue Spalten, NULL erlaubt |
| `20261017a_search_origin_optional` | Startort einer Suche optional | lockert eine Einschränkung |
| `20261018a_europe_countries` | Länderlisten in `geo_localities`, `regions`, `places` erweitert | ersetzt drei CHECK-Regeln durch weitere Liste; bestehende Zeilen bleiben gültig |

F19 hat **keine** Migration.

## Schritte

1. Vorher: Dump der Zieldatenbank (`pg_dump`), Ort notieren (Go-live-Checkliste: „Manueller Dump vor der ersten Produktionsmigration“).
2. Erst **Staging**, dann Produktion: `supabase db push` mit dem jeweiligen Projekt (Secrets: `docs/runbooks/secrets.md`, nie in den Chat).
3. Danach die Abfragen aus den `*_VERIFY.sql.notrun`-Dateien einzeln ausführen und lesen; Erwartung steht jeweils im Kopf der Datei.
4. Katalog und Ortsdaten laden: `npm run cli -- geonames import` (echter Produktivimport statt Entwicklungsauszug, O3.1), dann `catalog match`, nach der Prüfung `catalog import` (nur `verified: true`, Runbook `katalogpruefung.md`).
5. `npm run smoke -- --base-url <url>` (nur lesend).

## Vor dem Ausführen prüfen

- `npm run db:test` lokal grün (30.09.2026: alle pgTAP-Dateien grün, 100 Prüfungen in der letzten Datei).
- Gibt es in Staging schon Zeilen mit anderem `country_code`? Die neue CHECK-Regel lässt mehr zu, nicht weniger; ein Fehlschlag wäre ein Befund.
