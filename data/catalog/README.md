# Ortskatalog

Regionen und Orte für die Vorschläge (konzept.md 9.7, architektur.md 5.2 und S3.4/S3.5).

- `themes.yaml`: Themenvokabular.
- `regions/<land>.yaml`: Regionen je Land (`de`, `at`, `ch`, `it-bz`).
- `places/<region-slug>.yaml`: Orte je Region.

**Status: KI-Entwurf.** Alle Einträge sind KI-gestützt erstellt (`ai_assisted: true`) und noch **nicht redaktionell freigegeben** (`verified: false`, ⛔ BG-11). Der Entwurf entstand in der autonomen Bau-Sitzung an Stelle des Batch-Laufs `catalog generate`, der einen Anthropic-Schlüssel braucht.

**Koordinaten stammen nie aus der KI:** Jeder Ort wird mit `npm run cli -- catalog match` deterministisch gegen die Ortsdatenbank (GeoNames) abgeglichen; der Abgleich schreibt die `geonameid`. Der Import übernimmt Koordinaten ausschließlich über diese ID. `match_name` ist ein optionaler Suchname, wenn GeoNames den Ort anders führt (z. B. „Ostseebad Binz“).

Ablauf: `catalog match` → `catalog validate` → redaktionelle Prüfung (`docs/runbooks/katalogpruefung.md`) → `verified: true` setzen → `catalog import`. Lokal importiert `npm run dev` auch Entwürfe, damit die Testseite Vorschläge zeigt; die Oberfläche kennzeichnet sie als „KI-gestützt erstellt, redaktionelle Prüfung ausstehend“.
