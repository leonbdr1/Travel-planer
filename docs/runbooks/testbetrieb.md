# Testbetrieb: das Produkt selbst mit echten Hotels nutzen

Ziel: Reiseplaner lokal auf deinem Rechner wie ein Endkunde nutzen, mit **echten Unterkünften, Preisen und Rezensionen** (LiteAPI), echten Fahrzeiten (openrouteservice) und der echten KI-Prüfung der Rezensionen (Anthropic). Für echte Kunden nötige Dinge bleiben bewusst außen vor: E-Mails sind simuliert, **Buchen ist ausgeschaltet** (die Detailseite verlinkt die Unterkunft auf Google Maps, dort buchst du direkt), Rechtstexte bleiben Platzhalter.

Stand: Die Anbindungen an LiteAPI und openrouteservice sind nach der Architektur gebaut, aber noch **nie gegen die echten Dienste gelaufen** (aus der Bau-Sitzung nicht erreichbar). Deshalb kommt vor der Nutzung ein Prüf- und Reparaturschritt (Schritt 3).

## To-do-Liste

| # | Was | Wer | Dauer |
|---|---|---|---|
| 1 | Drei Konten anlegen und Schlüssel holen | du | ca. 20 min |
| 2 | Schlüssel und Netzfreigabe in der Cloud-Umgebung eintragen, neue Claude-Sitzung starten | du | ca. 5 min |
| 3 | Anbindungen gegen die echten Dienste prüfen und reparieren, Walkthrough mit echten Hotels | Claude | eine Sitzung |
| 4 | Lokal installieren und starten | du | ca. 15 min |
| 5 | Urlaub suchen und Rückmeldung geben | du | – |

### 1. Konten und Schlüssel

- **LiteAPI** (Unterkünfte, Preise, Rezensionen; Pflicht): auf liteapi.travel ein kostenloses Konto anlegen. Im Dashboard unter den API-Schlüsseln liegt ein **Sandbox-Schlüssel** (beginnt mit `sand_`). Ob die Sandbox echte Preise liefert, zeigt Schritt 3; sonst nehmen wir den Produktionsschlüssel aus demselben Dashboard. Es wird nichts gebucht.
- **openrouteservice** (Fahrzeiten; optional): auf openrouteservice.org kostenlos registrieren (Standard-Plan), im Dashboard einen Schlüssel („Token“) erzeugen. Ohne Schlüssel rechnet das System mit einer Luftlinien-Schätzung und kennzeichnet sie.
- **Anthropic** (KI-Prüfung der Rezensionen und Übersetzung von Freitextwünschen; optional): auf console.anthropic.com einen API-Schlüssel erzeugen und etwas Guthaben aufladen (5–10 $ reichen lange). Ein Tagesdeckel von 5 $ ist im Produkt eingebaut; zusätzlich kannst du in der Console ein Ausgabenlimit setzen. Eine Suche kostet wenige Cent. Ein Claude-Pro-Abo gilt dafür nicht (die API wird getrennt abgerechnet). Die KI bleibt im Testbetrieb aus, bis du sie auf der Entwicklerseite einschaltest.

Schlüssel nie in den Chat kopieren.

### 2. Cloud-Umgebung für die Prüfung (damit Claude Schritt 3 machen kann)

Im Menü der Cloud-Umgebung in der Titelleiste der Sitzung auf „Edit“:

- **Network access:** diese Domains erlauben: `api.liteapi.travel`, `book.liteapi.travel`, `docs.liteapi.travel`, `api.heigit.org`, `api.openrouteservice.org`, `overpass-api.de` (OpenStreetMap), `api.anthropic.com`.
- **Umgebungsvariablen** (oder „API credentials“, falls angeboten): `REISEPLANER_LITEAPI_API_KEY`, `REISEPLANER_ORS_API_KEY`, `REISEPLANER_ANTHROPIC_API_KEY`. Das Präfix verhindert Überschneidungen mit dem Zugang der Sitzung selbst.

Danach eine **neue Sitzung** starten (Änderungen gelten erst dort) und schreiben: „Testbetrieb prüfen und reparieren“.

### 3. Prüfen und reparieren (Claude)

In der neuen Sitzung: `npm run cli -- testbetrieb einrichten --from-env`, `npm run cli -- testbetrieb pruefen --aufzeichnen`, Abweichungen der echten Antworten in Schemas und Zuordnungen beheben (Tarife, Hoteldetails, Bilder, Rezensionen, Ausstattung), Fixtures aus den Aufnahmen ableiten, Walkthrough mit echten Hotels lesen, alles pushen.

### 4. Lokal installieren und starten

Voraussetzungen: **Node.js 22** (nodejs.org, LTS 22) und **Git**. Auf Windows die Befehle einzeln in PowerShell ausführen.

```bash
git clone https://github.com/leonbdr1/Travel-planer.git
cd Travel-planer
git checkout claude/software-entwicklung-konzept-gv58jh     # bis der Code in main ist
npm ci --ignore-scripts
node scripts/supply-chain-check.mjs --rebuild
npm run cli -- testbetrieb einrichten     # fragt die drei Schlüssel ab (unsichtbare Eingabe, Einfügen geht)
npm run cli -- testbetrieb pruefen        # je ein echter Aufruf pro Anbieter; alles ✓?
npm run dev                               # dann http://localhost:5173 öffnen
```

Oben auf jeder Seite zeigt ein gelber Balken, was echt und was simuliert ist. Später aktualisieren: `git pull`, `npm ci --ignore-scripts`, `node scripts/supply-chain-check.mjs --rebuild`, `npm run dev`.

### 5. Nutzen

