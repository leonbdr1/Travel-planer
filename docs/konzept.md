# Konzept: [ARBEITSTITEL] – Flexible Unterkunftssuche

Stand: 29.09.2026 · Fassung 4 · Produktkonzept aus Phase 1, ergänzt in Phase 2 um Wünsche, Zielgebiete, Ortskatalog und die Einordnung in die Firmenplattform (Frontlift, fi-deck), in Fassung 4 um die Entscheidungshilfe (Ziel, automatische Vorauswahl, Finale mit Aufpreis-Vergleich, Lob-Labels; Abschnitte 9.9 bis 9.11, F15 bis F17), am selben Tag präzisiert nach Bens Entscheidungen (Preisleiter mit fünf Finalisten, Lage aus OpenStreetMap, Ausnahme für deutlich günstigere Häuser, Häuser ohne Bewertungen, Lob-Labels nach Anteil), am 28. und 29.09.2026 nach Bens Test mit echten Hotels (Note ab 30 Bewertungen, Sortierung nach Preis mit „Unsere Wahl“, Schnäppchen nur nach Termin und gleichem Zimmer, Warnsignale erst, wenn Beschwerden überhandnehmen, Häuser ohne Bewertungen unten in der Liste). Die Technik steht in `docs/architektur.md`.

---

## 1. Vision

Eine Unterkunftssuche für Reisende, die bei Ort und Termin flexibel sind. Der Nutzer beschreibt seinen Rahmen: Startort, maximale Fahrzeit, Reiseart, Zeitfenster, Reisedauer, Budget und Ansprüche. Das Produkt schlägt passende Regionen und Orte vor, durchsucht alle Kombinationen aus Ort und Termin gleichzeitig, bewertet alle Treffer und zeigt die besten Angebote. Gebucht wird direkt im Produkt.

Leitfrage des Produkts: Nicht „Was kostet Ort X am Wochenende Y?“, sondern „Wann und wo bekomme ich innerhalb meines Rahmens das beste Angebot?“

## 2. Getroffene Grundsatzentscheidungen

| Thema | Entscheidung |
|---|---|
| Plattform | Responsive Website. Eine lokal lauffähige Version ist nur Entwicklungsstufe, kein eigenes Produkt. |
| Markt | Deutschland, Österreich, Schweiz. Sprache Deutsch, Währung Euro. |
| Fokus | Nur Unterkünfte. Flüge und Reiseplanung sind spätere Features. |
| Zielgebiete | Start: Deutschland, Österreich, Schweiz und Südtirol, alle Arten von Hotspots (Wandern, Seen, Städte, Wellness usw.). Später weltweit und alle Reisearten, zum Beispiel „Strand mit schwarzem Sand“ → Lanzarote. |
| Wünsche | Auswahl über Chips. Optionaler Freitext wird automatisch in Chips übersetzt. |
| Orts- und Regionsvorschläge | Kommen aus einem geprüften Ortskatalog. Der Katalog wird einmalig KI-gestützt erstellt und manuell freigegeben. Zur Laufzeit schlägt keine KI Orte vor. |
| Datenquelle | LiteAPI (Nuitée Connect). |
| Buchung | Buchung im eigenen Produkt über LiteAPI. LiteAPI wickelt die Zahlung als Merchant of Record ab. |
| Einnahmen | Marge pro Buchung. Keine Werbung im MVP. |
| Vorkasse | Der Betreiber streckt keine Buchungsbeträge vor (K.-o.-Kriterium, siehe Abschnitt 13). |
| Nutzerkonto | Kein Nutzerkonto im MVP. Zugriff auf Buchungen über Buchungsnummer und E-Mail. |
| Ziel | Marktfähiges Produkt mit Einnahmen. Ein rein privates Werkzeug ist nur der Ausweg im schlimmsten Fall. |
| Betreiber | Fischermann Intelligence bzw. Fischermann Media, wie bei Frontlift (zu bestätigen, ⛔ BEN-GATE BG-02). Das Produkt tritt rechtlich und in der Kommunikation getrennt von Kundenprodukten wie Gour-med auf. |
| Einordnung im Portfolio | Eigenständiges B2C-Produkt der Firma. Technisch läuft es auf derselben Plattform wie Frontlift (Cloudflare, Supabase, Claude-Skills im Firmenformat) und wird mit fi-deck gebaut. |

## 3. Zielgruppe

**Primär:** Preis- und qualitätsbewusste Kurzurlauber aus Deutschland, Österreich und der Schweiz. Sie reisen mit dem Auto an, bleiben 2 bis 7 Nächte und sind bei Ort und Termin flexibel.

**Startnische (Marketing):** Natur- und Wanderurlaub. Der Ortskatalog enthält von Anfang an alle Arten von Hotspots in Deutschland, Österreich, der Schweiz und Südtirol. Weltweite Ziele und weitere Reisearten folgen später.

**Beispielnutzer:** Wohnt in Stuttgart, will maximal 3 Stunden fahren und hat im Oktober und November mehrere freie Wochenenden. Gesucht ist eine saubere, günstige Unterkunft in einem schönen Wanderort, egal welchem.

## 4. Problem und Lösung

### Problem

Wer flexibel ist, muss heute manuell in mehreren Stufen suchen:

1. Passende Regionen und Orte recherchieren.
2. Für jeden Ort und jeden möglichen Termin einzeln suchen.
3. Pro Treffer Preis, Ausstattung und Rezensionen prüfen.
4. Alles vergleichen.

Der Aufwand wächst mit Orte × Termine × Unterkünfte. Bestehende Portale bieten Flexibilität nur grob, zum Beispiel einen ganzen Monat. Ein Muster wie „jedes Wochenende Freitag bis Sonntag in fünf Orten“ können sie nicht abbilden. Deshalb entgehen Flexiblen die besten Angebote, obwohl ihre Flexibilität eigentlich ein Vorteil ist.

### Lösung

Ein automatisierter Suchtrichter:

1. Region wählen, KI-unterstützt.
2. Orte wählen, KI-unterstützt und vom Nutzer bestätigt.
3. Alle Kombinationen aus Ort und Termin gleichzeitig durchsuchen.
4. Treffer filtern und nach Qualität bewerten.
5. Schnäppchen erkennen.
6. Rezensionen der Top-Treffer per KI prüfen.
7. Ergebnisse als Preis-Matrix und Rangliste anzeigen.
8. Direkt buchen.

## 5. Abgrenzung zu Wettbewerbern

