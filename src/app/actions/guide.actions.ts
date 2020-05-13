import { createAction, props } from '@ngrx/store';
import { Guide, GuideDialogData } from '../types';

export const addOne = createAction('[guide] addOne', props<{ guide: Guide }>());

export const openGuideDialog = createAction(
  '[guide] openGuideDialog',
  props<{ data: GuideDialogData }>(),
);

export const removeOne = createAction(
  '[guide] removeOne',
  props<{ id: string }>(),
);

export const updateOne = createAction(
  '[guide] updateOne',
  props<{ id: string; changes: Partial<Guide> }>(),
);
