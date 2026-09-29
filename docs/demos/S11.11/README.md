# S11.11 Warnsignale nach Anteil

Bens Vorgabe vom 29.09.2026: „Nur weil ein paar Leute Schimmel melden, heißt es nicht, dass man dort nicht wohnen kann. Nur wenn es überhand nimmt, soll es natürlich nicht kommen.“ Und: „Auch beim Schimmel bitte ältere Bewertungen gleichermaßen weniger werten als neue. Genauso wie sonst auch.“ Die Liste ganz unten bleibt den Häusern ohne Bewertungen vorbehalten.

## Regel

| Thema | aussortiert ab | ohne KI-Prüfung |
|---|---|---|
| Schimmel | 3 Gäste **und** 10 % der geprüften Bewertungen | 4 Gäste und 10 % |
| Ungeziefer | 3 Gäste und 10 % | 4 Gäste und 10 % |
| Schmutz | 4 Gäste und 15 % | 5 Gäste und 15 % |

- Bewertungen der letzten 6 Monate zählen doppelt, in den Meldungen wie in der Basis, genau wie bei den Lob-Labels (`MENTION_RECENT_MONTHS`, `MENTION_RECENT_WEIGHT`).
- Basis: die Bewertungen der letzten 24 Monate, die die Stichwortliste lesen kann.
- Die KI sieht je Thema höchstens 5 Ausschnitte. Der Scan zählt deshalb alle Treffer und rechnet den Rest mit der Quote hoch, die die KI unter den gesehenen bestätigt hat.
- Darunter: Warnhinweis mit Abzug im Qualitätswert, das Haus steht ganz normal in der Liste und kann „Unsere Wahl“ werden. Darüber: aussortiert („Beschwerden über Schimmel, Ungeziefer oder Schmutz häufen sich“), auch nicht unten in der Liste.

## Belege

| Beleg | Ergebnis |
|---|---|
| `walkthrough-warnungen/` (`npm run dogfood -- --mode P --flow warnungen`, Füssen und Höfen × 2 Freitage) | 22/22. „Apartments Kaiserblick“ (Höfen, 483 Bewertungen, 3 Schimmel-Meldungen in den letzten 6 Monaten, etwa 4 % der geprüften) steht auf Platz 10 der Liste mit „Schimmel: 3 (3 in 6 Mon.)“; Detailansicht „Schimmel: 3 Erwähnungen, davon 3 in den letzten 6 Monaten“, Abzug −1,0 (Akzeptanzbeispiel 4). „Pension Alpenblick“ (Höfen, 38 Bewertungen, dieselben 3 Meldungen, etwa 12 %) ist aussortiert: „1 mit Warnsignalen: Beschwerden über Schimmel, Ungeziefer oder Schmutz häufen sich“. |
| `packages/domain/test/review-keywords.test.ts` („complaint shares for red flags“) | 3 Meldungen aus den letzten 6 Monaten bei 40 Gästen: 12 %, aussortiert; dieselben 3 Meldungen aus dem Vorjahr: 6 %, gelistet. 10 Meldungen, die KI sieht 5 und bestätigt 4: 8 Gäste, 32 %. |
| `packages/domain/test/preselect.test.ts` („only when complaints get out of hand“) | Grenzen je Thema, zwei Gäste reichen nie, Lärm ist kein Warnsignal. |
| `packages/worker/test-node/finale.test.ts` | Kein Finalist erfüllt die Regel auf den gespeicherten Rezensionschecks. |
| `walkthrough-P.md` | Alle Pfad-Walkthroughs nach der Änderung. |

In der simulierten Welt bekommt jedes Schimmel-Haus genau 3 Meldungen. Ob es aussortiert wird, hängt deshalb nur von der Zahl seiner Gäste ab. Das ist der Fall, den Ben beschrieben hat.