| Wettbewerber | Was sie können | Was fehlt |
|---|---|---|
| Booking.com, Expedia | Große Auswahl, Buchung, Bewertungen | Suche je Ort und Termin. Flexible Daten nur grob. Keine orts- und terminübergreifende Rangliste. |
| Google Hotels, Trivago, Kayak | Preisvergleich mehrerer Anbieter | Ebenfalls je Ort und Termin. Kein kombinierter Scan über viele Orte und Termine. |
| KI-Reiseplaner (z. B. Mindtrip, Layla, KI-Assistenten der Buchungsportale) | Reiseideen, Routen, Chat | Kein systematischer Preis-Scan über Kombinationen aus Ort und Termin. Keine Schnäppchenlogik. |

**Alleinstellungsmerkmal:** Kombinatorische Suche über Orte und Termine, Qualitätsscore, der Anzahl und Alter der Bewertungen berücksichtigt, erklärte Schnäppchenerkennung, KI-Rezensionscheck und Buchung an einem Ort.

**Entscheidungshilfe statt Filterwand (Fassung 4):** Portale filtern nach Etiketten wie Sternen. Das Produkt fragt nach dem Ziel (günstig und sauber, Preis-Leistung, Komfort), sortiert selbst aus, was dazu nicht passt, und legt dem Nutzer am Ende nur die wenigen Unterkünfte vor, zwischen denen die Wahl wirklich offen ist. Dort zeigt es, was jeder Mehrpreis bringt („+10 € · Sauna“). Die letzte Entscheidung trifft der Nutzer. Lob aus echten Gästebewertungen erscheint als einfaches Label („Gutes Frühstück“, „Besonders sauber“), ohne dass der Nutzer etwas einstellen muss.

### 5.1 Maximum-Messlatte der Kernfunktion

Die Kernfunktion (Kombinationssuche über Orte und Termine mit Preis-Matrix) ist aus bestehenden Funktionen der Wettbewerber abgeleitet. Nach der Maximum-Regel der Firma (fi-deck, Execution-Protocol) gilt sie erst als fertig, wenn sie diese Messlatte nachweislich erfüllt. Solange das nicht belegt ist, wird sie in `STATUS.md` als `demonstrated-not-maximized` geführt, mit datiertem Revisit-Termin.

**Competitor-Baseline** (Evidenzklasse je Aussage; wird vor M5 verifiziert, ⛔ BEN-GATE BG-18):
- **Booking.com:** Flexible Datumsauswahl nur über grobe Zeiträume (etwa ganze Monate). Suche je Ort, keine orts- und terminübergreifende Rangliste. *Evidenz: Nutzerbeobachtung, nicht verifiziert.*
- **Google Hotels:** Preisvergleich mehrerer Anbieter je Ort und Termin, flexible Datumsoptionen. *Evidenz: nicht verifiziert.*
- **KI-Reiseplaner:** Empfehlungen im Chat, kein systematischer Preis-Scan über Kombinationen. *Evidenz: Einschätzung aus der Recherche in Phase 1, nicht verifiziert.*

**„Besser“ heißt konkret:**
1. Eine einzige Suche deckt bis zu 10 Orte × 12 Termine ab und zeigt das Ergebnis vollständig als Matrix. Leere und fehlgeschlagene Zellen sind als solche erkennbar.
2. Qualität wird ehrlich bewertet: Anzahl und Aktualität der Bewertungen fließen ein. Eine 5,0 aus drei Bewertungen schlägt keine 9,0 aus 400.
3. Jedes Schnäppchen trägt eine nachprüfbare Begründung aus den Daten der eigenen Suche. Es gibt keine Ersparnis-Behauptung ohne Datengrundlage.
4. Warnhinweise aus Rezensionen nennen Thema, Häufigkeit und Aktualität.
5. Vom Ergebnis bis zur bestätigten Buchung mit Hotel-Bestätigungsnummer ohne Wechsel auf eine andere Website.

**Akzeptanzbeispiele:**
1. *Gegeben* Startort Stuttgart, 180 Minuten, Thema Wandern, Zeitfenster 01.10. bis 30.11.2026, 2 Nächte ab Freitag, 5 bestätigte Orte. *Wenn* die Suche abgeschlossen ist, *dann* zeigt die Matrix 5 × 9 Zellen, jede mit Preis, „kein Angebot“ oder „keine Daten“, und die Liste enthält jede Unterkunft genau einmal.
2. *Gegeben* Unterkunft A mit 5,0 aus 3 Bewertungen (5er-Skala) und Unterkunft B mit 9,0 aus 400 Bewertungen (10er-Skala) zum gleichen Preis. *Dann* steht B in der Rangliste vor A.
3. *Gegeben* dieselbe Unterkunft an 4 Terminen, an einem davon 30 % günstiger als ihr Median. *Dann* trägt dieses Angebot die Begründung „30 % günstiger als dieselbe Unterkunft an deinen anderen Terminen“.
4. *Gegeben* eine Unterkunft mit drei Beschwerden über Schimmel in den letzten sechs Monaten. *Dann* zeigt die Detailansicht „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“, gekennzeichnet als KI-gestützte Auswertung.
5. *Gegeben* ein gewähltes Angebot. *Wenn* der Nutzer bucht und bezahlt, *dann* zeigt die Bestätigung Buchungsnummer und Hotel-Bestätigungsnummer.

**Nicht-Ziele:** Metasuche über mehrere Buchungsportale, Preisgarantie, Flüge, Aktivitätenplanung.

**Revisit-Trigger:** Beginn von M6 oder vor der ersten öffentlichen Bewerbung, je nachdem, was zuerst eintritt.

## 6. Datenquelle und Geschäftsmodell

- **Datenquelle LiteAPI:** Liefert Preise und Verfügbarkeit in Echtzeit, Unterkunftsinhalte, einzelne Rezensionen mit Datum sowie eine optionale KI-Auswertung der Rezensionen nach Kategorien, darunter Sauberkeit. Ermöglicht außerdem die Buchung.
- **Buchungsablauf:** Die Buchung findet im Produkt statt. Die Zahlung läuft über die Zahlungslösung von LiteAPI, die als Merchant of Record auftritt. Der Betreiber nimmt kein Kundengeld an.
- **Einnahmen:** Eine selbst festgelegte Marge pro Buchung. Ausgezahlt wird nach Abreise des Gastes.
- **Kosten:** Die Kern-Endpunkte von LiteAPI sind kostenlos, solange das Verhältnis von Suchanfragen zu Buchungen 5.000 : 1 nicht übersteigt. Darüber wird Mehrnutzung berechnet; der Preis dafür ist offen (Validierung V6). Ortssuche und Preisindex sind kostenpflichtig und werden nicht genutzt. Die laufenden Grundkosten (Hosting, Datenbank, E-Mail, Domain, KI-Aufrufe) sind in `docs/architektur.md` Abschnitt 16 beziffert.
- **Werbung:** Keine im MVP, damit Vertrauen und Konversion nicht leiden.

