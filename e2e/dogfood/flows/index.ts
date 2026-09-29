import type { Flow } from '../types';
import { startFlow } from './start';
import { startseiteFlow } from './startseite';
import { orteFlow } from './orte';
import { naechteFlow } from './naechte';
import { zimmerFlow } from './zimmer';
import { buchungFlow } from './buchung';
import { entwicklerFlow } from './entwickler';
import { ergebnisseFlow } from './ergebnisse';
import { finaleFlow } from './finale';
import { langsamFlow } from './langsam';
import { pflichtseitenFlow } from './pflichtseiten';
import { sucheFlow } from './suche';
import { suchrahmenFlow } from './suchrahmen';
import { warnungenFlow } from './warnungen';

export const flows: Flow[] = [startFlow, startseiteFlow, pflichtseitenFlow, suchrahmenFlow, orteFlow, naechteFlow, zimmerFlow, sucheFlow, ergebnisseFlow, finaleFlow, warnungenFlow, buchungFlow, entwicklerFlow, langsamFlow];
