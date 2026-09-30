# Prüfliste Ortskatalog (BG-11)

Erzeugt mit `npm run cli -- catalog review-sheet`. Nichts hiervon ist geprüft, solange die Kästchen leer sind. Die Datei enthält nur, was ein Mensch entscheiden muss.

## So gehst du vor

1. **Auffälligkeiten** (Abschnitt A): für jede Zeile entscheiden, ob der Wert stimmt oder in `data/catalog/attraktivitaet.yaml` bzw. der Ortsdatei geändert werden muss. Sag mir einfach „Ort X: Bekanntheit 2“, ich trage es ein.
2. **Stichprobe** (Abschnitt B): pro Region drei Orte, darunter der beste. Frage: Gibt es den Ort, taugt er als Unterkunftsbasis, passen Themen und Bekanntheit ungefähr?
3. Wenn eine Region durch ist: Sag „Region X geprüft“, ich setze `verified: true` (Runbook `docs/runbooks/katalogpruefung.md`).

Stand: 520 Orte in 109 Regionen; 1 Orte und 17 Regionen mit Auffälligkeit.

## A. Auffälligkeiten

### Regionen

| ☐ | Region | Auffälligkeit |
|---|---|---|
| ☐ | Athen und Peloponnes | nur 2 Ort(e) |
| ☐ | Berlin und Potsdam | nur 2 Ort(e) |
| ☐ | Budapest | nur 2 Ort(e) |
| ☐ | Hamburg und Lübeck | nur 2 Ort(e) |
| ☐ | Kopenhagen | nur 2 Ort(e) |
| ☐ | Korfu | nur 1 Ort(e) |
| ☐ | Krakau und Tatra | nur 2 Ort(e) |
| ☐ | London | nur 2 Ort(e) |
| ☐ | Madeira | nur 2 Ort(e) |
| ☐ | Mailand und Bergamo | nur 2 Ort(e) |
| ☐ | München | nur 2 Ort(e) |
| ☐ | Paris und Versailles | nur 2 Ort(e) |
| ☐ | Porto und Douro | nur 2 Ort(e) |
| ☐ | Prag | nur 2 Ort(e) |
| ☐ | Stockholm | nur 2 Ort(e) |
| ☐ | Stuttgart | nur 2 Ort(e) |
| ☐ | Vinschgau | kein Ort mit 6 Punkten oder mehr: die Region erscheint bei weiter Entfernung nie |

### Orte

| ☐ | Region | Ort | Auffälligkeit | Bekanntheit / Attraktionen | Punkte |
|---|---|---|---|---|---|
| ☐ | Stockholm | Uppsala | Bekanntheit 1 bei 149245 Einwohnern | 1 / 1 | 4.9 |

## B. Stichprobe je Region

Sortiert nach dem besten Ort der Region. Die ersten 84 Regionen (bester Ort ab 8 Punkten) erscheinen bei weiter Entfernung und im Flugmodus: **hier zuerst prüfen**, die übrigen können warten.

### Allgäu

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Füssen | 13893 | 3 / 3 | 10 | top | staedte_kultur 3, seen 3, wandern 2, bergpanorama 2, radfahren 2 |
| ☐ | Nesselwang | 3498 | 2 / 2 | 6.7 | beliebt | familie 3, wandern 2, wintersport 2 |
| ☐ | Sonthofen | 21285 | 2 / 1 | 6.2 | beliebt | wandern 2, radfahren 2, familie 2 |

### Berchtesgadener Land

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Berchtesgaden | 7655 | 3 / 3 | 10 | top | wandern 3, bergpanorama 3, staedte_kultur 2, seen 2 |
| ☐ | Bischofswiesen | 7535 | 1 / 1 | 4.9 | ruhig | natur_ruhe 2, wandern 2, familie 2 |
| ☐ | Marktschellenberg | 1855 | 1 / 1 | 4.9 | ruhig | natur_ruhe 2, wandern 2 |

### Bregenzerwald und Montafon

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | St. Anton am Arlberg | 1763 | 3 / 3 | 10 | top | wintersport 3, wandern 3, bergpanorama 3, wellness 2 |
| ☐ | Lech | 1568 | 3 / 3 | 8.9 | top | wintersport 3, wandern 2, wellness 2 |
| ☐ | Egg | 2422 | 1 / 1 | 3.6 | wenig | natur_ruhe 2, wein_kulinarik 2 |

### Gröden und Seiser Alm

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | St. Ulrich in Gröden | 4306 | 3 / 3 | 10 | top | wandern 3, bergpanorama 3, wintersport 3, staedte_kultur 2 |
| ☐ | Wolkenstein in Gröden | 1601 | 3 / 3 | 9.6 | top | wintersport 3, wandern 3, bergpanorama 3 |
| ☐ | Kastelruth | 1545 | 2 / 2 | 6.7 | beliebt | wandern 2, familie 2, natur_ruhe 2 |

### Innsbruck und Seefelder Plateau

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Innsbruck | 132493 | 3 / 3 | 10 | top | staedte_kultur 3, wandern 2, wintersport 2, shopping 2 |
| ☐ | Seefeld in Tirol | 3440 | 3 / 2 | 8 | top | wintersport 3, wandern 2, wellness 2 |
| ☐ | Hall in Tirol | 13334 | 2 / 1 | 6.4 | beliebt | staedte_kultur 3 |