## 7. Vertrauen und Seriosität

Eine unbekannte Website mit eigener Buchung muss Vertrauen aktiv herstellen. Im MVP setzt das Produkt dafür nur kostenlose Mittel ein:

1. **Hotel-Bestätigungsnummer:** Jede Buchungsbestätigung zeigt neben der eigenen Buchungsnummer die Bestätigungsnummer des Hotels. Dazu kommt der Hinweis, dass der Gast die Buchung direkt beim Hotel prüfen kann.
2. **Bekannte Zahlungswege:** Bezahlt wird über die Zahlungsseite von LiteAPI mit gängigen Methoden. Eine Kreditkarte bietet zusätzlich die Rückbuchungsmöglichkeit der Bank.
3. **Referenzpreis:** Wo verfügbar, zeigt die Detailansicht den öffentlichen Preis bei Booking.com oder Expedia als Vergleich.
4. **Stornobedingungen:** Sie stehen vor der Buchung deutlich sichtbar. Es gibt einen Filter „kostenlos stornierbar“.
5. **Pflichtangaben:** Vollständiges Impressum, AGB und Datenschutzerklärung. Die Rolle des Betreibers als Vermittler und der Vertragspartner des Gastes werden klar benannt.
6. **Echte Bewertungen:** Nach dem Aufenthalt erhält der Gast eine Einladung zur Bewertung, zum Beispiel über Trustpilot. Gekaufte oder gefälschte Bewertungen sind ausgeschlossen.
7. **Erreichbarer Kundenservice:** Eine Kontakt-E-Mail mit festgelegter Antwortzeit. Fälle, die das Hotel oder die Buchung selbst betreffen, werden an den Support von LiteAPI weitergegeben.
8. **KI-Kennzeichnung:** Alles, was eine KI erzeugt oder ausgewertet hat, ist sichtbar und maschinenlesbar gekennzeichnet: die Auswertung der Rezensionen („KI-gestützte Auswertung von Gästebewertungen“), die Beschreibungen im Ortskatalog („KI-gestützt erstellt, redaktionell geprüft“) und die Übersetzung von Freitext in Auswahl-Chips (Hinweis direkt am Eingabefeld). Es gilt die Firmenregel aus Frontlift: im Zweifel kennzeichnen. Grundlage ist die Transparenzpflicht nach Art. 50 der EU-KI-Verordnung, die seit dem 2. August 2026 gilt.
9. **Keine Übertreibungen (Claims-Regel):** Keine Preisgarantie, kein „Bestpreis“, kein „immer am günstigsten“ und keine Ersparnis-Angaben ohne Datengrundlage. Jede Ersparnis-Angabe bezieht sich ausdrücklich auf die Treffer der eigenen Suche. Die Regel wird im Build automatisch geprüft, nach dem Vorbild des Overclaim-Guards von Frontlift.

**Später, sobald Umsatz da ist:** kostenpflichtige Gütesiegel wie Trusted Shops mit Käuferschutz. Das kostet eine laufende Monatsgebühr und ist deshalb nicht Teil des MVP.

## 8. Nutzerablauf (MVP)

1. **Suchrahmen eingeben:** Startort, maximale Fahrzeit, Reiseart, Zeitfenster, Reisemuster, Personen und Zimmer, Budget, Mindeststandard, Wünsche als Chips, optional ergänzt durch Freitext.
2. **Region:** Das System schlägt passende Regionen vor, der Nutzer wählt eine oder mehrere aus.
3. **Orte:** Das System schlägt 5 bis 10 Orte vor. Der Nutzer bestätigt, streicht oder ergänzt eigene Orte. Alternativ gibt er Orte direkt ein und überspringt Schritt 2.
4. **Suche:** Das System erzeugt alle Kombinationen aus Ort und Termin und durchsucht sie parallel. Der Fortschritt wird angezeigt.
5. **Bewertung:** Filter, Qualitätsscore, Schnäppchenerkennung, Rangliste.
6. **Rezensionscheck:** Die KI prüft die Rezensionen der Top 10 und erzeugt Warnhinweise.
7. **Ergebnis:** Preis-Matrix und Rangliste, dazu eine Detailansicht pro Unterkunft.
8. **Buchung:** Zimmer und Tarif wählen, der Preis wird erneut geprüft, Gastdaten eingeben, bezahlen.
9. **Bestätigung:** Eine Bestätigungsseite und eine E-Mail mit Buchungsnummer, Hotel-Bestätigungsnummer und Stornobedingungen.

## 9. Fachliche Definitionen

### 9.1 Reisemuster und Termine
- Eingaben: Zeitfenster (Start- und Enddatum), Anzahl Nächte (1 bis 14) und erlaubte Anreisewochentage (einer oder mehrere).
- Termine sind alle Paare aus Anreise und Abreise, bei denen die Anreise auf einen erlaubten Wochentag fällt und der gesamte Aufenthalt im Zeitfenster liegt.
- Beispiel: 2 Nächte, Anreise nur freitags, Zeitfenster 01.10. bis 30.11. ergibt jedes Wochenende von Freitag bis Sonntag in diesem Zeitraum.

### 9.2 Preis
- Verglichen wird immer der **Gesamtpreis des Aufenthalts** inklusive aller im Voraus zu zahlenden Steuern und Gebühren.
- Vor Ort zu zahlende Gebühren wie die Kurtaxe werden separat ausgewiesen, soweit bekannt. Ist unbekannt, ob solche Gebühren anfallen, wird das gekennzeichnet.
- Das Budget des Nutzers bezieht sich auf den Gesamtpreis. Die Anzeige pro Nacht ist zusätzlich möglich.