Suche wie ein Kunde: Startort, Fahrzeit, Zeitfenster, Nächte, Anreisetage, Wünsche und mit einem Tipp dein Ziel („Günstig und sauber“, „Preis-Leistung“ oder „Komfort“). Ergebnis: oben „Deine Auswahl“ als Preisleiter mit höchstens fünf Unterkünften, die günstigste zuerst, bei den anderen der Aufpreis und kurze Badges (grün: hat es zusätzlich, z. B. „Sauna“ oder „Lift 3 min“; durchgestrichen: fehlt), darüber aufklappbar, was aussortiert wurde und warum. Das Ziel lässt sich oben ohne neue Suche umschalten. Darunter „Alle Angebote“ mit Preis-Matrix, Liste, Lob-Labels wie „Besonders sauber“ und „Weitere Filter“ (Sterne, Mindestbewertung); Detailseite mit allen Terminen, Qualitätswert, Rezensionscheck und „Was Gäste loben“. Zum Buchen „auf Google Maps ansehen“ und direkt bei der Unterkunft buchen.

Die Schwellen der Vorauswahl hast du am 28.09.2026 festgelegt (Mindestnote 7,0 / 7,5 / 8,3 mit Ausnahme ab 6,5 bei mindestens 25 % günstiger, Preisfenster +35 % / +75 %, Schimmel ab 2 Gästen, Schmutz ab 3, höchstens 5 Finalisten). Wenn dir mit echten Hotels etwas falsch aussortiert oder durchgelassen vorkommt: Suche und Beobachtung notieren, dann justieren wir.

**KI-Kosten im Griff:** Der gelbe Balken führt zur **Entwicklerseite** (`/entwickler`). Dort schaltest du die KI-Prüfung der Rezensionen an oder aus. Mit echtem Anthropic-Schlüssel ist sie **standardmäßig aus**: Rezensionen werden dann nur per Stichwort geprüft, Warnhinweise stehen als „ungeprüft“ da, es entstehen keine KI-Kosten. Eingeschaltet kostet eine Suche wenige Cent; die Seite zeigt den heutigen Verbrauch. Der Schalter gilt ab der nächsten Suche. Ist die KI aus, ist in der Suche das Freitextfeld für Wünsche ausgegraut; du wählst die Wünsche dann über die Chips. Im lokalen Test gelten außerdem höhere Suchgrenzen (60 pro Stunde, 200 pro Tag).

**Gehminuten** (Bushaltestelle, Bahnhof, Lift, Supermarkt, Restaurants in der Nähe) kommen aus OpenStreetMap, ohne Konto und ohne Schlüssel. `testbetrieb pruefen` fragt die Punkte rund um Füssen einmal ab („Lage (OpenStreetMap)“).

## Grenzen im Testbetrieb

- Ortsdaten (Startort, eigene Orte) decken **Deutschland, Österreich, Schweiz und Südtirol** ab, Fahrzeit höchstens 6 Stunden. Andere Ziele (z. B. Gardasee, Elsass, Holland) lassen sich ergänzen: Claude Bescheid geben.
- Regionsvorschläge kommen aus dem KI-Entwurf des Katalogs (49 Regionen, 307 Orte, noch nicht redaktionell geprüft). Eigene Orte kannst du immer hinzufügen.
- Der Vergleichspreis („Vergleichspreis anzeigen“) ist ohne geprüfte Schnittstelle aus.
- Im Testbetrieb läuft alles auf deinem Rechner; nichts ist online erreichbar.

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm run cli -- testbetrieb einrichten` | Schlüssel abfragen und in `packages/worker/.dev.vars` speichern (nur dort, gitignored) |
| `npm run cli -- testbetrieb einrichten --from-env` | dasselbe aus den `REISEPLANER_*`-Umgebungsvariablen |
| `npm run cli -- testbetrieb pruefen [--aufzeichnen]` | je ein echter Aufruf pro Anbieter mit verständlichem Ergebnis; die Ausgabe enthält keine Schlüssel und darf weitergegeben werden. `--aufzeichnen` speichert die Rohantworten unter `.data/testbetrieb-aufnahmen/` |
| `npm run cli -- testbetrieb aus` | zurück zur vollständigen Simulation, Schlüssel werden entfernt |
| `REISEPLANER_FAKE_LATENCY_MS=4000 npm run dev` | nur Simulation: die simulierten Anbieter antworten so langsam wie die echte LiteAPI (zum Ausprobieren ohne Schlüssel) |

Nach `einrichten` oder `aus` einen laufenden `npm run dev` neu starten.

## Wenn etwas hakt

- `testbetrieb pruefen` meldet ✗: die Zeile in den Chat kopieren (enthält keine Schlüssel).
- „LiteAPI Texte (language=de)“ meldet ✗: LiteAPI liefert Beschreibung und Hinweise nicht auf Deutsch; die Detailseite kennzeichnet sie dann als englisch. Bescheid geben (Übersetzung per KI wäre möglich, kostet aber).
- Im Terminal erscheint `CONNECT_TIMEOUT …hyperdrive.local`: seit dem 29.09.2026 behoben (die lokale Datenbank blockierte, während eine Suche auf LiteAPI wartete). Tritt es nach `git pull` noch auf, die Zeilen in den Chat kopieren.
- `HTTP 401`/`403` bei LiteAPI: Schlüssel falsch kopiert oder nicht freigeschaltet; `testbetrieb einrichten` erneut ausführen.
- Die Seite zeigt „keine Daten“ in der Matrix: meist Zeitüberschreitung oder Tageskontingent; nach einer Minute erneut suchen.
- Port 5173 belegt: den anderen Dienst beenden oder `PORT=5174 npm run dev`.
- Alles zurücksetzen: `npm run dev` stoppen, Ordner `.data` löschen, neu starten.
