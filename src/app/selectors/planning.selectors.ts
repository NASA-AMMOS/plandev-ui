import { createFeatureSelector, createSelector } from '@ngrx/store';
import { compare, getUnixEpochTime } from '../functions';
import { PlanningState } from '../reducers/planning.reducer';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Band,
  Guide,
  Plan,
  SubBandActivity,
  TimeRange,
} from '../types';
import { getGuides } from './guide.selectors';

export const getPlanningState = createFeatureSelector<PlanningState>(
  'planning',
);

export const getActivityInstances = createSelector(
  getPlanningState,
  (state: PlanningState): ActivityInstance[] | null =>
    state.activityInstances
      ? Object.values(state.activityInstances).sort((a, b) =>
          compare(
            getUnixEpochTime(a.startTimestamp),
            getUnixEpochTime(b.startTimestamp),
            true,
          ),
        )
      : null,
);

export const getSelectedActivityInstanceId = createSelector(
  getPlanningState,
  (state: PlanningState): string | null => state.selectedActivityInstanceId,
);

export const getScheduleBands = createSelector(
  getActivityInstances,
  getSelectedActivityInstanceId,
  getGuides,
  (
    activityInstances: ActivityInstance[] | null,
    selectedActivityInstanceId: string | null,
    guides: Guide[],
  ): Band[] => {
    const id = 'activity-band-0';
    const points = (activityInstances || []).map(point => ({
      duration: 0,
      id: point.id,
      label: {
        text: point.type,
      },
      selected: selectedActivityInstanceId === point.id,
      type: 'activity',
      x: getUnixEpochTime(point.startTimestamp),
    }));
    const horizontalGuides = guides.filter(guide => guide.bandId === id);

    return [
      {
        horizontalGuides,
        id,
        subBands: [
          {
            id: 'activity-subBand-0',
            points,
            type: 'activity',
          } as SubBandActivity,
        ],
        type: 'schedule',
      },
    ];
  },
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

export const getPlans = createSelector(
  getPlanningState,
  (state: PlanningState): Plan[] | null =>
    state.plans ? Object.values(state.plans) : null,
);

export const getSelectedActivityInstance = createSelector(
  getActivityInstances,
  getSelectedActivityInstanceId,
  (
    activityInstances: ActivityInstance[] | null,
    selectedActivityInstanceId: string | null,
  ) => {
    if (activityInstances && selectedActivityInstanceId) {
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

export const getViewTimeRange = createSelector(
  getPlanningState,
  (state: PlanningState): TimeRange => state.viewTimeRange,
);