### 9.3 Qualitätsscore
Der Score setzt sich aus diesen Bestandteilen zusammen:
- **Bewertungsdurchschnitt, gewichtet nach Anzahl:** Bei wenigen Bewertungen wird die Note Richtung Gesamtmittelwert gezogen. Eine 5,0 aus drei Bewertungen zählt also weniger als eine 4,6 aus 400. Ab 30 Bewertungen zählt der Durchschnitt so, wie er ist; Bewertungen, die älter als drei Jahre sind, zählen dabei ein Drittel (Ben, 28.09.2026).
- **Aktualität:** Neuere Bewertungen zählen stärker. Ein klarer Trend (etwa alte schlecht, neue gut) fließt ein.
- **Sauberkeit:** Wo verfügbar, geht der Sauberkeitswert gesondert ein.
- **Warnhinweise:** Treffer aus dem Rezensionscheck führen zu Abzügen.
- Die konkreten Gewichte werden anhand von Testdaten festgelegt (offene Frage).

### 9.4 Schnäppchen
Ein Treffer ist ein Schnäppchen, wenn dieselbe Unterkunft an diesem Termin deutlich günstiger ist als an den anderen gesuchten Terminen. Jede Markierung wird mit einem Satz im Klartext begründet; in der Preis-Matrix erscheint die Begründung, wenn man mit der Maus auf den Preis zeigt.
- Verglichen wird Gleiches mit Gleichem: dasselbe Zimmer mit derselben Verpflegung und denselben Stornobedingungen. Ist an einem Termin das Doppelzimmer frei und an den anderen nur noch die Suite, ist das kein Schnäppchen (Ben, 29.09.2026).
- „Deutlich“ heißt: mindestens 20 % unter dem mittleren Preis dieses Zimmers an den gesuchten Terminen, bei mindestens drei Terminen.
- Preis-Leistungs- und Orts-Ausreißer sind entfallen (Ben, 28.09.2026): Mit echten Preisen traf das fast jedes Angebot.

### 9.5 Rangliste
- Standardsortierung: Preis, die günstigste Unterkunft zuerst (Ben, 28.09.2026).
- **„Unsere Wahl“** markiert das Angebot, bei dem belegte Vorteile den Preis am besten aufwiegen: eine Bewertung über der Mindestnote des Ziels, viele Bewertungen, bei „Komfort“ Extras wie Frühstück oder Sauna. Unterkünfte ohne Bewertungen sind nie „Unsere Wahl“.
- Alternativ sortierbar nach „Unsere Wahl zuerst“ oder nach Bewertung.
- Die Hauptkriterien des Rankings werden für Nutzer verständlich erklärt. Das ist eine gesetzliche Pflicht für Vergleichs- und Vermittlungsportale.

### 9.6 Rezensionscheck
- Wird nur für die Top 10 der aktuellen Rangliste ausgeführt.
- Geprüfte Themen: Sauberkeit, Schimmel, Ungeziefer, Lärm, Geruch, baulicher Zustand, Abweichung von Fotos oder Beschreibung.
- Ergebnis pro Unterkunft: Warnhinweise mit Thema, Häufigkeit und Aktualität, etwa „Sauberkeit: 4 Erwähnungen, davon 3 in den letzten 6 Monaten“.
- Namen der Verfasser werden nicht angezeigt.

### 9.7 Region, Orte und Fahrzeit
- Regionen und Orte stammen aus dem Ortskatalog. Er wird einmalig KI-gestützt aus allgemein bekannten Hotspots erstellt, manuell geprüft und danach ohne KI genutzt. Wanderrouten oder Aktivitäten werden nicht vorgeschlagen.
- Die maximale Fahrzeit gilt für jeden einzelnen Ort, gerechnet mit dem Auto ab dem Startort.
- Orte, die der Nutzer selbst eingibt, werden ohne Fahrzeitfilter übernommen. Die Fahrzeit wird aber angezeigt.

### 9.8 Suchumfang im MVP
- Höchstens 10 Orte × 12 Termine, also 120 Kombinationen pro Suche.

### 9.9 Ziel und automatische Vorauswahl
Grundsatz: Das Programm sortiert aus, was offensichtlich nicht passt. Zwischen dem, was übrig bleibt, entscheidet der Nutzer selbst.

- **Ziel (ein Tipp, Standard „Preis-Leistung“):** „Günstig und sauber“ (Preis zählt am meisten, Sauberkeit ist Pflicht), „Preis-Leistung“ (Qualität und Preis gleich wichtig), „Komfort“ (Qualität zählt mehr als der Preis).
- **Sterne sind kein Qualitätsmerkmal.** Gerade günstige Häuser mit wenigen Sternen sind oft sauberer als 4-Sterne-Häuser zum Billigpreis. Sterne gehen nie in den Qualitätswert ein.
- **Aussortiert wird automatisch, mit Grund und Anzahl:**
  1. Wünsche nicht erfüllt (Budget, Hund, Parkplatz und die übrigen Filter).
  2. Keine Bewertungen und etwas passt nicht ins Bild: auffällig billig für die Sterne oder billiger mit mehr Extras als üblich (Hinweis auf ein Scheinangebot); bei „Komfort“ immer, weil die Qualität niemand bestätigt hat. Passt ein Haus ohne Bewertungen ins Bild, kommt höchstens eines ins Finale, gekennzeichnet „noch keine Bewertungen“. Die aussortierten Häuser ohne Bewertungen stehen mit ihrem Grund ganz unten unter „Alle Angebote“: Ohne Bewertungen ist ein Haus nicht zwingend schlecht, die Entscheidung liegt beim Nutzer. Ins Finale und in „Unsere Wahl“ kommen sie nicht (Ben, 29.09.2026).
  3. Warnsignale: Beschwerden über Schimmel, Ungeziefer oder Schmutz nehmen überhand, bei Schimmel oder Ungeziefer mindestens 3 Gäste und mindestens 10 % der geprüften Bewertungen, bei Schmutz mindestens 4 Gäste und 15 %. Bewertungen der letzten 6 Monate zählen dabei doppelt, ältere also weniger, wie beim Lob. Nur weil ein paar Gäste Schimmel melden, ist ein Haus nicht unbewohnbar: Bei wenigen Meldungen kommt es ganz normal in die Bewertung, mit Warnhinweis und Abzug im Qualitätswert, und steht regulär in der Liste. Häuser mit Warnsignal erscheinen dagegen gar nicht, auch nicht unten in der Liste (Ben, 29.09.2026).
  4. Zu schwach bewertet für das Ziel (Mindest-Qualitätswert je Ziel). Ausnahme außer bei „Komfort“: Ein geprüftes Haus ohne Warnsignal ab 6,5 bleibt, wenn es mindestens 25 % günstiger ist als das günstigste Haus mit normaler Note; wenn die meisten sehr teuer sind, kann es trotzdem reichen.
  5. **Sterne-Falle:** 4 oder 5 Sterne zum Preis eines einfachen Hauses, ohne geprüfte gute Bewertungen.
  6. Zu teuer für das Ziel: bei „Günstig und sauber“ deutlich über dem günstigsten sauberen Angebot, bei „Preis-Leistung“ weit darüber; bei „Komfort“ zählt nur das Budget.
  7. Es gibt ein besseres Angebot: ein anderes ist nicht teurer, mindestens gleich gut bewertet und bietet alles, was dieses bietet.
