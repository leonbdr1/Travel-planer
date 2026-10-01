# Nachtrag zu `architektur.md` (wartet auf Bens Freigabe)

`architektur.md` wird nur mit Bens Freigabe geändert (CLAUDE.md, Regel 6). Die Aufgabenliste vom 29.09.2026 (`FORTSCHRITT.md`) ändert Fachlogik; die betroffenen Stellen stehen hier, bis Ben das Nachziehen freigibt.

## 6.8 Schnäppchen (Aufgabe 2)

- **Bisher:** Preis pro Nacht höchstens `BARGAIN_DATE_FACTOR` × Median *aller* Terminpreise derselben Art (derselbe Termin zählte mit).
- **Jetzt:** Vergleichswert ist der **Durchschnitt derselben Art (Haus, Zimmer, Verpflegung, Stornobedingungen) an den anderen Terminen**; der Termin selbst und andere Zimmer zählen nicht. Begründung nennt „hier X € gesamt, an deinen anderen Terminen im Mittel Y € gesamt“ mit Y = Durchschnitt × Nächte. Code: `packages/domain/src/bargains.ts` (`otherDatesMean`).
- Beispiel (Ben): „Die Kleine“ 182 €, 184 €, 128 € → Vergleich (182 + 184) / 2 = 183 €, 30 % günstiger (vorher fälschlich 182 € und 29 %).

## 6.1 Termine, 6.8 Schnäppchen, 7.3 Suchauftrag, Ergebnisse (Aufgabe 4)

- Suchauftrag: optionales Feld `nights_max` (Nächtezahl als Bereich). `generateStayDates` erzeugt je Anreisetag alle Längen von `nights` bis `nights_max`, die ins Zeitfenster passen; `max_dates` zählt jede Variante.
- Preis-Matrix: Spalten und Zellen je (Anreise, Abreise); Zellfilter der Ergebnisse mit optionalem `checkout`.
- Schnäppchen vergleichen nur Termine mit derselben Nächtezahl (`stayKind` mit `nights`).
- Neu `packages/domain/src/nights.ts` (`extraNights`), Konstanten `EXTRA_NIGHT_CHEAP_RATIO` 0,7 / `EXTRA_NIGHT_EXPENSIVE_RATIO` 1,3; Ergebnisse tragen `extra_night` je Listeneintrag und `nights_summary`. Details: `docs/logik/flexible-naechte.md`.

## 5.x Datenmodell, 6.5 Angebote, 6.15 Vorauswahl (Aufgabe 5)

- Migration `20261015a_offer_rooms` (additiv): `app.offers.room_fit` ('fits' | 'oversized', Standard 'fits'), `room_capacity`, `room_options` (jsonb, Standard `[]`); pgTAP `supabase/tests/offer_rooms.sql`. Gegen Staging/Produktion nicht ausgeführt (BEN-GATE).
- `normalizeOffers(rates, nights, persons)`: günstigstes und günstigstes stornierbares Angebot nur unter passenden Zimmern (Größe ≤ Personen pro Zimmer + `ROOM_OVERSIZE_EXTRA` 2); nur größere Zimmer → günstigstes davon mit `oversized`. `room_options` = jedes Zimmer mit günstigstem Preis.
- Bewertung: `oversized`-Angebote bestehen nie (`passes = false`), stehen in `oversized` der Ergebnisse. Vorbereitet, nicht verdrahtet: `comfortRoomPrice` für „Komfort“. Details: `docs/logik/zimmer-und-personen.md`.

## 6.7 Qualitätswert, 6.10 Vergleichspreis, 6.15 Warnsignale (Aufgabe 6)

- Neu `packages/domain/src/property-kind.ts`: Art `hotel` | `pension` | `ferienwohnung` aus `hotelType`, sonst Name, sonst `hotel`.
- `SCORE_FULL_WEIGHT_REVIEWS_BY_KIND` 30 / 25 / 20; `MANY_REVIEWS_MIN_BY_KIND` 500 / 150 / 60.
- Einheitsgebundene Mängel (`UNIT_DEFECT_TOPICS`: Schimmel, Ungeziefer, Sauberkeit, Zustand, Geruch): Abzug × `UNIT_DEFECT_PENALTY_FACTOR` 0,6 / 1 / 1,6, Höchstabzug `SCORE_MAX_PENALTY_BY_KIND` 2 / 2 / 3.
- Warnsignale `RED_FLAG_THRESHOLDS_BY_KIND` (Hotel wie bisher; Pension 2 Gäste/7 % bzw. 3/10 %; Ferienwohnung 2/5 % bzw. 3/8 %).
- `ScoreBreakdown` trägt `propertyKind` und `fullWeightReviews`. Details: `docs/logik/unterkunftsarten.md`.

