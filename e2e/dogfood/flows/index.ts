import type { Flow } from '../types';
import { startFlow } from './start';
import { buchungFlow } from './buchung';
import { ergebnisseFlow } from './ergebnisse';
import { sucheFlow } from './suche';
import { suchrahmenFlow } from './suchrahmen';
import { warnungenFlow } from './warnungen';

export const flows: Flow[] = [startFlow, suchrahmenFlow, sucheFlow, ergebnisseFlow, warnungenFlow, buchungFlow];
