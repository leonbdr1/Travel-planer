import type { Flow } from '../types';
import { startFlow } from './start';
import { sucheFlow } from './suche';
import { suchrahmenFlow } from './suchrahmen';

export const flows: Flow[] = [startFlow, suchrahmenFlow, sucheFlow];
