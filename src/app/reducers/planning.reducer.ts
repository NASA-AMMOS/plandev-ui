import { createReducer, on } from '@ngrx/store';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import {
  CActivityInstanceMap,
  CActivityInstanceParameterMap,
  CActivityTypeMap,
  CAdaptationMap,
  CPlan,
  CPlanMap,
  StringTMap,
} from '../types';

export interface PlanningState {
  activityInstances: CActivityInstanceMap | null;
  activityTypes: CActivityTypeMap | null;
  adaptations: CAdaptationMap | null;
  createActivityInstanceError: string | null;
  plans: CPlanMap | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: CPlan | null;
  updateActivityInstanceError: string | null;
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
      [action.activityInstanceId]: {
        ...action.activityInstance,
        id: action.activityInstanceId,
        parameters: toActivityInstanceParameterMap(
          action.activityInstance.parameters,
        ),
      },
    },
    selectedPlan: {
      ...state.selectedPlan,
      activityInstanceIds: state.selectedPlan.activityInstanceIds.concat(
        action.activityInstanceId,
      ),
    },
  })),
  on(PlanningActions.createAdaptationSuccess, (state, action) => ({
    ...state,
    adaptations: {
      ...state.adaptations,
      [action.id]: {
        ...omit(action.adaptation, 'file'),
        id: action.id,
      },
    },
  })),
  on(PlanningActions.createPlanSuccess, (state, action) => ({
    ...state,
    plans: {
      ...state.plans,
      [action.id]: {
        ...omit(action.plan, 'activityInstances'),
        activityInstanceIds: [],
        id: action.id,
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
  on(PlanningActions.deleteAdaptationSuccess, (state, action) => ({
    ...state,
    adaptations: omit(state.adaptations, action.id),
  })),
  on(PlanningActions.deletePlanSuccess, (state, action) => ({
    ...state,
    plans: omit(state.plans, action.id),
  })),
  on(PlanningActions.setActivityInstances, (state, { activityInstances }) => ({
    ...state,
    activityInstances,
  })),
  on(PlanningActions.setAdaptations, (state, { adaptations }) => ({
    ...state,
    adaptations,
  })),
  on(PlanningActions.setPlans, (state, { plans }) => ({
    ...state,
    plans,
  })),
  on(
    PlanningActions.setSelectedActivityInstanceId,
    (state, { keepSelected, selectedActivityInstanceId }) => {
      if (
        !keepSelected &&
        state.selectedActivityInstanceId === selectedActivityInstanceId
      ) {
        return {
          ...state,
          selectedActivityInstanceId: null,
        };
      } else {
        return {
          ...state,
          selectedActivityInstanceId,
        };
      }
    },
  ),
  on(
    PlanningActions.setSelectedPlanAndActivityTypes,
    (state, { activityTypes, selectedPlan }) => ({
      ...state,
      activityTypes,
      selectedPlan,
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
  on(PlanningActions.updateActivityInstanceProps, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstanceId]: {
        ...state.activityInstances[action.activityInstanceId],
        ...action.props,
      },
    },
  })),
  on(PlanningActions.updateActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstanceId]: {
        ...state.activityInstances[action.activityInstanceId],
        ...action.activityInstance,
        parameters: action.activityInstance.parameters
          ? toActivityInstanceParameterMap(action.activityInstance.parameters)
          : state.activityInstances[action.activityInstanceId].parameters,
      },
    },
  })),
);

function toActivityInstanceParameterMap(
  parameters: StringTMap<any> = {},
): CActivityInstanceParameterMap {
  return Object.keys(parameters).reduce(
    (
      cActivityInstanceParameterMap: CActivityInstanceParameterMap,
      name: string,
    ) => {
      cActivityInstanceParameterMap[name] = {
        name,
        value: parameters[name],
      };
      return cActivityInstanceParameterMap;
    },
    {},
  );
}
