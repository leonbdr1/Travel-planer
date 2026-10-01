# Analyse Such- und Buchungssystem (30.09.2026, nach F19)

Durchgang über Suche (Rahmen, Regionen, Orte), Ergebnisse und Buchung. Es wurde gelesen und mit dem laufenden Stack ausprobiert (`npm run demo -- f19`, Walkthrough `flugzeug`); nur die Punkte unter „Behoben“ sind geändert. Die übrigen sind Vorschläge zur Entscheidung.

## Behoben in F19

1. **Die Vorschläge waren entfernungsblind.** Region-Rang war die Summe der Themenstärken über alle passenden Orte; große Regionen mit vielen kleinen Orten gewannen. Jetzt Qualitätsstufen nach Entfernung (`docs/logik/ziel-qualitaet.md`).
2. **Formulierung „erreichbar in deiner maximalen Fahrzeit“ stimmte nicht mehr**, sobald weit entfernte Ziele gefiltert werden. Jetzt erklärt ein Hinweis unter der Überschrift, warum ferne Ziele nur bekannte Orte sind.
3. **Zu viele oder zu wenige Vorschläge:** Nah dran bis 8 Regionen, mit Filter höchstens 6 (vorher immer 5).
4. Beim Flug gab es keinen Weg außer „Auto über 30 h + Hinweis“. Jetzt eigener Modus.
5. Das Wort „Fahrzeit“ im Kopftext der Suche galt nur fürs Auto; jetzt „Fahrzeit (oder Flugzeit)“.

## Lücken (mit Empfehlung)

| # | Befund | Wirkung | Empfehlung |
|---|---|---|---|
| L1 | **Kein Katalog außerhalb Europas.** Kontinent-Häkchen für Afrika, Asien usw. führen zu einer leeren Liste. | Der Schalter verspricht mehr, als geliefert wird. | Erst Ziele-Liste mit Ben festlegen (z. B. Marokko, Ägypten, Türkei, Kap Verde, Thailand, USA-Ostküste), dann Länder/Migration/Ortsdaten (BEN-GATE). Bis dahin die Kontinente ausgrauen? (Entscheidung Ben) |
| L2 | **Keine Jahreszeit.** Strand im Januar an der Ostsee oder Wintersport im Juli werden gleich vorgeschlagen; die Termine des Suchfensters fließen in die Vorschläge nicht ein. | Unpassende Vorschläge, verschwendete Preisabfragen. | Pro Region/Ort eine Saison (Monate) im Katalog; Vorschlag nach Monat des Suchfensters filtern oder markieren. Braucht Katalog-Schema (Migration, BEN-GATE). |
| L3 | **Flugkosten fehlen im Preisvergleich.** Ergebnis-Rangliste und Schnäppchen vergleichen nur Unterkunftspreise; Barcelona und Kreta erscheinen so gleich gut, obwohl Anreisekosten sehr verschieden sind. | Irreführend bei Flugzielen. | Auf der Ergebnisseite bei Flugzielen einen Hinweis „ohne Anreise“ zeigen; später ein grober Flugpreis-Richtwert je Zielgebiet (Datengrundlage nötig, keine Ersparnis-Behauptungen). |
| L4 | **Fähren und Inseln beim Auto.** Sizilien erscheint mit „über 10 h Fahrt“; Mallorca, Kreta und Sardinien wären mit Autobahn-Schätzung genauso „fahrbar“. | Auto-Vorschläge zu Inseln ohne Fähre. | Katalogfeld `island` je Region: im Automodus mit Hinweis „Fähre“ oder ausblenden; Flug wäre die Empfehlung. |
| L5 | **Eigene Orte im Flugmodus zeigen weiter Autozeit.** Vorgeschlagene Orte zeigen Flugzeit, selbst gewählte („Orte selbst wählen“) zeigen Fahrzeit mit Flugzeug-Hinweis ab 30 h. | Zwei Anzeigen in einer Liste. | Im Flugmodus auch für eigene Orte die Flugzeit zeigen (Server: `place`-Antwort um Flugzeit ergänzen). |
| L6 | **Autozeit ab 30 h ist ein Hinweis, der Flugmodus ein Schalter**: zwei Wege zum selben Ziel. | Nutzer sieht „Flug empfohlen“, kann aber nicht mit einem Klick in den Flugmodus wechseln. | Beim Hinweis „Flug empfohlen“ einen Link „Als Flugreise ansehen“. |
| L7 | **Flugzeit ist Luftlinie**, kein Flughafen, keine Umstiege. | Kanaren und Skandinavien wirken genauer, als sie sind. | Anzeige bleibt „ca.“; bei Bedarf Tabelle der Hauptflughäfen je Startregion. |
| L8 | **Themen ohne Wichtung untereinander.** Wer „Strand und Wandern“ wählt, bekommt Orte, die eines der Themen erfüllen; die wählerischere Regel gilt nur, wenn alle passenden Themen wählerisch sind. | Ein Ort mit Wandern 2 und Strand 3 wird wie ein Wanderziel behandelt. | Akzeptabel; falls Ben „beides“ meint, braucht es die Und-Verknüpfung als Schalter. |
| L9 | **Themen sind Katalog-Handarbeit (KI-Entwurf, `verified: false`).** Die Qualitätsstufen hängen an Bekanntheit/Attraktionen, die von Hand geschätzt sind. | Fehlgriffe wandern in die Rangfolge (z. B. Ostseeküste MV auf Platz 6 beim Strand ab München). | Redaktionelle Prüfung BG-11 vor Testbetrieb mit Kunden; Schwellen (4/6/8, Faktor 2, Spielraum 1,5) mit echten Nutzungsdaten kalibrieren. |
| L10 | **Regionsname nach einzigem Highlight** kollidiert mit der Qualitätslogik: Weil in fernen Suchen nur noch wenige Orte durchkommen, heißen jetzt fast alle Karten nach dem Ort („Barcelona“, „Lagos“). | Region wirkt verkürzt. | Steht schon als Rückfrage an Ben (Ausnahmen für Inseln/bekannte Regionen). |