- **Finalisten:** Was übrig bleibt, höchstens 5 Unterkünfte mit je ihrem günstigsten passenden Angebot. Unterkünfte mit geprüften Rezensionen haben Vorrang; eine ungeprüfte rückt nur nach, wenn nicht genug geprüfte passen, und ist gekennzeichnet. Unter „Alle Angebote“ stehen alle Unterkünfte, die zum Ziel passen; die aussortierten sind mit Grund gezählt, die ohne Bewertungen stehen ganz unten (Punkt 2). Die Aussortierung ist nachvollziehbar.
- Die Schwellenwerte hat Ben am 28. und 29.09.2026 festgelegt; sie werden mit echten Daten im Testbetrieb überprüft.

### 9.10 Finale: was der Mehrpreis bringt
- Die Finalisten stehen als **Preisleiter** untereinander, das günstigste zuerst: je Zeile Preis, Aufpreis, Name, Note und kurze Badges statt Sätzen (grün: hat es zusätzlich, durchgestrichen: fehlt, neutral: wie beim günstigsten), zum Beispiel „Sauna“, „Parkplatz“, „Bus 5 min“.
- Für jeden weiteren Finalisten zeigt das Produkt den Aufpreis gegenüber dem günstigsten und, was er bringt oder kostet: Ausstattung (Sauna, Schwimmbad, Parkplatz, Küche …), Verpflegung, Stornierbarkeit, Lob-Labels, Qualitätswert, Lage zum Ortskern, Gehminuten zu Bushaltestelle, Bahnhof, Lift und Supermarkt sowie Restaurants in der Nähe (Kartendaten von OpenStreetMap), anderer Ort oder Termin.
- „Unsere Wahl“ markiert im Finale den Finalisten, bei dem belegte Vorteile den Preis am besten aufwiegen (Abschnitt 9.5, Ben 28.09.2026); die Reihenfolge bleibt nach Preis. Ob dem Nutzer 10 € für die Sauna wert sind, entscheidet er weiterhin selbst.

### 9.11 Lob-Labels
- Aus den Rezensionen der geprüften Unterkünfte zählt das Produkt Lob und Kritik je Thema: Frühstück, Sauberkeit, Ruhe, Personal, Betten, Aussicht, Lage (Erwähnungen in den Feldern „Positiv“ und „Negativ“ der Bewertungen, Stichwortliste in fünf Sprachen, die letzten 24 Monate).
- Ein Label wie „Gutes Frühstück“ oder „Besonders sauber“ erscheint, wenn genug Gäste im Verhältnis zu allen Bewertungen das Thema loben (mindestens 3 und mindestens 5 % der Bewertungen; von 1000 Gästen sagen 3 nichts aus, von 40 schon; Bewertungen in Sprachen, die das Programm nicht auswertet, etwa Japanisch, zählen dabei nicht mit), Bewertungen der letzten 6 Monate doppelt zählen, das Lob mindestens 80 % der Erwähnungen ausmacht und keine Warnung zum passenden Beschwerdethema vorliegt. Die Detailansicht nennt die Zahlen, etwa „Frühstück: 23× gelobt, 2× kritisiert“.
- Labels erscheinen ohne Zutun des Nutzers in Liste, Finale und Detailansicht.

## 10. MVP-Features als User Stories

### F1 Suchrahmen eingeben
Als Nutzer möchte ich meinen Reiserahmen in einem Formular angeben, damit das System alle passenden Möglichkeiten für mich durchsucht.

Akzeptanzkriterien:
- Pflichtfelder: Startort, Zeitfenster, Anzahl Nächte, mindestens ein Anreisewochentag, Anzahl Erwachsene.
- Optionale Felder: maximale Fahrzeit, Reiseart, Kinder mit Alter, Anzahl Zimmer, Budget (Gesamtpreis), Mindeststerne, Mindestbewertung, Unterkunftsart, Wünsche als Chips und optional als Freitext.
- Das Formular zeigt vor dem Absenden die Anzahl der entstehenden Termine an.
- Freitext-Wünsche werden automatisch in Chips übersetzt und dem Nutzer vorausgewählt angezeigt. Nicht zuordenbare Wünsche erscheinen als Hinweis. Ist die Übersetzung nicht verfügbar, funktioniert die Suche ohne Freitext weiter.
- Am Freitextfeld steht der Hinweis, dass die Eingabe per KI in Auswahl-Chips übersetzt wird.
- Der Startort wird per Autovervollständigung aus einer eigenen Ortsdatenbank gewählt: Städte, Orte und Postleitzahlen in Deutschland, Österreich, der Schweiz und Südtirol.
- Ungültige Eingaben werden mit einer verständlichen Meldung abgelehnt, etwa ein Zeitfenster, das kürzer als der Aufenthalt ist, oder eine Überschreitung des Suchumfangs.

### F2 Regionsvorschlag
Als Nutzer möchte ich passende Regionen vorgeschlagen bekommen, damit ich nicht selbst recherchieren muss.

Akzeptanzkriterien:
- Auf Basis von Startort, maximaler Fahrzeit und Reiseart werden 2 bis 5 Regionen aus dem Ortskatalog vorgeschlagen, jeweils mit einem Satz Begründung.
- Der Nutzer kann eine oder mehrere Regionen wählen oder den Schritt überspringen und Orte direkt eingeben.

### F3 Ortsvorschlag und Ortsauswahl
Als Nutzer möchte ich konkrete Orte vorgeschlagen bekommen und die Auswahl kontrollieren, damit nur sinnvolle Orte durchsucht werden.

Akzeptanzkriterien:
- Pro gewählter Region werden 5 bis 10 Orte aus dem Ortskatalog vorgeschlagen, jeweils mit Fahrzeit ab Startort und einem Satz Begründung.
- Orte über der maximalen Fahrzeit werden nicht vorgeschlagen.
- Der Nutzer kann Orte abwählen und eigene Orte hinzufügen.
- Die Suche startet erst nach ausdrücklicher Bestätigung der Ortsliste.

