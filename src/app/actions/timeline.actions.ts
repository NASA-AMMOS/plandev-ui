import { createAction, props } from '@ngrx/store';

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
