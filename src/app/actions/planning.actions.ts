import { createAction, props } from '@ngrx/store';
import {
  ActivityInstance,
  Adaptation,
  CreateActivityInstance,
  CreateAdaptation,
  CreatePlan,
  Plan,
  PlanDetail,
  TimeRange,
  UpdateActivityInstance,
} from '../types';

export const createActivityInstance = createAction(
  '[planning] createActivityInstance',
  props<{ activityInstance: CreateActivityInstance; planId: string }>(),
);

export const createActivityInstanceFailure = createAction(
  '[planning] createActivityInstanceFailure',
  props<{ errorMsg: string }>(),
);

export const createActivityInstanceSuccess = createAction(
  '[planning] createActivityInstanceSuccess',
  props<{ activityInstance: ActivityInstance }>(),
);

export const createAdaptation = createAction(
  '[planning] createAdaptation',
  props<{ adaptation: CreateAdaptation }>(),
);

export const createAdaptationSuccess = createAction(
  '[planning] createAdaptationSuccess',
  props<{ adaptation: Adaptation }>(),
);

export const createPlan = createAction(
  '[planning] createPlan',
  props<{ plan: CreatePlan }>(),
);

export const createPlanSuccess = createAction(
  '[planning] createPlanSuccess',
  props<{ plan: Plan }>(),
);

export const deleteActivityInstance = createAction(
  '[planning] deleteActivityInstance',
  props<{ planId: string; activityInstanceId: string }>(),
);

export const deleteActivityInstanceSuccess = createAction(
  '[planning] deleteActivityInstanceSuccess',
  props<{ activityInstanceId: string }>(),
);

export const deleteAdaptation = createAction(
  '[planning] deleteAdaptation',
  props<{ id: string }>(),
);

export const deleteAdaptationSuccess = createAction(
  '[planning] deleteAdaptationSuccess',
  props<{ id: string }>(),
);

export const deletePlan = createAction(
  '[planning] deletePlan',
  props<{ id: string }>(),
);

export const deletePlanSuccess = createAction(
  '[planning] deletePlanSuccess',
  props<{ id: string }>(),
);

export const getAdaptationsSuccess = createAction(
  '[planning] getAdaptationsSuccess',
  props<{ adaptations: Adaptation[] }>(),
);

export const getPlanDetailSuccess = createAction(
  '[planning] getPlanDetailSuccess',
  props<{ plan: PlanDetail }>(),
);

export const getPlansSuccess = createAction(
  '[planning] getPlansSuccess',
  props<{ plans: Plan[] }>(),
);

export const restoreViewTimeRange = createAction(
  '[timeline] restoreViewTimeRange',
);

export const setSelectedActivityInstanceId = createAction(
  '[planning] setSelectedActivityInstanceId',
  props<{
    keepSelected?: boolean;
    selectedActivityInstanceId: string | null;
  }>(),
);

export const updateActivityInstance = createAction(
  '[planning] updateActivityInstance',
  props<{
    activityInstance: UpdateActivityInstance;
    planId: string;
  }>(),
);

export const updateActivityInstanceFailure = createAction(
  '[planning] updateActivityInstanceFailure',
  props<{ errorMsg: string }>(),
);

export const updateActivityInstanceSuccess = createAction(
  '[planning] updateActivityInstanceSuccess',
  props<{ activityInstance: UpdateActivityInstance }>(),
);

export const updateViewTimeRange = createAction(
  '[planning] updateViewTimeRange',
  props<{ viewTimeRange: TimeRange }>(),
);