### Zillertal

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Mayrhofen | 3720 | 3 / 3 | 10 | top | wandern 3, wintersport 3, bergpanorama 2, familie 2 |
| ☐ | Tux | 1941 | 2 / 3 | 7.6 | beliebt | wintersport 3, bergpanorama 3, wandern 2 |
| ☐ | Fügen | 2617 | 2 / 2 | 5.3 | ruhig | familie 3, wellness 2, wintersport 2 |

### Alta Badia

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Corvara | 756 | 3 / 3 | 9.6 | top | wintersport 3, wandern 3, bergpanorama 3 |
| ☐ | Abtei | 893 | 2 / 2 | 6.2 | beliebt | wandern 2, wein_kulinarik 2 |
| ☐ | Wengen | 1232 | 1 / 1 | 4.4 | ruhig | natur_ruhe 3, wandern 2 |

### Amsterdam und Nordholland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Amsterdam | 741636 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, radfahren 2 |
| ☐ | Haarlem | 147590 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, shopping 2, radfahren 2 |
| ☐ | Zandvoort | 16868 | 2 / 1 | 6.9 | beliebt | strand 3, familie 2 |

### Andalusien und Costa del Sol

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Sevilla | 703206 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Málaga | 568305 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, strand 2, shopping 2 |
| ☐ | Nerja | 21811 | 2 / 2 | 7.1 | beliebt | strand 2, natur_ruhe 2 |

### Athen und Peloponnes

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Athen | 664046 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Nafplio | 14582 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, strand 2 |

### Barcelona und Costa Brava

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Barcelona | 1621537 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, strand 2 |
| ☐ | Lloret de Mar | 39363 | 2 / 1 | 6.9 | beliebt | strand 3, familie 2 |
| ☐ | Sitges | 27668 | 2 / 1 | 6.9 | beliebt | strand 3, staedte_kultur 2 |

### Berlin und Potsdam

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Berlin | 3426354 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, familie 2, radfahren 1 |
| ☐ | Potsdam | 145292 | 3 / 3 | 9.6 | top | staedte_kultur 3, seen 2, radfahren 2, shopping 1 |

### Berner Oberland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Grindelwald | 3730 | 3 / 3 | 9.6 | top | wandern 3, bergpanorama 3, wintersport 3 |
| ☐ | Thun | 42136 | 2 / 2 | 7.8 | beliebt | staedte_kultur 3, seen 3 |
| ☐ | Spiez | 12594 | 2 / 1 | 4.9 | ruhig | seen 3, wein_kulinarik 2 |

### Budapest

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Budapest | 1741041 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, wellness 3 |
| ☐ | Szentendre | 23606 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2 |

### Chamonix und Savoyen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Chamonix | 10614 | 3 / 3 | 9.6 | top | bergpanorama 3, wandern 3, wintersport 3 |
| ☐ | Annecy | 49232 | 3 / 2 | 8 | top | seen 3, staedte_kultur 2, radfahren 2 |
| ☐ | Évian-les-Bains | 8207 | 2 / 1 | 4.4 | ruhig | seen 2, wellness 2 |

### Dalmatien

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Split | 176314 | 3 / 3 | 9.6 | top | staedte_kultur 3, strand 2, shopping 1 |
| ☐ | Dubrovnik | 28428 | 3 / 3 | 9.6 | top | staedte_kultur 3, strand 2 |
| ☐ | Trogir | 10960 | 2 / 1 | 6.2 | beliebt | staedte_kultur 2, strand 2 |

### Dolomiten und Trentino

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Canazei | 1001 | 3 / 3 | 9.6 | top | wintersport 3, wandern 3, bergpanorama 3 |
| ☐ | Arco | 12072 | 2 / 2 | 7.8 | beliebt | radfahren 3, wandern 2, seen 1 |
| ☐ | Trient | 80425 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, radfahren 2, shopping 1 |

### Dresden und Elbland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Dresden | 486854 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2, radfahren 2 |
| ☐ | Meißen | 28492 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, wein_kulinarik 2, radfahren 2 |
| ☐ | Radebeul | 32643 | 1 / 1 | 4.2 | ruhig | wein_kulinarik 2, staedte_kultur 1 |

### Elsass

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Straßburg | 274845 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2, radfahren 2 |
| ☐ | Colmar | 65405 | 3 / 2 | 8.7 | top | staedte_kultur 3, wein_kulinarik 3 |
| ☐ | Obernai | 12138 | 2 / 1 | 6.2 | beliebt | wein_kulinarik 2, staedte_kultur 2, wandern 1 |

### Flandern und Brüssel

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Brüssel | 1019022 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3 |
| ☐ | Gent | 231493 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3, shopping 1 |
| ☐ | Knokke-Heist | 33781 | 2 / 1 | 6.9 | beliebt | strand 3, shopping 2 |

### Gardasee

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Sirmione | 6818 | 3 / 3 | 9.6 | top | seen 3, staedte_kultur 3, wellness 2 |
| ☐ | Riva del Garda | 14727 | 3 / 2 | 9.1 | top | seen 3, radfahren 3, wandern 2, familie 2 |
| ☐ | Bardolino | 4873 | 2 / 1 | 5.8 | ruhig | wein_kulinarik 3, seen 2, radfahren 2 |

### Hamburg und Lübeck

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Hamburg | 1739117 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, familie 2 |
| ☐ | Lübeck | 212207 | 3 / 2 | 8.7 | top | staedte_kultur 3, strand 2, shopping 1 |

