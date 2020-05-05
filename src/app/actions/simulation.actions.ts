import { createAction, props } from '@ngrx/store';
import { SimulationResult } from '../types';

export const run = createAction(
  '[simulation] run',
  props<{ planId: string }>(),
);

export const runFailure = createAction(
  '[simulation] runFailure',
  props<{ errorMsg: string }>(),
);

export const runSuccess = createAction(
  '[simulation] runSuccess',
  props<{ results: SimulationResult[] }>(),
);
