# Personenzahl und Zimmerlogik (Aufgabe 5, Entwurf und Umsetzung)

Stand 29.09.2026. Ergänzt `architektur.md` 6.5 (Angebote) und 6.15 (Vorauswahl); Übernommen in `architektur.md` 6.16 (Freigabe 30.09.2026).

## Grundprinzip

Der Nutzer gibt Personen und Zimmer an. Jedes Zimmer bzw. jede Wohnung eines Angebots wird zuerst auf diese Personenzahl abgebildet: **passt** es, oder ist es **deutlich größer als nötig**?

## Größe eines Zimmers

1. Die Belegung des Anbieters (`maxOccupancy` bei LiteAPI), falls vorhanden.
2. Sonst aus dem Namen: „für 6 Personen“, „bis zu 6 Personen“, „6 Pers.“, „6-Bett“, „Einzelzimmer“ (1), „Doppelzimmer“/„Zweibettzimmer“ (2), „Dreibettzimmer“ (3), „Vierbettzimmer“/„Familienzimmer“ (4).
3. Sonst unbekannt – dann gilt das Zimmer als passend (wir wissen es nicht besser und schließen nichts aus).

## Passt oder größer als nötig

Personen pro Zimmer = die größte Gruppe in einem der angefragten Zimmer (Erwachsene und Kinder).

- **Passt:** Größe ≤ Personen + `ROOM_OVERSIZE_EXTRA` (2). Beispiel 2 Personen: Doppelzimmer, Familienzimmer für 4 und die übliche Ferienwohnung für 4 passen.
- **Größer als nötig:** Größe > Personen + 2. Beispiel 2 Personen: die Ferienwohnung für 5 oder 6.
- Zu klein kommt nicht vor: Der Anbieter liefert nur Zimmer, in die die Gruppe passt.

## Was in die Preisbildung einfließt

- Je Haus und Termin speichern wir wie bisher das günstigste Angebot und das günstigste kostenlos stornierbare – **ausgewählt nur unter den passenden Zimmern**. Gibt es mehrere passende Zimmer (z. B. Doppelzimmer Standard und Doppelzimmer mit Balkon), sind sie alle Kandidaten; das günstigste gewinnt.
- Zusätzlich halten wir je Haus und Termin die Liste aller angebotenen Zimmer (je Zimmer das günstigste Angebot, mit Größe und Einordnung) fest. Diese Liste zeigt die Detailansicht und nutzt später „Komfort“.
- **Größer als nötig:** Hat ein Haus an einem Termin nur Zimmer, die größer als nötig sind, wird das günstigste davon gespeichert, aber **nicht in die Preisbildung** genommen: nicht in Liste, Preis-Matrix, Schnäppchen, Vorauswahl, Finale und „Unsere Wahl“. Solche Häuser stehen **darunter** in einem eigenen Abschnitt „Größer als nötig“, damit man sie trotzdem sehen und buchen kann. In der Detailansicht sind größere Zimmer grau mit Hinweis.

## Je Ziel

- **Günstig und sauber (fertig):** Es zählt nur das **günstigste passende** Zimmer je Haus. Die anderen passenden Zimmer sind für dieses Ziel egal.
- **Komfort (nur vorbereitet, Ziel ist laut Aufgabe 0 unfertig):** Die anderen passenden Zimmer sollen mehr Gewicht bekommen, weil man bei „Komfort“ eher nicht das einfachste Zimmer nimmt. Vorbereitet ist `comfortRoomPrice` in `packages/domain/src/rooms.ts`: Vergleichspreis = `COMFORT_CHEAPEST_WEIGHT` (0,5) × günstigstes passendes Zimmer + (1 − 0,5) × Median aller passenden Zimmer. Noch **nicht verdrahtet**; Ben entscheidet beim Überarbeiten von „Komfort“.
- **Preis-Leistung:** wie bisher (günstigstes passendes Zimmer), ebenfalls unfertig.