### Heidelberg und Neckartal

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Heidelberg | 143345 | 3 / 3 | 9.6 | top | staedte_kultur 3, wandern 2, shopping 1 |
| ☐ | Eberbach | 15624 | 1 / 1 | 5.3 | ruhig | wandern 2, radfahren 2, natur_ruhe 2 |
| ☐ | Hirschhorn | 3691 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, wandern 2, natur_ruhe 2 |

### Köln und Düsseldorf

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Köln | 963395 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, familie 2 |
| ☐ | Düsseldorf | 573057 | 3 / 2 | 8.7 | top | shopping 3, staedte_kultur 2 |
| ☐ | Bonn | 313125 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, radfahren 2, shopping 1 |

### Kopenhagen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Kopenhagen | 1153615 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, radfahren 3 |
| ☐ | Helsingør | 35048 | 2 / 2 | 6.7 | beliebt | staedte_kultur 2, strand 1 |

### Krakau und Tatra

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Krakau | 755050 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Zakopane | 27580 | 3 / 3 | 9.6 | top | wandern 3, wintersport 3, bergpanorama 3 |

### Lissabon und Sintra

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Lissabon | 517802 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3 |
| ☐ | Sintra | 26193 | 2 / 3 | 8.7 | top | staedte_kultur 3, wandern 2 |
| ☐ | Cascais | 36436 | 2 / 1 | 6.9 | beliebt | strand 3, staedte_kultur 2 |

### London

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | London | 7556900 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3 |
| ☐ | Windsor | 33348 | 2 / 2 | 6.7 | beliebt | staedte_kultur 2 |

### Luzern und Vierwaldstättersee

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Engelberg | 4001 | 3 / 3 | 9.6 | top | wandern 3, wintersport 3, bergpanorama 3 |
| ☐ | Weggis | 3863 | 2 / 2 | 5.3 | ruhig | seen 3, natur_ruhe 2 |
| ☐ | Sarnen | 9410 | 1 / 1 | 3.6 | wenig | seen 2, natur_ruhe 2 |

### Madrid und Kastilien

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Madrid | 3255944 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3 |
| ☐ | Toledo | 82291 | 2 / 3 | 8.2 | top | staedte_kultur 3 |
| ☐ | Segovia | 56660 | 2 / 3 | 8.2 | top | staedte_kultur 3 |

### Mailand und Bergamo

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Mailand | 1236837 | 3 / 3 | 9.6 | top | shopping 3, staedte_kultur 3 |
| ☐ | Bergamo | 114162 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3, shopping 1 |

### Mosel

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Trier | 100129 | 3 / 3 | 9.6 | top | staedte_kultur 3, wein_kulinarik 2, shopping 1 |
| ☐ | Bernkastel-Kues | 6880 | 3 / 1 | 7.1 | beliebt | wein_kulinarik 3, staedte_kultur 2 |
| ☐ | Kröv | 2318 | 1 / 0 | 4 | ruhig | wein_kulinarik 2, familie 2, wandern 2 |

### München

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | München | 1260391 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, familie 2, radfahren 1 |
| ☐ | Freising | 42570 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, radfahren 1 |

### Neapel und Amalfiküste

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Neapel | 959470 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Positano | 2334 | 3 / 2 | 8 | top | strand 2, staedte_kultur 2, wandern 2 |
| ☐ | Capri | 6770 | 3 / 2 | 8 | top | strand 2, staedte_kultur 2 |

### Paris und Versailles

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Paris | 2138551 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, familie 1 |
| ☐ | Versailles | 85416 | 2 / 3 | 8.2 | top | staedte_kultur 3 |

### Prag

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Prag | 1165581 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Kutná Hora | 21280 | 1 / 2 | 5.8 | ruhig | staedte_kultur 2 |

### Provence

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Avignon | 89769 | 3 / 3 | 9.6 | top | staedte_kultur 3, wein_kulinarik 2 |
| ☐ | Aix-en-Provence | 146821 | 2 / 2 | 7.8 | beliebt | staedte_kultur 3, shopping 2 |
| ☐ | Arles | 53431 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3 |

### Rom und Latium

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Rom | 2318895 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3 |
| ☐ | Tivoli | 22018 | 2 / 2 | 6.7 | beliebt | staedte_kultur 2 |
| ☐ | Frascati | 20036 | 1 / 1 | 4.2 | ruhig | wein_kulinarik 2, staedte_kultur 1 |

### Salzburger Land

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Salzburg | 153377 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Bad Hofgastein | 2951 | 2 / 3 | 7.6 | beliebt | wellness 3, wandern 2 |
| ☐ | Flachau | 827 | 2 / 3 | 5.8 | ruhig | wintersport 3, familie 2 |

### Schottland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Edinburgh | 464990 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Glasgow | 591620 | 2 / 2 | 7.8 | beliebt | shopping 3, staedte_kultur 2 |
| ☐ | Inverness | 46870 | 2 / 2 | 7.1 | beliebt | natur_ruhe 2, wandern 2, staedte_kultur 1 |

### Sizilien

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Palermo | 648260 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2 |
| ☐ | Syrakus | 97472 | 2 / 3 | 8.2 | top | staedte_kultur 3, strand 1 |
| ☐ | Cefalù | 11613 | 2 / 2 | 7.8 | beliebt | strand 3, staedte_kultur 2 |

### Stockholm

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Stockholm | 1515017 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 3, natur_ruhe 1 |
| ☐ | Uppsala | 149245 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2 |

### Tannheimer Tal und Zugspitzarena

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Ehrwald | 2593 | 3 / 3 | 9.6 | top | wandern 3, bergpanorama 3, wintersport 2 |
| ☐ | Reutte | 6704 | 2 / 2 | 6.7 | beliebt | staedte_kultur 2, wandern 2 |
| ☐ | Lermoos | 1075 | 2 / 2 | 6.2 | beliebt | wandern 2, familie 2, bergpanorama 2 |