### F4 Kombinationssuche
Als Nutzer möchte ich, dass alle Kombinationen aus Ort und Termin gleichzeitig durchsucht werden, damit ich keinen Termin und keinen Ort manuell prüfen muss.

Akzeptanzkriterien:
- Für jede Kombination aus Ort und Termin werden verfügbare Unterkünfte mit Gesamtpreis abgefragt.
- Ein Fortschritt wird angezeigt, zum Beispiel „34 von 60 Kombinationen durchsucht“.
- Fehlgeschlagene oder leere Kombinationen brechen die Suche nicht ab. Sie werden im Ergebnis als „keine Daten“ markiert.
- Jeder Preis trägt den Zeitpunkt der Abfrage.

### F5 Filter
Als Nutzer möchte ich die Treffer nach meinen Mindestanforderungen filtern, damit nur relevante Unterkünfte übrig bleiben.

Akzeptanzkriterien:
- Filter: Budget, Mindeststerne, Mindestbewertung, Mindestanzahl Bewertungen, Unterkunftsart, kostenlos stornierbar, Verpflegung.
- Die Filter aus dem Suchformular sind vorbelegt und im Ergebnis ohne neue Suche änderbar.
- Ab Fassung 4 stehen im Suchformular nur Budget, Ziel (F15) und Wünsche; Sterne, Mindestbewertung und Mindestanzahl sind „Weitere Filter“ im Ergebnis.

### F6 Qualitätsscore
Als Nutzer möchte ich einen verlässlichen Qualitätswert pro Unterkunft sehen, damit ich Unterkünfte mit wenigen oder veralteten Bewertungen richtig einschätzen kann.

Akzeptanzkriterien:
- Jede Unterkunft mit Bewertungen erhält einen Score nach Abschnitt 9.3.
- Die Detailansicht zeigt die Bestandteile des Scores: Durchschnitt, Anzahl, Aktualität, Sauberkeit.
- Unterkünfte ohne Bewertungen erhalten keinen Score und werden als „noch keine Bewertungen“ gekennzeichnet.

### F7 Schnäppchenerkennung
Als Nutzer möchte ich besonders gute Angebote hervorgehoben sehen, damit ich Gelegenheiten sofort erkenne.

Akzeptanzkriterien:
- Treffer, die eine der Regeln aus Abschnitt 9.4 erfüllen, erhalten eine Schnäppchen-Markierung.
- Jede Markierung zeigt eine Begründung im Klartext, zum Beispiel „28 % günstiger als dieselbe Unterkunft an deinen anderen Terminen“.

### F8 KI-Rezensionscheck
Als Nutzer möchte ich vor Problemen wie Schmutz oder Ungeziefer gewarnt werden, ohne alle Rezensionen selbst lesen zu müssen.

Akzeptanzkriterien:
- Der Check läuft automatisch für die Top 10 der Rangliste.
- Die Ergebnisse erscheinen als Warnhinweise nach Abschnitt 9.6.
- Unterkünfte ohne Auffälligkeiten erhalten den Hinweis „keine Auffälligkeiten in den geprüften Rezensionen“, dazu die Anzahl der geprüften Rezensionen.
- Warnhinweise mindern den Qualitätsscore.
- Warnhinweise und Rezensionsauswertung sind als KI-gestützte Auswertung gekennzeichnet, sichtbar und maschinenlesbar (Abschnitt 7, Punkt 8).

### F9 Preis-Matrix
Als Nutzer möchte ich auf einen Blick sehen, welcher Ort an welchem Termin das beste Angebot hat.

Akzeptanzkriterien:
- Die Matrix zeigt Orte als Zeilen und Termine als Spalten.
- Jede Zelle zeigt den Preis des besten Angebots, das alle Filter erfüllt, farblich abgestuft von günstig nach teuer.
- Zellen ohne passendes Angebot sind als leer gekennzeichnet.
- Ein Klick auf eine Zelle öffnet die Treffer dieser Kombination.

### F10 Rangliste und Detailansicht
Als Nutzer möchte ich die besten Angebote als Liste sehen und Details prüfen können.

Akzeptanzkriterien:
- Die Liste zeigt pro Eintrag: Name, Ort, Termin, Gesamtpreis, Qualitätsscore, Schnäppchen-Markierung, Warnhinweise und Stornierbarkeit.
- Die Sortierung ist nach Abschnitt 9.5 umschaltbar.
- Die Detailansicht zeigt Beschreibung, Fotos, Ausstattung, Zimmer und Tarife, Stornobedingungen, Scorebestandteile, Rezensionscheck und, falls verfügbar, den Referenzpreis bei Booking.com oder Expedia.
- Ein Hinweis erklärt die Hauptkriterien des Rankings.

### F11 Buchung
Als Nutzer möchte ich die gewählte Unterkunft direkt buchen können.

Akzeptanzkriterien:
- Vor der Zahlung werden Preis und Verfügbarkeit erneut geprüft. Bei Abweichungen sieht der Nutzer den neuen Preis und muss erneut bestätigen.
- Vor der Zahlung werden angezeigt: Gesamtpreis, vor Ort zu zahlende Gebühren (soweit bekannt), Stornobedingungen, Vertragspartner und der Hinweis, dass für Beherbergung zu einem festen Termin kein Widerrufsrecht besteht.
- Die Zahlung erfolgt über die Zahlungsseite von LiteAPI. Das Produkt speichert keine Zahlungsdaten.
- Scheitert die Buchung, sieht der Nutzer eine verständliche Meldung, und es wird kein Betrag belastet.

### F12 Buchungsbestätigung
Als Nutzer möchte ich eine vollständige, überprüfbare Bestätigung erhalten, damit ich der Buchung vertrauen kann.

Akzeptanzkriterien:
- Die Bestätigungsseite und die Bestätigungs-E-Mail enthalten Buchungsnummer, Hotel-Bestätigungsnummer, Unterkunft mit Adresse und Telefonnummer, Termin, Gäste, Gesamtpreis, Stornobedingungen und Kontakt zum Kundenservice.
- Die E-Mail enthält einen Link zur Buchungsansicht (F13).

### F13 Buchung einsehen und stornieren
Als Nutzer möchte ich meine Buchung ohne Konto einsehen und im Rahmen der Stornobedingungen stornieren können.

