# Runbook: Katalogprüfung und -freigabe (⛔ BG-11)

Der Ortskatalog (`data/catalog/`) ist KI-gestützt erstellt. Vor dem Produktivimport prüft ein Mensch jede Region stichprobenartig und gibt sie frei.

## Ablauf

1. **Abgleich:** `npm run cli -- catalog match` – ordnet jeden Ort deterministisch der Ortsdatenbank zu (exakter Name, deutscher Alternativname oder `match_name`, sonst Trigramm-Treffer). Unscharfe Treffer werden gemeldet und müssen geprüft werden; nicht zugeordnete Orte kann der Import nicht übernehmen.
2. **Validierung:** `npm run cli -- catalog validate` – Themen im Vokabular, Beschreibungen höchstens 160 Zeichen, deutsche Typografie, keine verbotenen Aussagen, Koordinaten im Landesgebiet, keine Dubletten. Ziel: 0 Fehler. Hinweise auf nahe beieinander liegende Orte bewusst entscheiden.
3. **Redaktionelle Prüfung je Region** (Stichprobe, mindestens drei Orte je Region):
   - Existiert der Ort und eignet er sich als Unterkunftsbasis?
   - Stimmt die GeoNames-Zuordnung (Name, Bundesland/Kanton; `geonameid` auf geonames.org nachschlagen)?
   - Sind die Themenstärken plausibel (3 = prägend, 2 = gut geeignet, 1 = möglich)?
   - Ist die Beschreibung sachlich richtig, ohne Superlative und Werbeversprechen?
4. **Freigabe:** In der Ortsdatei `verified: true` setzen (je Ort), Region gilt als freigegeben, sobald sie freigegebene Orte hat. Commit mit Hinweis „BG-11: Region … geprüft durch …“.
5. **Import:** `npm run cli -- catalog import` (nur `verified: true`, idempotent über den Slug). Zweiter Lauf muss dieselben Zahlen liefern.

## Lokale Entwicklung

`npm run dev` importiert auch Entwürfe (`--include-drafts`), damit die Testseite Vorschläge zeigt. Die Oberfläche kennzeichnet Entwurfsbeschreibungen als „KI-gestützt erstellt, redaktionelle Prüfung ausstehend“. Gegen entfernte Datenbanken (`DATABASE_URL`) verweigert die CLI den Entwurfsimport.