### Toskana

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Florenz | 349296 | 3 / 3 | 9.6 | top | staedte_kultur 3, shopping 2, wein_kulinarik 2 |
| ☐ | Pisa | 77007 | 3 / 3 | 8.4 | top | staedte_kultur 2, shopping 1 |
| ☐ | Lucca | 81748 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, radfahren 2 |

### Wallis

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Zermatt | 6629 | 3 / 3 | 9.6 | top | bergpanorama 3, wandern 3, wintersport 3 |
| ☐ | Saas-Fee | 1611 | 3 / 3 | 8.9 | top | bergpanorama 3, wintersport 3, wandern 2 |
| ☐ | Brig | 5000 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, wandern 2 |

### Werdenfelser Land

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Garmisch-Partenkirchen | 26022 | 3 / 3 | 9.6 | top | wandern 3, bergpanorama 3, wintersport 3, staedte_kultur 1 |
| ☐ | Mittenwald | 7996 | 3 / 2 | 8.7 | top | wandern 3, bergpanorama 3, staedte_kultur 2 |
| ☐ | Krün | 2032 | 1 / 1 | 5.3 | ruhig | natur_ruhe 2, seen 2, wandern 2, bergpanorama 2 |

### Graubünden

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Lenzerheide | 2610 | 3 / 3 | 9.3 | top | seen 2, wintersport 2, wandern 2, familie 2 |
| ☐ | Davos | 11024 | 3 / 3 | 8.9 | top | wintersport 3, wandern 2, wellness 2 |
| ☐ | Arosa | 2307 | 3 / 3 | 8.9 | top | wintersport 3, wandern 2, natur_ruhe 2 |

### Bodensee

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Konstanz | 81275 | 3 / 2 | 9.1 | top | staedte_kultur 3, seen 3, radfahren 2, shopping 2 |
| ☐ | Überlingen | 21507 | 2 / 1 | 6.2 | beliebt | seen 2, wellness 2, staedte_kultur 2 |
| ☐ | Wasserburg (Bodensee) | 3905 | 1 / 1 | 3.6 | wenig | seen 3, natur_ruhe 2 |

### Chiemsee und Chiemgau

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Ruhpolding | 6419 | 3 / 2 | 9.1 | top | wandern 3, wintersport 3, familie 2, bergpanorama 2 |
| ☐ | Aschau im Chiemgau | 5410 | 2 / 2 | 7.3 | beliebt | wandern 3, bergpanorama 2, staedte_kultur 1 |
| ☐ | Bernau am Chiemsee | 6645 | 1 / 1 | 4.9 | ruhig | seen 3, radfahren 2, familie 2 |

### Schwarzwald

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Titisee-Neustadt | 12019 | 3 / 2 | 9.1 | top | seen 3, wandern 3, familie 2, wintersport 2 |
| ☐ | Triberg im Schwarzwald | 5275 | 2 / 2 | 6.7 | beliebt | wandern 2, familie 2, staedte_kultur 2 |
| ☐ | St. Blasien | 4111 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, wandern 2, natur_ruhe 2 |

### Venedig und Obere Adria

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Venedig | 51298 | 3 / 3 | 9.1 | top | staedte_kultur 3, shopping 1 |
| ☐ | Caorle | 7511 | 2 / 1 | 6.4 | beliebt | strand 3, staedte_kultur 2, familie 2 |
| ☐ | Chioggia | 41897 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, strand 1 |

### Comer See und Lago Maggiore

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Stresa | 3985 | 3 / 3 | 8.9 | top | seen 3, staedte_kultur 2 |
| ☐ | Como | 81975 | 3 / 2 | 8 | top | seen 3, staedte_kultur 2, shopping 2 |
| ☐ | Bellagio | 2823 | 3 / 2 | 8 | top | seen 3, staedte_kultur 2 |

### Kitzbüheler Alpen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Kitzbühel | 8272 | 3 / 3 | 8.9 | top | wintersport 3, staedte_kultur 2, wandern 2 |
| ☐ | Kirchberg in Tirol | 5245 | 2 / 3 | 7.6 | beliebt | wintersport 2, wandern 2, familie 2 |
| ☐ | Fieberbrunn | 4287 | 2 / 2 | 6.7 | beliebt | wintersport 2, wandern 2, familie 2 |

### Ötztal und Stubaital

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Sölden | 2205 | 3 / 3 | 8.9 | top | wintersport 3, bergpanorama 3, wandern 2 |
| ☐ | Oetz | 2402 | 1 / 2 | 5.8 | ruhig | familie 2, wandern 2, seen 2 |
| ☐ | Fulpmes | 3038 | 1 / 2 | 5.8 | ruhig | wandern 2, familie 2 |

### Schladming-Dachstein

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Schladming | 3452 | 3 / 3 | 8.9 | top | wintersport 3, wandern 2, familie 2 |
| ☐ | Ramsau am Dachstein | 2812 | 2 / 3 | 8.2 | top | wandern 3, bergpanorama 3, wintersport 2 |
| ☐ | Bad Mitterndorf | 1043 | 1 / 2 | 4 | ruhig | natur_ruhe 2, wellness 2, wintersport 2 |

