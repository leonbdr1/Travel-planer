# Support: Buchungen nachsehen

Ein Gast schreibt „Buchung K7M2Q9XZ …“. Nur lesend, E-Mail-Adressen maskiert, keine Tokens:

```bash
npm run cli -- buchungen                       # die letzten 20 Buchungen
npm run cli -- buchungen --status failed       # nur fehlgeschlagene (draft, prebooked, booking, confirmed, failed, cancelled)
npm run cli -- buchungen K7M2Q9XZ              # eine Buchung mit Status, Zeiten, letztem Fehler und E-Mail-Versand
```

- Datenbank: `DATABASE_URL`, sonst die lokale Datenbank (`DB_PORT`, Standard 54329), sonst `.data/pglite`.
- Vertippte Nummer: der Befehl nennt Buchungen mit denselben ersten vier Zeichen.
- „LiteAPI-Buchung“ ist die Kennung für Rückfragen beim LiteAPI-Support (Fälle, die Hotel oder Buchung selbst betreffen, konzept.md 7.7).
- Link zur Buchung schickt sich der Gast selbst unter „Meine Buchung“ (mit oder ohne Buchungsnummer).