## 5.2 Katalog, 6.2 Vorschläge (Aufgabe 8)

- Migration `20261016a_place_attractiveness` (additiv): `app.places.fame`, `attractions` (0–3, NULL erlaubt); pgTAP `place_attractiveness.sql`. Kuratierte Werte in `data/catalog/attraktivitaet.yaml` (KI-Entwurf, BG-11), `catalog import` schreibt sie; der Katalog hat zusätzlich St. Anton am Arlberg.
- `packages/domain/src/attractiveness.ts`: Wert 0–10 aus fünf Kriterien, Stufen top / beliebt / ruhig / wenig; eigene Orte aus Einwohnerzahl und nächstem Katalogort (≤ 8 km); Region = Mittel der drei besten Orte.
- Verträge: `PlaceDto.attractiveness`, `RegionSuggestion.attractiveness`, Matrix-Orte mit `attractiveness`. Details: `docs/logik/orts-attraktivitaet.md`.

## Abgleich mit dem Buchungsportal-Standard (01.10.2026, `FORTSCHRITT.md` B1–B7, P1)

Alle Änderungen sind additiv; bestehende Aufrufer verhalten sich wie bisher.

- **7.2 `GET /searches/{id}/results`:** neue Parameter `q` (Namensteil, grenzt `items`, `unrated`, `oversized` ein, nicht die Matrix), `offset`/`limit` (Seite von `items`; ohne `limit` die ganze Liste), `sort=drive` (nächster Ort zuerst); `types` nimmt zusätzlich die Arten `hotel`, `pension`, `ferienwohnung` (`domain/filters.ts`). Antwort neu: `page {offset, limit, total}` und `request` (Suchrahmen für „Preise aktualisieren“, nur mit dem Such-Token). `nights_summary` und „Unsere Wahl“ rechnen über die ganze Liste.
- **7.2 `GET /searches/{id}/hotels/{hotel_id}`:** `hotel.location {lat, lng}` (Kartenlink).
- **6.6/6.9 Stornierbarkeit:** Die Auswertung bekommt `now`; ein Angebot, dessen kostenlose Stornierung abgelaufen ist, zählt als nicht kostenlos stornierbar (`freeCancellationAt`, `domain/pricing.ts`). Gespeicherte Buchungen behalten die echte Frist; die Bestätigungs-Mail nennt eine bei Buchung schon abgelaufene Frist (`freeCancelEnded`).
- **7.2 `POST /bookings/access-link`:** `booking_ref` optional. Ohne Nummer eine E-Mail mit allen bestätigten und stornierten Buchungen der Adresse (höchstens `BOOKINGS_OVERVIEW_MAX` = 20), jede mit eigenem Zugangslink; E-Mail-Typ `access_link` mit zweiter Payload-Form, keine Migration. Antwort weiter immer 202. Offen: Index auf `lower(holder_email)` bei vielen Buchungen (neue Migration, BEN-GATE).
- **7.1/11.1 Request-ID:** jede API-Antwort trägt `X-Request-Id` (Cloudflare-Ray-ID oder UUID); Fehler ≥ 500 und Anfragen ≥ `SLOW_REQUEST_MS` (3 s) loggen Methode, Routenmuster, Status, Dauer und ID; die SPA zeigt bei Serverfehlern „Fehler-ID“ (erste 8 Zeichen).
- **SPA:** Zeitlimit `API_REQUEST_TIMEOUT_MS` (30 s); Seiten außer Start und Assistent laden bei Bedarf, React in eigenem Chunk; „Letzte Suchen“ im `localStorage` (höchstens 5, Aufbewahrungsfrist der Suchen), in der Datenschutzerklärung genannt.
- **CLI:** `npm run cli -- buchungen` (Support, nur lesend).
- **Neue Konstanten:** `RESULTS_PAGE_SIZE` 20, `RESULTS_NAME_SEARCH_DEBOUNCE_MS` 300, `BOOKINGS_OVERVIEW_MAX` 20, `SLOW_REQUEST_MS` 3000, `API_REQUEST_TIMEOUT_MS` 30000.
- **Schnäppchen-Begründung (6.8):** kürzer, gleiche Zahlen: „… (gleiches Zimmer: 85 € statt im Mittel 138 €)“.