### Algarve

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Lagos | 18831 | 3 / 2 | 8.7 | top | strand 3, staedte_kultur 2 |
| ☐ | Albufeira | 15851 | 2 / 1 | 6.9 | beliebt | strand 3, familie 2 |
| ☐ | Tavira | 15133 | 2 / 1 | 6.2 | beliebt | strand 2, staedte_kultur 2 |

### Bretagne und Normandie

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Saint-Malo | 50676 | 3 / 2 | 8.7 | top | staedte_kultur 3, strand 3 |
| ☐ | Bayeux | 15963 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3 |
| ☐ | Étretat | 1658 | 2 / 2 | 6.7 | beliebt | natur_ruhe 3, wandern 2 |

### Cinque Terre und Ligurische Küste

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Monterosso al Mare | 1372 | 3 / 2 | 8.7 | top | strand 3, wandern 3, staedte_kultur 2 |
| ☐ | Riomaggiore | 1067 | 3 / 2 | 8.7 | top | wandern 3, staedte_kultur 2 |
| ☐ | Levanto | 4135 | 2 / 1 | 6.4 | beliebt | strand 3, wandern 2 |

### Côte d’Azur

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Nizza | 338620 | 3 / 2 | 8.7 | top | strand 3, staedte_kultur 2, shopping 2 |
| ☐ | Cannes | 70011 | 3 / 2 | 8.7 | top | strand 3, shopping 2 |
| ☐ | Antibes | 76393 | 2 / 2 | 7.8 | beliebt | strand 3, staedte_kultur 2 |

### Danzig und polnische Ostsee

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Danzig | 461865 | 3 / 2 | 8.7 | top | staedte_kultur 3, shopping 2, strand 1 |
| ☐ | Kolberg | 44377 | 2 / 1 | 6.9 | beliebt | strand 3, wellness 2 |
| ☐ | Zoppot | 40142 | 2 / 1 | 6.4 | beliebt | strand 3, wellness 1 |

### Eisacktal und Bozen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bozen | 99049 | 3 / 2 | 8.7 | top | staedte_kultur 3, wein_kulinarik 3, shopping 2 |
| ☐ | Ritten | 6993 | 2 / 2 | 6.7 | beliebt | natur_ruhe 2, wandern 2 |
| ☐ | Klausen | 2497 | 2 / 1 | 6.4 | beliebt | staedte_kultur 3, wein_kulinarik 2 |

### Franken und Romantische Straße

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Würzburg | 133731 | 3 / 2 | 8.7 | top | staedte_kultur 3, wein_kulinarik 3, shopping 1 |
| ☐ | Bamberg | 70047 | 3 / 2 | 8.7 | top | staedte_kultur 3, wein_kulinarik 2 |
| ☐ | Rothenburg ob der Tauber | 11106 | 3 / 2 | 8.2 | top | staedte_kultur 3, wein_kulinarik 1 |

### Frankfurt und Rhein-Main

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Frankfurt am Main | 650000 | 3 / 2 | 8.7 | top | shopping 3, staedte_kultur 2, familie 1 |
| ☐ | Wiesbaden | 272432 | 2 / 2 | 7.1 | beliebt | wellness 2, staedte_kultur 2, shopping 2 |
| ☐ | Mainz | 184997 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, wein_kulinarik 2, shopping 1 |

### Harz

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Goslar | 43560 | 3 / 2 | 8.7 | top | staedte_kultur 3, wandern 2 |
| ☐ | Thale | 13386 | 2 / 2 | 7.8 | beliebt | wandern 3, natur_ruhe 2, familie 2 |
| ☐ | Braunlage | 5159 | 2 / 2 | 6.7 | beliebt | wintersport 2, wandern 2, familie 2 |

### Irland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Dublin | 1024027 | 3 / 2 | 8.7 | top | staedte_kultur 3, shopping 3 |
| ☐ | Killarney | 7300 | 2 / 2 | 7.3 | beliebt | wandern 3, natur_ruhe 3, seen 2 |
| ☐ | Dingle | 1965 | 2 / 1 | 5.8 | ruhig | natur_ruhe 3, wandern 2 |

### Istrien und Kvarner

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Rovinj | 13533 | 3 / 2 | 8.7 | top | staedte_kultur 3, strand 2 |
| ☐ | Pula | 59078 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, strand 2 |
| ☐ | Umag | 7807 | 1 / 1 | 4.9 | ruhig | strand 2, familie 2 |

### Korfu

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Korfu | 27003 | 3 / 2 | 8.7 | top | staedte_kultur 3, strand 2 |

### Kreta

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Chania | 53910 | 3 / 2 | 8.7 | top | strand 3, staedte_kultur 2 |
| ☐ | Heraklion | 137154 | 2 / 3 | 7.6 | beliebt | staedte_kultur 2, strand 1, shopping 1 |
| ☐ | Agios Nikolaos | 11421 | 2 / 1 | 5.8 | ruhig | strand 2, staedte_kultur 1 |

### Loiretal

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Amboise | 12685 | 2 / 3 | 8.7 | top | staedte_kultur 3, wein_kulinarik 2, radfahren 2 |
| ☐ | Blois | 53660 | 2 / 3 | 8.7 | top | staedte_kultur 3, radfahren 2 |
| ☐ | Saumur | 33229 | 2 / 2 | 7.1 | beliebt | wein_kulinarik 3, staedte_kultur 2 |

### Madeira

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Funchal | 100847 | 3 / 2 | 8.7 | top | wandern 3, bergpanorama 3, staedte_kultur 2 |
| ☐ | Machico | 12567 | 1 / 1 | 4.9 | ruhig | wandern 2, strand 1 |

