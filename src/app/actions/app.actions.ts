import { createAction, props } from '@ngrx/store';

export const openAboutDialog = createAction('[app] openAboutDialog');

export const resize = createAction('[app] resize');

export const setLoading = createAction(
  '[app] setLoading',
  props<{ loading: boolean }>(),
);
