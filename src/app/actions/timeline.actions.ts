import { createAction, props } from '@ngrx/store';
import { TimeRange } from '../types';

export const restoreViewTimeRange = createAction(
  '[timeline] restoreViewTimeRange',
);

export const updateViewTimeRange = createAction(
  '[timeline] updateViewTimeRange',
  props<{ viewTimeRange: TimeRange }>(),
);

export const zoomInViewTimeRange = createAction(
  '[timeline] zoomInViewTimeRange',
);

export const zoomOutViewTimeRange = createAction(
  '[timeline] zoomOutViewTimeRange',
);