Akzeptanzkriterien:
- Zugang über Buchungsnummer und E-Mail-Adresse oder über den Link aus der Bestätigungs-E-Mail.
- Die Ansicht zeigt alle Angaben aus F12 und den aktuellen Status.
- Die Stornierung ist möglich, solange die Stornobedingungen es erlauben. Die anfallenden Kosten werden vor der Bestätigung angezeigt.
- Nach einer Stornierung erhält der Nutzer eine Bestätigungs-E-Mail.

### F14 Pflichtseiten und Transparenz
Als Nutzer möchte ich erkennen, wer hinter dem Angebot steht, damit ich der Seite vertrauen kann.

Akzeptanzkriterien:
- Impressum, AGB, Datenschutzerklärung und Kontaktseite sind von jeder Seite aus erreichbar.
- Die Seite „So funktioniert's“ erklärt die Datenquelle, die Rolle des Betreibers als Vermittler, den Ablauf der Zahlung, die Ranking-Kriterien und den Einsatz von KI.
- Nach dem Aufenthalt wird automatisch eine Einladung zur Bewertung versendet.
- Datenquellen werden genannt, wo Lizenzen es verlangen: Ortsdaten von GeoNames (CC BY 4.0) und Kartendaten von OpenStreetMap-Mitwirkenden, auf denen die Fahrzeitberechnung und die Gehminuten im Finale beruhen.
- Kein Text der Oberfläche verstößt gegen die Claims-Regel (Abschnitt 7, Punkt 9); der Build bricht bei einem Verstoß ab.

### F15 Ziel und automatische Vorauswahl
Als Nutzer möchte ich nur sagen, worauf es mir ankommt, damit das Programm alles Unpassende für mich aussortiert.

Akzeptanzkriterien:
- Das Suchformular fragt mit einem Tipp nach dem Ziel (Abschnitt 9.9); ohne Wahl gilt „Preis-Leistung“.
- Das Ergebnis zeigt, wie viele Unterkünfte aus welchem Grund aussortiert wurden, und bietet den Weg zu allen Angeboten.
- Eine 4-Sterne-Unterkunft zum Preis eines einfachen Hauses ohne geprüfte gute Bewertungen kommt nicht ins Finale.
- Das Ziel lässt sich im Ergebnis ohne neue Suche ändern.

### F16 Finale mit Aufpreis-Vergleich
Als Nutzer möchte ich zwischen den letzten passenden Unterkünften selbst entscheiden und dabei sehen, was mir ein Mehrpreis bringt.

Akzeptanzkriterien:
- Höchstens 5 Finalisten als Preisleiter, das günstigste zuerst; „Unsere Wahl“ ist markiert (Abschnitt 9.10).
- Jeder weitere Finalist zeigt den Aufpreis und die Unterschiede zum günstigsten (Abschnitt 9.10).
- *Gegeben* Wohnung 1 für 100 € und Wohnung 2 für 110 € mit Sauna, beide sauber und gut bewertet, Ziel „Günstig und sauber“. *Dann* stehen beide im Finale, und Wohnung 2 zeigt „+10 € · Sauna“. Eine Luxuswohnung für 300 € und eine Wohnung für 80 € mit gehäuften Beschwerden über Schmutz erscheinen nicht im Finale.

### F17 Lob-Labels
Als Nutzer möchte ich auf einen Blick sehen, was Gäste an einer Unterkunft loben, ohne etwas einstellen zu müssen.

Akzeptanzkriterien:
- Labels nach Abschnitt 9.11 in Liste, Finale und Detailansicht.
- Die Detailansicht nennt Lob und Kritik je Thema mit Anzahl.

## 11. Spätere Features

| Feature | Anmerkung |
|---|---|
| Preisalarm und gespeicherte Suchen | Erfordert ein Nutzerkonto. Besonders wertvoll für flexible Nutzer. |
| Preishistorie | Verbessert die Schnäppchenerkennung über die aktuelle Suche hinaus. |
| Weitere Datenquellen und Affiliate-Links | Booking.com, Agoda, Expedia, Hotels.com, Vrbo. Die Anfragetexte an die Partner sind vorbereitet. |
| Ferienwohnungen ausbauen | Über Vrbo, und über Airbnb, falls sich dort je ein Zugang ergibt. |
| Flüge | Gleiches Prinzip: mehrere Ziele × Termine. Achtung: Flug und Unterkunft zusammen verkauft kann Pflichten aus dem Pauschalreiserecht auslösen. |
| App | Nach bewährter Website. |
| Weltweite Ziele und alle Reisearten | Zum Beispiel „Strand mit schwarzem Sand“ → Lanzarote. Die Erreichbarkeit wird dann auch per Flug berechnet. |
| Gütesiegel mit Käuferschutz | Zum Beispiel Trusted Shops. Laufende Kosten, deshalb erst mit Umsatz. |
| Werbung | Optional. Nur, wenn sie die Konversion nicht beeinträchtigt. |
| Weitere Sprachen und Märkte | Nach Erfolg in Deutschland, Österreich und der Schweiz. |
| Reiseplanung (Aktivitäten, Routen) | Niedrige Priorität. |

## 12. Verworfene Ideen

| Idee | Begründung |
|---|---|
| Google Hotels über Drittanbieter (z. B. SerpApi) | Laufende Kosten müssten vorgestreckt werden, es gibt keine Provision, und Google klagt gegen den Anbieter. |
| Reine Weiterleitung als Hauptmodell | Die dafür nötigen Daten-Schnittstellen (Booking, Expedia, Agoda) gibt es nur nach Partnerzusage. LiteAPI verdient bei Weiterleitung nichts. Bleibt als späteres Zusatzmodell möglich. |
| Direktes Scraping von Booking.com oder Airbnb | Rechtliches Risiko (Nutzungsbedingungen, Umgehung technischer Schutzmaßnahmen) und technisch instabil. |
| Airbnb-Anbindung | Keine öffentliche API und kein Affiliate-Programm. |
| Travelpayouts / Hotellook | Eingestellt. |
| Flächige Suche im gesamten Fahrzeit-Radius | Zu viele Anfragen und viele irrelevante Treffer. Ersetzt durch den Ablauf Region, dann Orte. |
| Vorschläge für Wanderrouten | Nicht Kern des Produkts. Vorgeschlagen werden nur Regionen und Orte. |
| KI-Vorschläge für Regionen und Orte bei jeder Suche | Laufende Kosten und das Risiko erfundener Orte. Ersetzt durch den geprüften Ortskatalog. |
| Metasuche über mehrere Anbieter im MVP | Zu aufwendig für das MVP (Unterkünfte abgleichen, Verträge). Wird zum späteren Feature. |
| Rein privates Werkzeug | Nur der Ausweg, falls ein marktfähiges Produkt unmöglich ist. |

