import type { Flow } from '../types';
import { startFlow } from './start';
import { suchrahmenFlow } from './suchrahmen';

export const flows: Flow[] = [startFlow, suchrahmenFlow];
