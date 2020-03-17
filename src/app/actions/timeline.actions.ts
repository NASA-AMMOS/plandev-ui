import { createAction, props } from '@ngrx/store';
import { TimeRange } from '../types';

export const restoreViewTimeRange = createAction(
  '[timeline] restoreViewTimeRange',
);

export const updateViewTimeRange = createAction(
  '[timeline] updateViewTimeRange',
  props<{ viewTimeRange: TimeRange }>(),
);
