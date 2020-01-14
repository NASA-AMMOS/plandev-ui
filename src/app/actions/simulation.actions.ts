import { createAction, props } from '@ngrx/store';
import { Band, StringTMap } from '../types';

export const clear = createAction('[simulation] clear');

export const run = createAction('[simulation] run');

export const runFailure = createAction(
  '[simulation] runFailure',
  props<{ errorMsg: string }>(),
);

export const runSuccess = createAction(
  '[simulation] runSuccess',
  props<{ stateBands: StringTMap<Band> }>(),
);
