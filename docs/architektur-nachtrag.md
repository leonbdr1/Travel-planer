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

## 5.1 Ortsdatenbank, 5.2 Katalog, 6.2 Vorschläge (Aufgabe F15, Europa-Erweiterung)

- Länder: `GEO_COUNTRIES` (Ortsdatenbank: DE, AT, CH, IT, FR, ES, PT, NL, BE, LU, DK, CZ, PL, HU, HR, SI, SK, GR, GB, IE, NO, SE) und `CATALOG_COUNTRIES` (dieselben, Südtirol weiter als `IT-BZ`, übriges Italien `IT`) in `packages/domain/src/countries.ts`; `product.config.yaml` `markets.catalog_countries` entsprechend.
- Migration `20261018a_europe_countries` (nur lokal ausgeführt): Länderlisten in `geo_localities`, `regions`, `places`; die Regel „Italien nur mit admin2 = BZ“ entfällt. pgTAP `supabase/tests/europe_countries.sql`.
- Katalogabgleich unterscheidet `IT-BZ` (admin2 = BZ) und `IT` (sonst). Ortsbeschriftung außerhalb von DACH mit deutschem Ländernamen („Venedig, Italien“).
- Katalog: 53 Regionen und 195 Orte in 18 Ländern (KI-Entwurf, BG-11); Entwicklungsauszug `EU-cities3000.tsv`. Skills `catalog-regions`, `catalog-places`, `wish-parse` in Version 1.2.0 mit den neuen Ländern.
- Orientierungskarte: zweiter Ausschnitt Europa (Umrisse Natural Earth, gemeinfrei, fest eingebaut), gewählt, sobald ein Punkt außerhalb von DACH liegt.
- Orts-Attraktivität, Kriterium W: zählt jetzt auch „Kultur und Sehenswürdigkeiten“ (Venedig war sonst nur „Beliebter Urlaubsort“).

## 6.2 Vorschläge, Fahrzeiten (Aufgabe F16)

- Anzeige in Blöcken: unter 7 h genau, bis 10 h volle Stunden („ca. 8 h“), dann „über 10 h“, „über 20 h“, ab 30 h „über 30 h“ mit Flugzeug-Hinweis „Flug empfohlen“ (nur Anzeige). `packages/domain/src/drive-bands.ts`, Details `docs/logik/fahrzeit-bloecke.md`.
- `getTravelTimes` fragt den Routendienst nur für Ziele, deren Autobahn-Schätzung (Luftlinie × 1,2 bei 95 km/h) höchstens 9 h beträgt; fernere bekommen diese Schätzung ohne Routing und ohne Cache-Eintrag (`stats.coarse`), nicht als Rückfall markiert.
- Verträge: `max_drive_minutes` bis 1800 (`MAX_DRIVE_MINUTES`) statt 720; Auswahl bis 7, 10, 20, 30 Stunden und „egal (ganz Europa)“.

## 6.2 Regionsvorschläge, 7.x Vertrag (Aufgabe F17)

- `RegionSuggestionDto` zusätzlich `title` (Kartentitel) und `highlight_place` (additiv, Standard leer bzw. `null`): genau ein Top-Urlaubsort unter den zur Suche passenden Orten → Titel = dieser Ort, Stufe und Wert der Karte = die des Orts; sonst Regionsname und Regionswert. Details: `docs/logik/orts-attraktivitaet.md`.

## 6.10 Rezensionscheck, 6.15 Lob-Labels, 9.x Skills (Aufgabe F18)

- Stichwortlisten (`review-lexicon.yaml`, `praise-lexicon.yaml`) zusätzlich in Spanisch, Portugiesisch, Polnisch, Tschechisch, Kroatisch, Ungarisch, Dänisch, Schwedisch, Norwegisch und Griechisch (15 Sprachen), jeweils mit Verneinungen bzw. „nichts zu bemängeln“-Wörtern. Bewertungen werden nicht übersetzt; die für unsere Kriterien wichtigen Wörter werden direkt erkannt. Norwegisch `nb`/`nn` gilt als `no` (`lexiconLanguageCode`).
- Skill `reiseplaner.review-verify` Version 1.1.0: Prompt nennt die 15 Sprachen, 52 Evals (8 neue in sechs Sprachen).
- Simulierte Welt: Häuser außerhalb des DACH-Ausschnitts bekommen 40 % ihrer Bewertungen und alle Beschwerden zu ihrem Mangel in der Landessprache (`packages/providers/src/fake/local-reviews.ts`).

## 6.2 Vorschläge nach Entfernung, Auto oder Flugzeug (Aufgabe F19)

- Vorschlagsfilter je Entfernung (`destination-quality.ts`): ab 4 h Fahrt Mindest-Attraktivität 4, ab 7 h 6, ab 12 h 8; Strand, Kultur, Shopping zählen die Fahrzeit doppelt; Flug nur Top-Ziele; Spielraum 1,5 Punkte in Hotspot-Regionen. Rangfolge mit Filter nach Qualität statt nach Anzahl passender Orte; höchstens 8 (nah) bzw. 6 Regionen.
- Anfragen `POST /suggestions/regions` und `/places` zusätzlich `travel_mode` (`car`|`flight`, Standard `car`), `continents` (Standard leer = alle), `max_flight_minutes` (optional); Antwort der Regionen zusätzlich `quality_filter`. Alles additiv, Standardwerte erhalten das bisherige Verhalten (bis auf die Qualitätsstufen).
- Flugzeit-Schätzung 45 min + Luftlinie/750 km/h ohne Routendienst und ohne Cache; keine Inlandsflüge, mindestens 500 km. Flüge werden nicht verkauft.
- Kontinente je Katalogland (`destinations.ts`); Katalog derzeit nur Europa.
