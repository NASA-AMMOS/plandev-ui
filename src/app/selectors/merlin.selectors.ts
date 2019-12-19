import { createFeatureSelector, createSelector } from '@ngrx/store';
import { compare, getUnixEpochTime } from '../functions';
import { getLineBand } from '../mocks';
import { MerlinState } from '../reducers/merlin.reducer';
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

const getMerlinState = createFeatureSelector<MerlinState>('merlin');

export const getActivityInstancesMap = createSelector(
  getMerlinState,
  (state: MerlinState): CActivityInstanceMap => state.activityInstances,
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
  getMerlinState,
  (state: MerlinState): string | null => state.selectedActivityInstanceId,
);

export const getActivityInstancesBand = createSelector(
  getActivityInstances,
  getSelectedActivityInstanceId,
  (
    activityInstances: CActivityInstance[],
    selectedActivityInstanceId: string | null,
  ): Band => ({
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
    yAxis: {
      labelFillColor: '#000000',
      labelFontSize: 14,
      labelOffset: '-1.5em',
      labelText: 'Activity Instances',
      scaleDomain: [],
    },
  }),
);

export const getActivityInstancesForSelectedPlan = createSelector(
  getMerlinState,
  (state: MerlinState): CActivityInstance[] | null => {
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
  getMerlinState,
  (state: MerlinState): CActivityType[] | null =>
    state.activityTypes ? Object.values(state.activityTypes) : null,
);

export const getActivityTypesMap = createSelector(
  getMerlinState,
  (state: MerlinState): CActivityTypeMap | null => state.activityTypes,
);

export const getAdaptations = createSelector(
  getMerlinState,
  (state: MerlinState): CAdaptation[] | null =>
    state.adaptations ? Object.values(state.adaptations) : null,
);

export const getLoading = createSelector(
  getMerlinState,
  (state: MerlinState): boolean => state.loading,
);

export const getPlans = createSelector(getMerlinState, (state: MerlinState):
  | CPlan[]
  | null => (state.plans ? Object.values(state.plans) : null));

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
  getMerlinState,
  (state: MerlinState): CPlan | null => state.selectedPlan,
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

export const getStateBands = createSelector(
  getSelectedPlan,
  (selectedPlan: CPlan | null): Band[] => {
    if (selectedPlan) {
      return [getLineBand(selectedPlan)];
    }
    return [];
  },
);

export const getViewTimeRange = createSelector(
  getMerlinState,
  (state: MerlinState): TimeRange => state.viewTimeRange,
);