### Mallorca

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Palma | 401270 | 3 / 2 | 8.7 | top | staedte_kultur 3, shopping 2, strand 2 |
| ☐ | Sóller | 13942 | 2 / 2 | 7.8 | beliebt | wandern 3, bergpanorama 2, staedte_kultur 1 |
| ☐ | Alcúdia | 19071 | 2 / 1 | 6.9 | beliebt | strand 3, familie 3, staedte_kultur 1 |

### Meraner Land

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Meran | 33453 | 3 / 2 | 8.7 | top | wellness 3, staedte_kultur 3, wandern 2, shopping 1 |
| ☐ | Lana | 9244 | 2 / 1 | 5.8 | ruhig | wein_kulinarik 2, wandern 2 |
| ☐ | Partschins | 1211 | 1 / 2 | 5.3 | ruhig | wandern 2, natur_ruhe 2 |

### Porto und Douro

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Porto | 249633 | 3 / 2 | 8.7 | top | staedte_kultur 3, wein_kulinarik 3, shopping 2 |
| ☐ | Peso da Régua | 5048 | 1 / 1 | 3.6 | wenig | wein_kulinarik 3, natur_ruhe 2 |

### Sauerland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Winterberg | 14601 | 3 / 2 | 8.7 | top | wintersport 3, wandern 3, familie 2 |
| ☐ | Willingen (Upland) | 6564 | 3 / 2 | 8 | top | wintersport 3, wandern 2, familie 2 |
| ☐ | Schmallenberg | 26132 | 2 / 1 | 6.9 | beliebt | wandern 3, natur_ruhe 2, wellness 2 |

### Tessin

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Lugano | 63000 | 3 / 2 | 8.7 | top | staedte_kultur 3, seen 3, shopping 2 |
| ☐ | Locarno | 14509 | 3 / 2 | 8 | top | seen 3, staedte_kultur 2 |
| ☐ | Brissago | 1831 | 1 / 1 | 3.6 | wenig | seen 2, natur_ruhe 2 |

### Wachau

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Melk | 3788 | 3 / 2 | 8.7 | top | staedte_kultur 3, radfahren 2 |
| ☐ | Spitz | 1270 | 2 / 1 | 5.3 | ruhig | wein_kulinarik 3, wandern 2 |
| ☐ | Weißenkirchen in der Wachau | 939 | 2 / 1 | 5.3 | ruhig | wein_kulinarik 3, radfahren 2 |

### Tegernsee und Schliersee

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Tegernsee | 3770 | 3 / 2 | 8.4 | top | seen 3, wandern 2, wein_kulinarik 2, wellness 2 |
| ☐ | Bayrischzell | 1601 | 2 / 2 | 7.8 | beliebt | wandern 3, bergpanorama 2, wintersport 2, natur_ruhe 2 |
| ☐ | Rottach-Egern | 5106 | 2 / 2 | 6.7 | beliebt | seen 3, wellness 2, wandern 2 |

### Nordseeküste

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Sankt Peter-Ording | 4092 | 3 / 1 | 8.2 | top | natur_ruhe 3, strand 3, wellness 2, familie 2 |
| ☐ | Norderney | 5949 | 3 / 1 | 8.2 | top | wellness 3, strand 3, natur_ruhe 2, radfahren 2 |
| ☐ | Büsum | 4904 | 2 / 1 | 5.8 | ruhig | familie 2, natur_ruhe 2, strand 2 |

### Ostseeküste Mecklenburg-Vorpommern

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Binz | 5531 | 3 / 1 | 8.2 | top | familie 3, strand 3, wellness 2, natur_ruhe 2, radfahren 2 |
| ☐ | Kühlungsborn | 7453 | 3 / 1 | 8.2 | top | strand 3, familie 2, wellness 2, radfahren 2 |
| ☐ | Putbus | 4803 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, natur_ruhe 2 |

### Fjordnorwegen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bergen | 213585 | 3 / 2 | 8 | top | staedte_kultur 2, bergpanorama 2, wandern 2 |
| ☐ | Voss | 5571 | 2 / 2 | 7.3 | beliebt | wandern 3, wintersport 2 |
| ☐ | Ålesund | 44096 | 2 / 1 | 6.2 | beliebt | staedte_kultur 2, bergpanorama 2 |

### Mittelrhein und Rheingau

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Rüdesheim am Rhein | 9921 | 3 / 2 | 8 | top | wein_kulinarik 3, staedte_kultur 2, wandern 2 |
| ☐ | St. Goar | 3083 | 2 / 2 | 6.7 | beliebt | staedte_kultur 2, wandern 2 |
| ☐ | Eltville am Rhein | 16845 | 1 / 1 | 5.3 | ruhig | wein_kulinarik 3, radfahren 2 |

### Pustertal und Drei Zinnen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bruneck | 12282 | 2 / 3 | 8 | top | wintersport 3, staedte_kultur 2, wandern 2 |
| ☐ | Sexten | 902 | 2 / 3 | 7.8 | beliebt | bergpanorama 3, wandern 3, wintersport 2 |
| ☐ | Olang | 1668 | 2 / 3 | 7.6 | beliebt | wintersport 2, wandern 2 |

### Salzkammergut

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | St. Wolfgang im Salzkammergut | 2794 | 3 / 2 | 8 | top | seen 3, wandern 2 |
| ☐ | Bad Ischl | 1914 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3, wellness 2 |
| ☐ | Gmunden | 13191 | 2 / 2 | 7.1 | beliebt | seen 3, staedte_kultur 2 |

