import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import { getUnixEpochTime } from '../functions';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Plan,
  StringTMap,
  TimeRange,
} from '../types';

export interface PlanningState {
  activityInstances: StringTMap<ActivityInstance> | null;
  activityTypes: StringTMap<ActivityType> | null;
  adaptations: StringTMap<Adaptation> | null;
  createActivityInstanceError: string | null;
  plans: StringTMap<Plan> | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: Plan | null;
  updateActivityInstanceError: string | null;
  viewTimeRange: TimeRange;
}

export const initialState: PlanningState = {
  activityInstances: null,
  activityTypes: null,
  adaptations: null,
  createActivityInstanceError: null,
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  updateActivityInstanceError: null,
  viewTimeRange: { start: 0, end: 0 },
};

export const reducer = createReducer(
  initialState,
  on(PlanningActions.createActivityInstance, state => ({
    ...state,
    createActivityInstanceError: null,
  })),
  on(PlanningActions.createActivityInstanceFailure, (state, action) => ({
    ...state,
    createActivityInstanceError: action.errorMsg,
  })),
  on(PlanningActions.createActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstance.id]: {
        ...action.activityInstance,
      },
    },
  })),
  on(PlanningActions.createAdaptationSuccess, (state, action) => ({
    ...state,
    adaptations: {
      ...state.adaptations,
      [action.adaptation.id]: {
        ...action.adaptation,
      },
    },
  })),
  on(PlanningActions.createPlanSuccess, (state, action) => ({
    ...state,
    plans: {
      ...state.plans,
      [action.plan.id]: {
        ...action.plan,
      },
    },
  })),
  on(PlanningActions.deleteActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: omit(state.activityInstances, action.activityInstanceId),
    selectedActivityInstanceId:
      state.selectedActivityInstanceId === action.activityInstanceId
        ? null
        : state.selectedActivityInstanceId,
  })),
  on(PlanningActions.deleteAdaptationSuccess, (state, { id }) => ({
    ...state,
    adaptations: omit(state.adaptations, id),
  })),
  on(PlanningActions.deletePlanSuccess, (state, { id }) => ({
    ...state,
    plans: omit(state.plans, id),
  })),
  on(PlanningActions.getAdaptationsSuccess, (state, { adaptations }) => ({
    ...state,
    adaptations: keyBy(adaptations, 'id'),
  })),
  on(PlanningActions.getPlanDetailSuccess, (state, { plan }) => ({
    ...state,
    activityInstances: keyBy(plan.activityInstances, 'id'),
    activityTypes: keyBy(plan.adaptation.activityTypes, 'name'),
    selectedPlan: omit(plan, ['activityInstances', 'adaptation']),
    viewTimeRange: {
      end: getUnixEpochTime(plan.endTimestamp),
      start: getUnixEpochTime(plan.startTimestamp),
    },
  })),
  on(PlanningActions.getPlansSuccess, (state, { plans }) => ({
    ...state,
    plans: keyBy(plans, 'id'),
  })),
  on(PlanningActions.restoreViewTimeRange, state => ({
    ...state,
    viewTimeRange: {
      end: getUnixEpochTime(state.selectedPlan.endTimestamp),
      start: getUnixEpochTime(state.selectedPlan.startTimestamp),
    },
  })),
  on(
    PlanningActions.setSelectedActivityInstanceId,
    (state, { keepSelected, selectedActivityInstanceId: id }) => ({
      ...state,
      selectedActivityInstanceId:
        !keepSelected && state.selectedActivityInstanceId === id ? null : id,
    }),
  ),
  on(PlanningActions.updateActivityInstance, state => ({
    ...state,
    updateActivityInstanceError: null,
  })),
  on(PlanningActions.updateActivityInstanceFailure, (state, action) => ({
    ...state,
    updateActivityInstanceError: action.errorMsg,
  })),
  on(PlanningActions.updateActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstance.id]: {
        ...state.activityInstances[action.activityInstance.id],
        ...action.activityInstance,
      },
    },
  })),
  on(PlanningActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
);
