# S11.5 Lage-Fakten aus OpenStreetMap – Belege

Stand: 28.09.2026, lokaler Stack, Overpass simuliert (BG-20 von Ben freigegeben).

- `demo-output.txt`: `npm run demo -- s11.5` – Suche Oberstdorf und Füssen: Gehminuten zu Bushaltestelle, Bahnhof, Lift und Supermarkt sowie „Restaurants in der Nähe“ bei den Finalisten aller Ziele; ein Overpass-Aufruf je Suche, dieselbe Suche erneut ohne weiteren Aufruf (Zwischenspeicher je Unterkunft).
- Darstellung in der Preisleiter: `docs/demos/S11.7/`.
- Echte Abfrage: `npm run cli -- testbetrieb pruefen` (Zeile „Lage (OpenStreetMap)“), braucht in der Cloud-Umgebung den Host `overpass-api.de`.
