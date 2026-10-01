# Nachtrag zu architektur.md (wartet auf Freigabe)

Die früheren Nachträge stehen inzwischen in `architektur.md` 6.16. Hier nur die Änderungen, die noch nicht übernommen sind (BEN-GATE).

## Abgleich mit dem Buchungsportal-Standard (01.10.2026, `FORTSCHRITT.md` B1–B7, P1)

Alle Änderungen sind additiv; bestehende Aufrufer verhalten sich wie bisher.

- **7.2 `GET /searches/{id}/results`:** neue Parameter `q` (Namensteil, grenzt `items`, `unrated`, `oversized` ein, nicht die Matrix), `offset`/`limit` (Seite von `items`; ohne `limit` die ganze Liste), `sort=drive` (nächster Ort zuerst); `types` nimmt zusätzlich die Arten `hotel`, `pension`, `ferienwohnung` (`domain/filters.ts`). Antwort neu: `page {offset, limit, total}` und `request` (Suchrahmen für „Preise aktualisieren“, nur mit dem Such-Token). `nights_summary` und „Unsere Wahl“ rechnen über die ganze Liste.
- **7.2 `GET /searches/{id}/hotels/{hotel_id}`:** `hotel.location {lat, lng}` (Kartenlink).
- **6.6/6.9 Stornierbarkeit:** Die Auswertung bekommt `now`; ein Angebot, dessen kostenlose Stornierung abgelaufen ist, zählt als nicht kostenlos stornierbar (`freeCancellationAt`, `domain/pricing.ts`). Gespeicherte Buchungen behalten die echte Frist; die Bestätigungs-Mail nennt eine bei Buchung schon abgelaufene Frist (`freeCancelEnded`).
- **7.2 `POST /bookings/access-link`:** `booking_ref` optional. Ohne Nummer eine E-Mail mit allen bestätigten und stornierten Buchungen der Adresse (höchstens `BOOKINGS_OVERVIEW_MAX` = 20), jede mit eigenem Zugangslink; E-Mail-Typ `access_link` mit zweiter Payload-Form, keine Migration. Antwort weiter immer 202. Offen: Index auf `lower(holder_email)` bei vielen Buchungen (neue Migration, BEN-GATE).
- **7.1/11.1 Request-ID:** jede API-Antwort trägt `X-Request-Id` (Cloudflare-Ray-ID oder UUID); Fehler ≥ 500 und Anfragen ≥ `SLOW_REQUEST_MS` (3 s) loggen Methode, Routenmuster, Status, Dauer und ID; die SPA zeigt bei Serverfehlern „Fehler-ID“ (erste 8 Zeichen).
- **SPA:** Zeitlimit `API_REQUEST_TIMEOUT_MS` (30 s); Seiten außer Start und Assistent laden bei Bedarf, React in eigenem Chunk; „Letzte Suchen“ im `localStorage` (höchstens 5, Aufbewahrungsfrist der Suchen), in der Datenschutzerklärung genannt.
- **Antwort-Ergänzung:** `quality.penalty_items` (`topic`, `weight` je gemeldetem Mangel) für die Erklärung von „Unser Wert“.
- **CLI:** `npm run cli -- buchungen` (Support, nur lesend).
- **Neue Konstanten:** `RESULTS_PAGE_SIZE` 20, `RESULTS_NAME_SEARCH_DEBOUNCE_MS` 300, `BOOKINGS_OVERVIEW_MAX` 20, `SLOW_REQUEST_MS` 3000, `API_REQUEST_TIMEOUT_MS` 30000.
- **Schnäppchen-Begründung (6.8):** kürzer, gleiche Zahlen: „… (gleiches Zimmer: 85 € statt im Mittel 138 €)“.
