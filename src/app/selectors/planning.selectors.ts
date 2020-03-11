import { createFeatureSelector, createSelector } from '@ngrx/store';
import { compare, getUnixEpochTime } from '../functions';
import { PlanningState } from '../reducers/planning.reducer';
import {
  Band,
  CActivityInstance,
  CActivityInstanceMap,
  CActivityType,
  CActivityTypeMap,
  CAdaptation,
  CPlan,
  SubBandActivity,
  TimeRange,
} from '../types';

export const getPlanningState = createFeatureSelector<PlanningState>(
  'planning',
);

export const getActivityInstancesMap = createSelector(
  getPlanningState,
  (state: PlanningState): CActivityInstanceMap => state.activityInstances,
);

export const getActivityInstances = createSelector(
  getActivityInstancesMap,
  (activityInstanceMap: CActivityInstanceMap | null) =>
    activityInstanceMap
      ? Object.values(activityInstanceMap).sort((a, b) =>
          compare(
            getUnixEpochTime(a.startTimestamp),
            getUnixEpochTime(b.startTimestamp),
            true,
          ),
        )
      : [],
);

export const getSelectedActivityInstanceId = createSelector(
  getPlanningState,
  (state: PlanningState): string | null => state.selectedActivityInstanceId,
);

export const getScheduleBands = createSelector(
  getActivityInstances,
  getSelectedActivityInstanceId,
  (
    activityInstances: CActivityInstance[],
    selectedActivityInstanceId: string | null,
  ): Band[] => [
    {
      height: 200,
      id: 'band0',
      order: 0,
      subBands: [
        {
          id: 'band0subBand0',
          layout: 'waterfall',
          points: activityInstances.map(point => ({
            color: '#d651ff',
            duration: 0,
            id: point.id,
            labelAlign: 'start',
            labelBaseline: 'alphabetic',
            labelFillColor: '#000000',
            labelFont: 'Georgia',
            labelFontSize: 12,
            labelHidden: false,
            labelText: point.type,
            selected: selectedActivityInstanceId === point.id,
            type: 'activity',
            x: getUnixEpochTime(point.startTimestamp),
          })),
          type: 'activity',
        } as SubBandActivity,
      ],
      type: 'schedule',
      yAxes: [],
    },
  ],
);

export const getActivityInstancesForSelectedPlan = createSelector(
  getPlanningState,
  (state: PlanningState): CActivityInstance[] | null => {
    if (state.selectedPlan && state.activityInstances) {
      const activityInstances = state.selectedPlan.activityInstanceIds.reduce(
        (instances, id) => {
          const activityInstance = state.activityInstances[id];
          if (activityInstance) {
            instances.push(activityInstance);
          }
          return instances;
        },
        [],
      );

      const sortedActivityInstances = activityInstances.sort((a, b) =>
        compare(
          getUnixEpochTime(a.startTimestamp),
          getUnixEpochTime(b.startTimestamp),
          true,
        ),
      );

      return sortedActivityInstances;
    }
    return null;
  },
);

export const getActivityTypes = createSelector(
  getPlanningState,
  (state: PlanningState): CActivityType[] | null =>
    state.activityTypes ? Object.values(state.activityTypes) : null,
);

export const getActivityTypesMap = createSelector(
  getPlanningState,
  (state: PlanningState): CActivityTypeMap | null => state.activityTypes,
);

export const getAdaptations = createSelector(
  getPlanningState,
  (state: PlanningState): CAdaptation[] | null =>
    state.adaptations ? Object.values(state.adaptations) : null,
);

export const getCreateActivityInstanceError = createSelector(
  getPlanningState,
  (state: PlanningState): string | null => state.createActivityInstanceError,
);

export const getPlans = createSelector(
  getPlanningState,
  (state: PlanningState): CPlan[] | null =>
    state.plans ? Object.values(state.plans) : null,
);

export const getSelectedActivityInstance = createSelector(
  getActivityInstancesMap,
  getSelectedActivityInstanceId,
  (
    activityInstances: CActivityInstanceMap | null,
    selectedActivityInstanceId: string | null,
  ) => {
    if (
      activityInstances &&
      selectedActivityInstanceId &&
      activityInstances[selectedActivityInstanceId]
    ) {
      return activityInstances[selectedActivityInstanceId];
    }
    return null;
  },
);

export const getSelectedPlan = createSelector(
  getPlanningState,
  (state: PlanningState): CPlan | null => state.selectedPlan,
);

export const getMaxTimeRange = createSelector(
  getSelectedPlan,
  (plan: CPlan | null): TimeRange => {
    if (plan) {
      return {
        end: getUnixEpochTime(plan.endTimestamp),
        start: getUnixEpochTime(plan.startTimestamp),
      };
    }
    return { start: 0, end: 0 };
  },
);

export const getUpdateActivityInstanceError = createSelector(
  getPlanningState,
  (state: PlanningState): string | null => state.updateActivityInstanceError,
);
