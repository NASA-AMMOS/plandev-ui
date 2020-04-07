import { createAction, props } from '@ngrx/store';
import {
  CActivityInstance,
  CActivityInstanceMap,
  CActivityTypeMap,
  CAdaptationMap,
  CPlan,
  CPlanMap,
  SActivityInstance,
  SCreateAdaption,
  SPlan,
  TimeRange,
} from '../types';

export const createActivityInstance = createAction(
  '[planning] createActivityInstance',
  props<{ planId: string; activityInstance: SActivityInstance }>(),
);

export const createActivityInstanceFailure = createAction(
  '[planning] createActivityInstanceFailure',
  props<{ errorMsg: string }>(),
);

export const createActivityInstanceSuccess = createAction(
  '[planning] createActivityInstanceSuccess',
  props<{
    planId: string;
    activityInstanceId: string;
    activityInstance: SActivityInstance;
  }>(),
);

export const createAdaptation = createAction(
  '[planning] createAdaptation',
  props<{ adaptation: SCreateAdaption }>(),
);

export const createAdaptationSuccess = createAction(
  '[planning] createAdaptationSuccess',
  props<{ id: string; adaptation: SCreateAdaption }>(),
);

export const createPlan = createAction(
  '[planning] createPlan',
  props<{ plan: SPlan }>(),
);

export const createPlanSuccess = createAction(
  '[planning] createPlanSuccess',
  props<{ id: string; plan: SPlan }>(),
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

export const restoreViewTimeRange = createAction(
  '[timeline] restoreViewTimeRange',
);

export const setActivityInstances = createAction(
  '[planning] setActivityInstances',
  props<{ planId: string; activityInstances: CActivityInstanceMap }>(),
);

export const setAdaptations = createAction(
  '[planning] setAdaptations',
  props<{ adaptations: CAdaptationMap }>(),
);

export const setPlans = createAction(
  '[planning] setPlans',
  props<{ plans: CPlanMap }>(),
);

export const setSelectedActivityInstanceId = createAction(
  '[planning] setSelectedActivityInstanceId',
  props<{
    selectedActivityInstanceId: string | null;
    keepSelected?: boolean;
  }>(),
);

export const setSelectedPlanAndActivityTypes = createAction(
  '[planning] setSelectedPlanAndActivityTypes',
  props<{ selectedPlan: CPlan; activityTypes: CActivityTypeMap }>(),
);

export const updateActivityInstance = createAction(
  '[planning] updateActivityInstance',
  props<{
    planId: string;
    activityInstanceId: string;
    activityInstance: Partial<SActivityInstance>;
  }>(),
);

export const updateActivityInstanceFailure = createAction(
  '[planning] updateActivityInstanceFailure',
  props<{ errorMsg: string }>(),
);

export const updateActivityInstanceProps = createAction(
  '[planning] updateActivityInstanceProps',
  props<{ activityInstanceId: string; props: Partial<CActivityInstance> }>(),
);

export const updateActivityInstanceSuccess = createAction(
  '[planning] updateActivityInstanceSuccess',
  props<{
    activityInstanceId: string;
    activityInstance: Partial<SActivityInstance>;
  }>(),
);

export const updateViewTimeRange = createAction(
  '[planning] updateViewTimeRange',
  props<{ viewTimeRange: TimeRange }>(),
);
