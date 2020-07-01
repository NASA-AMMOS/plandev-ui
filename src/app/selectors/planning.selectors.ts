import { createFeatureSelector, createSelector } from '@ngrx/store';
import { compare, getUnixEpochTime } from '../functions';
import { PlanningState } from '../reducers/planning.reducer';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Panel,
  Plan,
  PointLine,
  SimulationResult,
  StringTMap,
  TimeRange,
  Violation,
} from '../types';

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

export const getConstraintViolations = createSelector(
  getPlanningState,
  (state: PlanningState): Violation[] =>
    state.constraintViolations?.map(constraintViolation => ({
      ...constraintViolation,
      windows: constraintViolation.windows.map(({ end, start }) => {
        const planStart = getUnixEpochTime(state.selectedPlan.startTimestamp);
        return {
          end: planStart + end / 1000,
          start: planStart + start / 1000,
        };
      }),
    })) || [],
);

export const getSimulationResults = createSelector(
  getPlanningState,
  (state: PlanningState): SimulationResult[] => state.simulationResults || [],
);

export const getPanels = createSelector(
  getPlanningState,
  (state: PlanningState) => state.panels,
);

export const getPanelsWithPoints = createSelector(
  getActivityInstances,
  getConstraintViolations,
  getPanels,
  getSelectedActivityInstanceId,
  getSimulationResults,
  (
    activityInstances: ActivityInstance[] | null,
    constraintViolations: Violation[],
    panels: Panel[],
    selectedActivityInstanceId: string | null,
    simulationResults: SimulationResult[],
  ) => {
    return panels.map(panel => {
      const panelConstraintViolations: Violation[] = [];

      if (panel.bands) {
        const bands = panel.bands.map(band => {
          const yAxisIdToScaleDomain: StringTMap<number[]> = {};
          const bandConstraintViolations: Violation[] = [];
          const subBands = band.subBands.map(subBand => {
            if (subBand.type === 'activity') {
              const activities = activityInstances || [];
              const points = activities.reduce((newPoints, point) => {
                const r = new RegExp(subBand?.filter?.activity?.type);
                const includePoint = r.test(point.type);
                if (includePoint) {
                  newPoints.push({
                    duration: 0,
                    id: point.id,
                    label: {
                      text: point.type,
                    },
                    selected: selectedActivityInstanceId === point.id,
                    type: 'activity',
                    x: getUnixEpochTime(point.startTimestamp),
                  });
                }
                return newPoints;
              }, []);
              return {
                ...subBand,
                points,
              };
            }

            if (subBand.type === 'state') {
              const points: PointLine[] = [];
              const yAxisId = `axis-${subBand.id}`;
              let minY = Number.MAX_SAFE_INTEGER;
              let maxY = Number.MIN_SAFE_INTEGER;
              if (simulationResults && simulationResults.length) {
                for (const { name, start, values } of simulationResults) {
                  const r = new RegExp(subBand?.filter?.state?.name);
                  const includeResult = r.test(name);
                  if (includeResult) {
                    // Find constraint violations for this result.
                    for (const constraintViolation of constraintViolations) {
                      const { associations } = constraintViolation;
                      if (
                        associations.stateIds &&
                        associations.stateIds.find(id => id === name)
                      ) {
                        bandConstraintViolations.push({
                          ...constraintViolation,
                        });
                        panelConstraintViolations.push({
                          ...constraintViolation,
                        });
                      }
                    }

                    // Map result values into points that can be displayed.
                    for (let i = 0; i < values.length; ++i) {
                      const { x, y } = values[i];
                      points.push({
                        id: `${subBand.id}-state-${name}-${i}`,
                        type: 'line',
                        x: getUnixEpochTime(start) + x / 1000,
                        y,
                      });
                      minY = y < minY ? y : minY;
                      maxY = y > maxY ? y : maxY;
                    }
                  }
                }

                if (minY === maxY) {
                  // If extents are equal, clip first extent to 0
                  // so axis and line gets properly drawn by D3.
                  minY = 0;
                }

                yAxisIdToScaleDomain[yAxisId] = [minY, maxY];
              }
              return {
                ...subBand,
                points,
                yAxisId,
              };
            }

            return subBand;
          });

          return {
            ...band,
            constraintViolations: bandConstraintViolations,
            subBands,
            yAxes: (band.yAxes || []).map(axis => ({
              ...axis,
              scaleDomain: yAxisIdToScaleDomain[axis.id] || [],
            })),
          };
        });
        return {
          ...panel,
          bands,
          constraintViolations: panelConstraintViolations,
        };
      }

      return panel;
    });
  },
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
