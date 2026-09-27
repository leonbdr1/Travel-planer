# S8.4 Buchungsablauf in der Oberfläche

Befehl: `npm run dogfood -- --mode P --flow buchung` (echter lokaler Stack; LiteAPI, Resend und die Zahlung simuliert).
Lauf `2026-09-27T21-18-14-P-buchung`: 36/36 Prüfungen bestanden, keine Konsolenfehler, keine fehlgeschlagenen Anfragen.

| Datei | Inhalt |
|---|---|
| `report.md` | Walkthrough-Bericht mit sichtbarem Text je Schritt |
| `02-buchungsformular-mit-angebot-pflicht-bes.png` | Formular: Angebot mit Gesamtpreis, Stornobedingung und Hinweis zu Beträgen vor Ort; Gast je Zimmer; Pflicht-Bestätigungen (AGB und Vermittlerrolle, kein Widerrufsrecht) |
| `03-angebot-reserviert-zahlungsseite-simulie.png` | Zahlungsseite nach Prebook; in diesem Lauf hatte sich der Preis geändert und wurde im Dialog bestätigt |
| `04-besta-tigung-mit-buchungsnummer-und-hote.png` | **Bestätigung mit Buchungsnummer und Hotel-Bestätigungsnummer** (Akzeptanzbeispiel 5) |
| `05-stornierung-kostenvorschau.png` | Buchungsansicht mit Kostenvorschau vor der Stornierung (Ausschnitt) |
| `06-buchung-storniert.png` | stornierte Buchung mit Gebühr und Erstattung (Ausschnitt) |
| `07-meine-buchung-zugangslink-anfordern.png` | „Meine Buchung“: Zugangslink per E-Mail, Antwort unabhängig davon, ob die Buchung existiert |

⟂ drift (2026-09-27): Im Fake-Modus ersetzt eine simulierte Zahlungsseite das Zahlungs-SDK von LiteAPI. Die
Einbindung des echten SDK und seine CSP-Domains lassen sich erst mit Sandbox-Zugang prüfen (Doku gesperrt, BG-05);
bis dahin zeigt die Zahlungsseite in `sandbox`/`live` einen Hinweis statt des Formulars.
