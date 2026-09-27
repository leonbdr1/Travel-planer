# Runbook: Walkthrough (Dogfood)

Ein Walkthrough ist **kein** e2e-Test: Er fährt den echt laufenden Stack im Browser ab, liest das gerenderte DOM und schreibt einen Bericht mit Screenshots, den ein Mensch liest. Erst nach dem gelesenen Bericht gilt eine Nutzerfläche als `live-verified`.

```bash
npm run dogfood -- --mode R                 # Rundgang: erster Besuch, nur Navigation
npm run dogfood -- --mode P --flow <name>   # Pfad: Nutzerablauf mit Eingaben
npm run dogfood -- --mode R --save docs/demos/S1.4   # Beleg ins Repo kopieren
npm run dogfood -- --mode R --base-url http://localhost:5173   # gegen laufenden Dev-Server
```

- Ohne `--base-url` startet der Harness `scripts/dev.ts` auf freien Ports mit einem Wegwerf-Datenverzeichnis, ohne Test-Overrides.
- Ergebnis: `dogfood-results/<run>/report.md` (gitignored) mit Screenshot je Schritt, Prüfungen, Überschriften, KI-Kennzeichnungen, Konsolenfehlern und fehlgeschlagenen Anfragen.
- **Pflicht:** Report und Screenshots lesen, Befunde im Commit nennen, Beleg nach `docs/demos/<slice-id>/` kopieren.
- Flows liegen in `e2e/dogfood/flows/`.