## 13. Validierung vor Entwicklungsbeginn (K.-o.-Kriterien)

Diese Punkte werden mit einem LiteAPI-Konto geprüft, bevor die eigentliche Entwicklung beginnt. Ist ein K.-o.-Kriterium nicht erfüllt, wird die Datenstrategie neu bewertet.

| Nr. | Prüfung | K.-o., wenn |
|---|---|---|
| V1 | Muss für Live-Buchungen ein Guthaben vorab eingezahlt werden, wenn die Zahlungslösung von LiteAPI genutzt wird? | Ja, der Betreiber müsste Buchungsbeträge vorstrecken. |
| V2 | Abdeckung: Testszenario mit 5 Allgäuer Wanderorten an 4 Wochenenden, verglichen mit der Trefferzahl bei Booking.com. | Weniger als zwei Drittel der Booking-Treffer. |
| V3 | Preisniveau: dieselben Unterkünfte, verglichen mit Booking.com. | Median mehr als 5 % teurer (Vorschlag, zu bestätigen). |
| V4 | Vertragspartner des Gastes und Zuständigkeit für den Kundenservice laut Bedingungen von LiteAPI. | Der Betreiber wäre Vertragspartner der Beherbergung oder allein für den Support zuständig. |
| V5 | Sind Rezensionen und Rezensionsauswertung auch für kleine Unterkünfte (Pensionen, Ferienwohnungen) verfügbar? | Für die Mehrheit der Testtreffer nicht verfügbar. |
| V6 | Such-zu-Buchungs-Verhältnis und KI-Einsatz: LiteAPI berechnet Mehrnutzung oberhalb von 5.000 Suchanfragen je Buchung. Wie teuer ist die Mehrnutzung, ist der KI-Einsatz erlaubt, und wie viele Anfragen verursacht eine Nutzersuche nach Cache tatsächlich (Messung im Testszenario)? | Die erwarteten Mehrkosten pro Buchung übersteigen die Marge, oder der KI-Einsatz ist untersagt. |
| V7 | Kosten der Zusatzfunktionen (Rezensionen, Rezensionsauswertung, Referenzpreis). | Die Kosten pro Nutzersuche wären höher als die erwartete Marge. |

## 14. Risiken

- **Abhängigkeit von einem Anbieter:** Ändert LiteAPI Konditionen oder Abdeckung, ist das Produkt direkt betroffen. Gegenmaßnahme: Die Datenquelle wird austauschbar gebaut, parallel laufen die Partneranfragen.
- **Vertrauen:** Neue Seiten mit eigener Buchung konvertieren schlechter. Gegenmaßnahme: Vertrauensmerkmale nach Abschnitt 7.
- **Preisänderungen:** Zwischen Suche und Buchung kann sich der Preis ändern. Gegenmaßnahme: erneute Prüfung vor der Zahlung (F11) und Zeitstempel an jedem Preis.
- **Qualität des Ortskatalogs:** Die KI könnte beim Aufbau des Katalogs schwache oder falsche Orte vorschlagen. Gegenmaßnahme: deterministischer Abgleich mit der Ortsdatenbank, menschliche Freigabe vor dem Import, und der Nutzer bestätigt die Ortsliste jeder Suche.
- **Rechtliche Pflichten:** Vermittlerrolle, Preisangaben, Informationspflichten, DSGVO für Gastdaten. Gegenmaßnahme: anwaltliche Prüfung vor dem öffentlichen Start.
- **Nachahmung:** Große Portale könnten die Funktion kopieren. Gegenmaßnahme: schnell starten und über die Nische Natur- und Wanderurlaub eine Marke aufbauen.
- **Such-zu-Buchungs-Verhältnis:** Jede Nutzersuche erzeugt bis zu 120 Tarifanfragen, LiteAPI toleriert aber nur 5.000 Anfragen je Buchung kostenlos. Gegenmaßnahme: gemeinsamer Preis-Cache, begrenzter Suchumfang, Bot-Schutz und laufende Überwachung der Quote mit Alarm ab 3.000 : 1.
- **KI-Kennzeichnung und Claims:** Fehlende Kennzeichnung oder überzogene Preisversprechen sind ein rechtliches und ein Vertrauensrisiko. Gegenmaßnahme: Kennzeichnung und Claims-Prüfung als Build-Regel (Abschnitt 7, Punkte 8 und 9).

## 15. Offene Fragen

1. Produktname bzw. Arbeitstitel und der davon abgeleitete technische Kurzname (Slug) für Repository, Domains, Datenbank und Konfiguration. Bis zur Entscheidung gilt der Arbeits-Slug `reiseplaner` (⛔ BEN-GATE BG-01, vor M1).
2. Rechtsform und Gewerbeanmeldung, nötig für Einnahmen und für die Seriosität.
3. Ergebnisse der Validierung V1 bis V7.
4. Höhe der Marge pro Buchung.
5. Gewichte des Qualitätsscores und Schwellenwerte für Schnäppchen, festzulegen anhand von Testdaten.
6. Ist die Fahrzeitgrenze streng (Ausschluss) oder weich (nur Hinweis)? Vorschlag: streng bei KI-Vorschlägen, weich bei eigenen Orten, wie in Abschnitt 9.7 beschrieben.
7. Monatliches Budget für unvermeidbare Grundkosten (Domain, Hosting, KI-Aufrufe).
8. Deckt LiteAPI Ferienwohnungen ausreichend ab?
9. Ist eine Zertifizierung wie Trusted Shops möglich, wenn LiteAPI der Merchant of Record ist?
10. Dürfen kurze Rezensionsauszüge angezeigt werden (Bedingungen von LiteAPI, Urheberrecht)?
11. Anwaltliche Prüfung vor dem Start: AGB, Vermittlerhinweis, Informationspflichten, Datenschutz.
12. Betreiber: Fischermann Intelligence oder Fischermann Media (⛔ BEN-GATE BG-02)?
13. Verifikation der Competitor-Baseline für die Maximum-Messlatte (Abschnitt 5.1, ⛔ BEN-GATE BG-18).
