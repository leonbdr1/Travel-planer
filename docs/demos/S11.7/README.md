# S11.7 Finale als Preisleiter – Belege

Stand: 28.09.2026, lokaler Stack, alle Anbieter simuliert. Umsetzung von Bens Entwurf A aus dem Chat.

- `walkthrough-P/report.md`: alle Pfad-Abläufe (`npm run dogfood -- --mode P`), 191/191 Prüfungen, keine Konsolenfehler, keine fehlgeschlagenen Anfragen; darin der Ablauf `finale` mit den Schritten „Preisleiter“ und „Preisleiter auf dem Handy (390 px)“ und der Ablauf `entwickler`.
- `walkthrough-R-report.md`: Lese-Abläufe (`--mode R`), 30/30.

Gelesen (Screen-Read) und behalten, zugeschnitten:

| Screenshot | Was er zeigt |
|---|---|
| `walkthrough-P/26-preisleiter-komfort.png` | „Komfort“: fünf Zeilen, Preis und Aufpreis links, Badges grün (zusätzlich), durchgestrichen (fehlt), neutral (gleich), Lob-Labels gelb, „+N“ zum Aufklappen, Gründe ohne Preiszusatz bei Komfort |
| `walkthrough-P/25-preisleiter-handy.png` | 390 px: Leiter ohne Querscrollen, Legende und Quellenangabe OpenStreetMap |

Beim Lesen behoben: Zu viele grüne Badges verdrängten, was fehlt (jetzt höchstens 6, davon bis zu 2 Fehlende immer sichtbar); „nicht deutlich günstiger“ stand auch bei „Komfort“, wo es keine Preisausnahme gibt; die Kopfzeile war auf dem Handy 42 px zu breit; der Zielschalter brach auf dem Handy um.
