import { createFeatureSelector, createSelector } from '@ngrx/store';
import { compare, getUnixEpochTime } from '../functions';
import { PlanningState } from '../reducers/planning.reducer';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Band,
  Plan,
  SubBandActivity,
  TimeRange,
} from '../types';

export const getPlanningState = createFeatureSelector<PlanningState>(
  'planning',
);

export const getActivityInstances = createSelector(
  getPlanningState,
  (state: PlanningState) =>
    state.activityInstances
      ? Object.values(state.activityInstances).sort((a, b) =>
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
    activityInstances: ActivityInstance[],
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

export const getActivityTypes = createSelector(
  getPlanningState,
  (state: PlanningState): ActivityType[] | null =>
    state.activityTypes ? Object.values(state.activityTypes) : null,
);

export const getAdaptations = createSelector(
  getPlanningState,
  (state: PlanningState): Adaptation[] | null =>
    state.adaptations ? Object.values(state.adaptations) : null,
);

export const getCreateActivityInstanceError = createSelector(
  getPlanningState,
  (state: PlanningState): string | null => state.createActivityInstanceError,
);

export const getPlans = createSelector(
  getPlanningState,
  (state: PlanningState): Plan[] | null =>
    state.plans ? Object.values(state.plans) : null,
);

export const getSelectedActivityInstance = createSelector(
  getActivityInstances,
  getSelectedActivityInstanceId,
  (
    activityInstances: ActivityInstance[],
    selectedActivityInstanceId: string | null,
  ) => {
    if (selectedActivityInstanceId) {
      const activityInstance = activityInstances.find(
        ({ id }) => id === selectedActivityInstanceId,
      );
      return activityInstance || null;
    }
    return null;
  },
);

export const getSelectedPlan = createSelector(
  getPlanningState,
  (state: PlanningState): Plan | null => state.selectedPlan,
);

export const getMaxTimeRange = createSelector(
  getSelectedPlan,
  (plan: Plan | null): TimeRange => {
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

export const getViewTimeRange = createSelector(
  getPlanningState,
  (state: PlanningState): TimeRange => state.viewTimeRange,
);
