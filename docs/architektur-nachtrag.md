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

## 6.3 Themenvokabular, 5.2 Katalog, 9.x Skills (Aufgabe F14)

- Themen: `staedte_kultur` heißt jetzt „Kultur und Sehenswürdigkeiten“ (Code unverändert, damit gespeicherte Suchen gültig bleiben); neu `shopping` („Shopping und Großstadt“) und `strand` („Strand und Meer“, für die Europa-Erweiterung). Kultur und Shopping sind getrennt: Cinque Terre ist Kultur, Frankfurt ist Shopping.
- Skills `reiseplaner.wish-parse`, `reiseplaner.catalog-regions`, `reiseplaner.catalog-places` in Version 1.1.0 mit dem erweiterten Vokabular (Themenlisten höchstens 12), Evals ergänzt (wish-parse 38 Fälle).
- Verträge: `themes` in Vorschlags- und Suchanfragen höchstens 12 statt 10.
- Katalog: sieben Großstadt-Regionen in Deutschland (Berlin und Potsdam, Hamburg und Lübeck, München, Frankfurt und Rhein-Main, Köln und Düsseldorf, Dresden und Elbland, Stuttgart); Shopping bei größeren Städten, Strand an Nord- und Ostsee.
- Orts-Attraktivität, Kriterium W: höchste Stärke von Wandern, Radfahren, Strand oder Shopping (vorher nur Wandern und Radfahren), damit Großstädte und Badeorte nicht als „Ruhiger Ort“ erscheinen.