### Slowenien

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bled | 5181 | 3 / 2 | 8 | top | seen 3, wandern 2, bergpanorama 2 |
| ☐ | Bovec | 1631 | 2 / 1 | 5.8 | ruhig | natur_ruhe 3, wandern 2 |
| ☐ | Piran | 4192 | 2 / 1 | 5.8 | ruhig | staedte_kultur 2, strand 2 |

### Bayerischer Wald

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bodenmais | 3362 | 2 / 2 | 7.8 | beliebt | wandern 3, wellness 2, familie 2, natur_ruhe 2 |
| ☐ | Grafenau | 8870 | 1 / 1 | 4.9 | ruhig | natur_ruhe 3, wandern 2, familie 2 |
| ☐ | Lam | 2884 | 1 / 1 | 4.9 | ruhig | wandern 2, natur_ruhe 2, wellness 2 |

### Bologna und Riviera Romagnola

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bologna | 366133 | 2 / 2 | 7.8 | beliebt | staedte_kultur 3, wein_kulinarik 3, shopping 2 |
| ☐ | Rimini | 118673 | 2 / 1 | 6.9 | beliebt | strand 3, familie 3, staedte_kultur 1 |
| ☐ | Riccione | 32744 | 2 / 1 | 6.9 | beliebt | strand 3, familie 3, shopping 1 |

### Kärntner Seen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Klagenfurt am Wörthersee | 90610 | 2 / 2 | 7.8 | beliebt | staedte_kultur 3, seen 2, shopping 1 |
| ☐ | Villach | 58882 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, wellness 2, radfahren 2 |
| ☐ | Velden am Wörthersee | 2325 | 3 / 2 | 6.7 | beliebt | seen 3, wellness 2 |

### Sardinien

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Alghero | 34261 | 2 / 2 | 7.8 | beliebt | strand 3, staedte_kultur 2 |
| ☐ | San Teodoro | 1895 | 2 / 1 | 6.4 | beliebt | strand 3, familie 2 |
| ☐ | Villasimius | 2999 | 2 / 1 | 6.4 | beliebt | strand 3, natur_ruhe 2 |

### Stuttgart

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Stuttgart | 589793 | 2 / 2 | 7.8 | beliebt | shopping 3, staedte_kultur 2, wein_kulinarik 2 |
| ☐ | Ludwigsburg | 87603 | 2 / 2 | 7.8 | beliebt | staedte_kultur 3, familie 2 |

### Thüringer Wald

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Eisenach | 43846 | 2 / 2 | 7.8 | beliebt | staedte_kultur 3, wandern 2 |
| ☐ | Schmalkalden | 17710 | 1 / 1 | 5.3 | ruhig | staedte_kultur 2, wandern 2 |
| ☐ | Tambach-Dietharz | 4354 | 1 / 0 | 4 | ruhig | natur_ruhe 2, wandern 2 |

### Appenzell und Ostschweiz

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | St. Gallen | 70572 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3, shopping 1 |
| ☐ | Appenzell | 5649 | 2 / 1 | 6.4 | beliebt | staedte_kultur 3, wandern 3 |
| ☐ | Walenstadt | 5000 | 1 / 1 | 4.9 | ruhig | seen 3, wandern 2 |

### Dänische Nordseeküste

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Skagen | 9747 | 2 / 2 | 7.3 | beliebt | strand 3, natur_ruhe 3, staedte_kultur 1 |
| ☐ | Løkken | 8828 | 2 / 1 | 6.4 | beliebt | strand 3, familie 2 |
| ☐ | Ribe | 7983 | 2 / 1 | 5.3 | ruhig | staedte_kultur 2, natur_ruhe 1 |

### Fränkische Schweiz

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Pottenstein | 5501 | 2 / 2 | 7.3 | beliebt | wandern 3, natur_ruhe 2, familie 2 |
| ☐ | Pegnitz | 14279 | 1 / 0 | 4.4 | ruhig | wandern 2, natur_ruhe 2, radfahren 1 |
| ☐ | Waischenfeld | 3167 | 1 / 0 | 4 | ruhig | natur_ruhe 3, wandern 2 |

### Sächsische Schweiz

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bad Schandau | 3078 | 2 / 2 | 7.3 | beliebt | wandern 3, wellness 2, natur_ruhe 2 |
| ☐ | Königstein | 3011 | 2 / 2 | 6.7 | beliebt | wandern 2, staedte_kultur 2 |
| ☐ | Pirna | 40322 | 1 / 1 | 5.3 | ruhig | staedte_kultur 2, radfahren 2 |

### Westböhmen und Südböhmen

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Krumau | 14146 | 2 / 2 | 7.3 | beliebt | staedte_kultur 3, natur_ruhe 1 |
| ☐ | Karlsbad | 51807 | 2 / 2 | 7.1 | beliebt | wellness 3, staedte_kultur 2 |
| ☐ | Marienbad | 14277 | 2 / 1 | 4.9 | ruhig | wellness 3, natur_ruhe 2 |

### Den Haag und Zeeland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Den Haag | 474292 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, shopping 2, strand 2 |
| ☐ | Noordwijk | 24363 | 2 / 1 | 6.9 | beliebt | strand 3, familie 2, radfahren 2 |
| ☐ | Domburg | 1435 | 2 / 1 | 6 | beliebt | strand 3, natur_ruhe 2 |

