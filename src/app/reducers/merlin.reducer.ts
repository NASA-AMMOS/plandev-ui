import { createReducer, on } from '@ngrx/store';
import omit from 'lodash-es/omit';
import { MerlinActions } from '../actions';
import { getUnixEpochTime } from '../functions';
import {
  CActivityInstanceMap,
  CActivityInstanceParameterMap,
  CActivityTypeMap,
  CAdaptationMap,
  CPlan,
  CPlanMap,
  StringTMap,
  TimeRange,
} from '../types';

export interface MerlinState {
  activityInstances: CActivityInstanceMap | null;
  activityTypes: CActivityTypeMap | null;
  adaptations: CAdaptationMap | null;
  loading: boolean;
  plans: CPlanMap | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: CPlan | null;
  viewTimeRange: TimeRange;
}

export const initialState: MerlinState = {
  activityInstances: null,
  activityTypes: null,
  adaptations: null,
  loading: false,
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  viewTimeRange: { start: 0, end: 0 },
};

export const reducer = createReducer(
  initialState,
  on(MerlinActions.createActivityInstanceSuccess, (state, action) => ({
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
  on(MerlinActions.createAdaptationSuccess, (state, action) => ({
    ...state,
    adaptations: {
      ...state.adaptations,
      [action.id]: {
        ...omit(action.adaptation, 'file'),
        id: action.id,
      },
    },
  })),
  on(MerlinActions.createPlanSuccess, (state, action) => ({
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
  on(MerlinActions.deleteActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: omit(state.activityInstances, action.activityInstanceId),
    selectedActivityInstanceId:
      state.selectedActivityInstanceId === action.activityInstanceId
        ? null
        : state.selectedActivityInstanceId,
  })),
  on(MerlinActions.deleteAdaptationSuccess, (state, action) => ({
    ...state,
    adaptations: omit(state.adaptations, action.id),
  })),
  on(MerlinActions.deletePlanSuccess, (state, action) => ({
    ...state,
    plans: omit(state.plans, action.id),
  })),
  on(MerlinActions.restoreViewTimeRange, state => {
    if (state.selectedPlan) {
      return {
        ...state,
        viewTimeRange: {
          end: getUnixEpochTime(state.selectedPlan.endTimestamp),
          start: getUnixEpochTime(state.selectedPlan.startTimestamp),
        },
      };
    } else {
      return state;
    }
  }),
  on(MerlinActions.setActivityInstances, (state, { activityInstances }) => ({
    ...state,
    activityInstances,
  })),
  on(MerlinActions.setAdaptations, (state, { adaptations }) => ({
    ...state,
    adaptations,
  })),
  on(MerlinActions.setLoading, (state, { loading }) => ({
    ...state,
    loading,
  })),
  on(MerlinActions.setPlans, (state, { plans }) => ({
    ...state,
    plans,
  })),
  on(
    MerlinActions.setSelectedActivityInstanceId,
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
    MerlinActions.setSelectedPlanAndActivityTypes,
    (state, { activityTypes, selectedPlan }) => ({
      ...state,
      activityTypes,
      selectedPlan,
      viewTimeRange: {
        end: getUnixEpochTime(selectedPlan.endTimestamp),
        start: getUnixEpochTime(selectedPlan.startTimestamp),
      },
    }),
  ),
  on(MerlinActions.updateActivityInstanceProps, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstanceId]: {
        ...state.activityInstances[action.activityInstanceId],
        ...action.props,
      },
    },
  })),
  on(MerlinActions.updateActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstanceId]: {
        ...state.activityInstances[action.activityInstanceId],
        ...action.activityInstance,
        parameters: toActivityInstanceParameterMap(
          action.activityInstance.parameters,
        ),
      },
    },
  })),
  on(MerlinActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
  on(MerlinActions.zoomInViewTimeRange, state => ({
    ...state,
    viewTimeRange: changeZoom(state.viewTimeRange, 10),
  })),
  on(MerlinActions.zoomOutViewTimeRange, state => {
    if (state.selectedPlan) {
      let { start, end } = changeZoom(state.viewTimeRange, -10);
      const selectedPlanStart = getUnixEpochTime(
        state.selectedPlan.startTimestamp,
      );
      const selectedPlanEnd = getUnixEpochTime(state.selectedPlan.endTimestamp);

      if (start < selectedPlanStart) {
        start = selectedPlanStart;
      }

      if (end > selectedPlanEnd) {
        end = selectedPlanEnd;
      }

      return {
        ...state,
        viewTimeRange: {
          end,
          start,
        },
      };
    } else {
      return state;
    }
  }),
);

function changeZoom(viewTimeRange: TimeRange, delta: number): TimeRange {
  const { end, start } = viewTimeRange;
  const range = end - start;
  const zoomAmount = range / delta;

  return {
    end: end - zoomAmount,
    start: start + zoomAmount,
  };
}

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
