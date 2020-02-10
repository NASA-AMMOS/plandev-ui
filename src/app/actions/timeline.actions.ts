import { createAction, props } from '@ngrx/store';
import { TimeRange } from '../types';

export const restoreViewTimeRange = createAction(
  '[timeline] restoreViewTimeRange',
);

export const updateMarginBottom = createAction(
  '[timeline] updateMarginBottom',
  props<{ marginBottom: number }>(),
);

export const updateMarginLeft = createAction(
  '[timeline] updateMarginLeft',
  props<{ marginLeft: number }>(),
);

export const updateMarginRight = createAction(
  '[timeline] updateMarginRight',
  props<{ marginRight: number }>(),
);

export const updateMarginTop = createAction(
  '[timeline] updateMarginTop',
  props<{ marginTop: number }>(),
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