### Kanarische Inseln

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Puerto de la Cruz | 32219 | 2 / 2 | 7.1 | beliebt | strand 2, wandern 2, natur_ruhe 2 |
| ☐ | Adeje | 43204 | 2 / 1 | 6.9 | beliebt | strand 3, familie 3 |
| ☐ | Las Palmas de Gran Canaria | 381847 | 2 / 1 | 6.2 | beliebt | strand 2, shopping 2, staedte_kultur 1 |

### Luxemburg

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Luxemburg | 76684 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, shopping 2 |
| ☐ | Vianden | 1626 | 2 / 2 | 6.7 | beliebt | staedte_kultur 2, wandern 2 |
| ☐ | Echternach | 4787 | 2 / 1 | 6.4 | beliebt | wandern 3, staedte_kultur 2 |

### Mecklenburgische Seenplatte

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Waren (Müritz) | 21470 | 2 / 2 | 7.1 | beliebt | seen 3, natur_ruhe 2, radfahren 2 |
| ☐ | Neustrelitz | 22291 | 1 / 1 | 5.3 | ruhig | staedte_kultur 2, seen 2 |
| ☐ | Mirow | 3609 | 1 / 1 | 3.6 | wenig | seen 3, natur_ruhe 3 |

### Plattensee

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Keszthely | 21534 | 2 / 2 | 7.1 | beliebt | seen 2, staedte_kultur 2 |
| ☐ | Siófok | 23028 | 2 / 1 | 4.9 | ruhig | seen 3, familie 2 |
| ☐ | Hévíz | 4438 | 2 / 2 | 4.9 | ruhig | wellness 3 |

### Valencia und Costa Blanca

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Valencia | 814208 | 2 / 2 | 7.1 | beliebt | staedte_kultur 2, shopping 2, strand 2 |
| ☐ | Altea | 23780 | 2 / 1 | 6.2 | beliebt | strand 2, staedte_kultur 2 |
| ☐ | Dénia | 44464 | 2 / 1 | 5.8 | ruhig | strand 2, staedte_kultur 1 |

### Cornwall

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Newquay | 20189 | 2 / 1 | 6.9 | beliebt | strand 3, familie 2 |
| ☐ | St Ives | 9966 | 2 / 1 | 6.4 | beliebt | strand 3, staedte_kultur 2 |
| ☐ | Falmouth | 31988 | 1 / 1 | 4.9 | ruhig | strand 2, staedte_kultur 1 |

### Eifel

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Monschau | 12945 | 2 / 1 | 6.9 | beliebt | staedte_kultur 3, wandern 2 |
| ☐ | Nideggen | 10727 | 1 / 1 | 5.3 | ruhig | wandern 2, seen 2, natur_ruhe 2 |
| ☐ | Daun | 8523 | 1 / 1 | 4.9 | ruhig | natur_ruhe 3, seen 2, wandern 2 |

### Schwäbische Alb

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Bad Urach | 12831 | 2 / 1 | 6.9 | beliebt | wandern 3, wellness 2, familie 2 |
| ☐ | Münsingen | 14479 | 1 / 1 | 5.3 | ruhig | natur_ruhe 3, radfahren 2, wandern 2 |
| ☐ | Hayingen | 2224 | 1 / 1 | 4.9 | ruhig | natur_ruhe 3, wandern 2 |

### Erzgebirge

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Oberwiesenthal | 2592 | 2 / 2 | 6.7 | beliebt | wintersport 3, wandern 2, familie 2 |
| ☐ | Annaberg-Buchholz | 23092 | 1 / 1 | 5.6 | ruhig | staedte_kultur 3 |
| ☐ | Marienberg | 14383 | 1 / 0 | 4.4 | ruhig | staedte_kultur 2, wandern 2 |

### Lüneburger Heide

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Celle | 71010 | 2 / 1 | 6.4 | beliebt | staedte_kultur 3 |
| ☐ | Soltau | 21945 | 2 / 2 | 5.8 | ruhig | familie 2, wellness 2 |
| ☐ | Bispingen | 6284 | 1 / 1 | 4.9 | ruhig | familie 2, wandern 2 |

### Pfälzerwald und Deutsche Weinstraße

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Annweiler am Trifels | 7316 | 1 / 2 | 6.4 | beliebt | wandern 3, staedte_kultur 2 |
| ☐ | Bad Dürkheim | 18698 | 2 / 1 | 6.2 | beliebt | wein_kulinarik 3, wellness 2, wandern 2 |
| ☐ | Dahn | 4994 | 1 / 1 | 5.6 | ruhig | wandern 3, natur_ruhe 2 |

### Fünfseenland

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Herrsching am Ammersee | 10000 | 2 / 1 | 6.2 | beliebt | seen 3, wandern 2, wein_kulinarik 2 |
| ☐ | Utting am Ammersee | 3983 | 1 / 0 | 4 | ruhig | seen 2, natur_ruhe 2, radfahren 2 |
| ☐ | Tutzing | 9517 | 1 / 1 | 3.6 | wenig | seen 3, natur_ruhe 2 |

### Vinschgau

| ☐ | Ort | Einwohner | B / A | Punkte | Stufe | Themen |
|---|---|---|---|---|---|---|
| ☐ | Prad am Stilfserjoch | 2640 | 1 / 2 | 5.8 | ruhig | bergpanorama 3, radfahren 2 |
| ☐ | Mals | 1884 | 1 / 1 | 4.9 | ruhig | natur_ruhe 2, wandern 2, radfahren 2 |
| ☐ | Schlanders | 4517 | 1 / 1 | 4.9 | ruhig | staedte_kultur 2, radfahren 2 |

