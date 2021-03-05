import { createAction, props } from '@ngrx/store';
import {
  ActivityInstance,
  Adaptation,
  CreateActivityInstance,
  CreateAdaptation,
  CreatePlan,
  HorizontalGuide,
  HorizontalGuideEvent,
  Layer,
  LayerEvent,
  Plan,
  PlanDetail,
  Row,
  SimulationResponse,
  TimeRange,
  UpdateActivityInstance,
  VerticalGuide,
  VerticalGuideEvent,
  View,
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

export const deleteRow = createAction(
  '[planning] deleteRow',
  props<{ row: Row; timelineId: string }>(),
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

export const horizontalGuideCreate = createAction(
  '[planning] horizontalGuideCreate',
  props<{ guide: HorizontalGuide; rowId: string }>(),
);

export const horizontalGuideOpenDialog = createAction(
  '[planning] horizontalGuideOpenDialog',
  props<{ event: HorizontalGuideEvent }>(),
);

export const horizontalGuideDelete = createAction(
  '[planning] horizontalGuideDelete',
  props<{ guide: HorizontalGuide; rowId: string }>(),
);

export const horizontalGuideUpdate = createAction(
  '[planning] horizontalGuideUpdate',
  props<{ guide: HorizontalGuide; rowId: string }>(),
);

export const layerOpenDialog = createAction(
  '[planning] layerOpenDialog',
  props<{ event: LayerEvent }>(),
);

export const layerUpdate = createAction(
  '[planning] layerUpdate',
  props<{ layer: Layer; rowId: string }>(),
);

export const restoreViewTimeRange = createAction(
  '[planning] restoreViewTimeRange',
);

export const runSimulation = createAction(
  '[planning] runSimulation',
  props<{ planId: string }>(),
);

export const runSimulationFailure = createAction(
  '[planning] runSimulationFailure',
  props<{ errorMsg: string }>(),
);

export const runSimulationSuccess = createAction(
  '[planning] runSimulationSuccess',
  props<{ simulationResponse: SimulationResponse }>(),
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

export const updateAllViews = createAction(
  '[planning] updateAllViews',
  props<{ views: View[] }>(),
);

export const updateConstraintViolationListState = createAction(
  '[planning] updateConstraintViolationListState',
  props<{
    formType: 'category' | 'constraint';
    formValue: string;
    key: 'expanded' | 'visible';
    value: boolean;
  }>(),
);

export const updateDecompositionTreeState = createAction(
  '[planning] updateDecompositionTreeState',
  props<{
    formType: 'instance';
    formValue: string;
    key: 'expanded' | 'visible';
    value: boolean;
  }>(),
);

export const updateRow = createAction(
  '[planning] updateRow',
  props<{ rowId: string; update: any }>(),
);

export const updateSelectedViewId = createAction(
  '[planning] updateSelectedViewId',
  props<{ id: string }>(),
);

export const updateView = createAction(
  '[planning] updateView',
  props<{ id: string; view: Partial<View> }>(),
);

export const updateViewTimeRange = createAction(
  '[planning] updateViewTimeRange',
  props<{ viewTimeRange: TimeRange }>(),
);

export const verticalGuideCreate = createAction(
  '[planning] verticalGuideCreate',
  props<{ guide: VerticalGuide; timelineId: string }>(),
);

export const verticalGuideOpenDialog = createAction(
  '[planning] verticalGuideOpenDialog',
  props<{ event: VerticalGuideEvent }>(),
);

export const verticalGuideDelete = createAction(
  '[planning] verticalGuideDelete',
  props<{ guide: VerticalGuide; timelineId: string }>(),
);

export const verticalGuideUpdate = createAction(
  '[planning] verticalGuideUpdate',
  props<{ guide: VerticalGuide; timelineId: string }>(),
);