## Dopplungen und Drift-Risiken

- **Länderlisten an vier Stellen** (Domain, Konfigurationsschema, CLI-Schema, SQL-Migrationen). Alle mit Drift-Tests abgesichert, aber jede neue Region/jedes neue Land braucht vier Änderungen. Empfehlung: Konfigurationsschema und CLI-Schema aus der Domain-Liste ableiten.
- **Konstanten in Contracts und Domain** (`MAX_DRIVE_MINUTES`, `CONTINENT_CODES`): bewusst getrennt (Contracts dürfen die Domain nicht importieren), Drift-Test in `packages/web`. Beim Hinzufügen eines Kontinents beide Listen ändern.
- **`formatMinutes` (Web) ist ein Ein-Zeilen-Wrapper um `formatDrive`**, `formatDuration` gibt es zusätzlich für Flugzeiten. Unkritisch, könnte bereinigt werden.
- **Zwei Wege zu Orten** („Orte vorschlagen lassen“ und „Orte selbst wählen“) teilen Startort/Fahrzeit-Felder, aber nur der erste kennt Auto/Flug.

## Widersprüche

- Die Regionsüberschrift „Passende Regionen … erreichbar in deiner maximalen Fahrzeit“ und die neue Qualitätsregel widersprachen sich (behoben durch Hinweis, siehe oben).
- Der Katalog hat für „Preis-Leistung“/„Komfort“ noch offene Ziele-Logik; die Vorschlagslogik hängt davon nicht ab (unverändert).
- Die Kontingent-Zähler `lookups_per_hour` (120) gelten auch für jeden Wechsel Auto/Flug oder Themenklick; wer viel probiert, läuft in 429. Empfehlung: Region-Vorschläge kurz zwischenspeichern (nach Eingaben), Limit erst nach Kalibrierung erhöhen.

## Buchung

Der Buchungsablauf (Zustandsautomat, Tokens, Fake-Zahlung, Stornierung) wurde in dieser Sitzung **nicht neu durchgelesen**, nur auf Berührungspunkte mit F19 geprüft: Er kennt weder Fahr- noch Flugmodus und ist von der Änderung nicht betroffen. Eine echte Buchungsprüfung steht aus. Offen bleibt L3 (Anreisekosten fehlen im Vergleich) und der ungeklärte Punkt aus früheren Sitzungen (Sandbox-Contract S2.2 mit echten Antworten, wartet auf Schlüssel).
