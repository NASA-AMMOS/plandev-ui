import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import uniqBy from 'lodash-es/uniqBy';
import { compare } from '../functions';
import { PlanningState } from '../reducers/planning.reducer';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  DecompositionTreeState,
  Plan,
  PointLine,
  SimulationResult,
  StringTMap,
  TimeRange,
  UiState,
  Violation,
  ViolationListState,
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
  (state: PlanningState): Violation[] => state.constraintViolations || [],
);

export const getDecompositionTreeState = createSelector(
  getPlanningState,
  (state: PlanningState): DecompositionTreeState =>
    state.decompositionTreeState,
);

export const getViolationListState = createSelector(
  getPlanningState,
  (state: PlanningState): ViolationListState => state.violationListState,
);

export const getConstraintViolationsByCategory = createSelector(
  getConstraintViolations,
  (violations: Violation[]): StringTMap<Violation[]> | null => {
    const categories = violations.reduce((categoryMap, violation) => {
      const { constraint } = violation;
      const { category } = constraint;
      const prevViolations = categoryMap[category] || [];
      categoryMap[category] = [...prevViolations, violation];
      return categoryMap;
    }, {});
    if (Object.keys(categories).length === 0) {
      return null;
    }
    return categories;
  },
);

export const getSelectedPlan = createSelector(
  getPlanningState,
  (state: PlanningState): Plan | null => state.selectedPlan,
);

export const getIdsToViolations = createSelector(
  getConstraintViolations,
  getViolationListState,
  (
    constraintViolations: Violation[],
    violationListState: ViolationListState,
  ): StringTMap<Violation[]> => {
    if (constraintViolations) {
      return constraintViolations.reduce((idsToViolations, violation) => {
        const { constraint } = violation;
        const { category, name } = constraint;
        if (violationListState.category[category].visible) {
          for (const associationType of Object.keys(violation.associations)) {
            if (associationType !== '__typename') {
              for (const id of violation.associations[associationType]) {
                if (violationListState.constraint[name].visible) {
                  idsToViolations[id] = [
                    ...(idsToViolations[id] || []),
                    violation,
                  ];
                }
              }
            }
          }
        }
        return idsToViolations;
      }, {});
    }
    return {};
  },
);

export const getSimulationResults = createSelector(
  getPlanningState,
  (state: PlanningState): SimulationResult[] => state.simulationResults || [],
);

export const getUiStates = createSelector(
  getPlanningState,
  (state: PlanningState) => state.uiStates,
);

export const getSelectedUiStateId = createSelector(
  getPlanningState,
  (state: PlanningState) => state.selectedUiStateId,
);

export const getSelectedUiState = createSelector(
  getUiStates,
  getSelectedUiStateId,
  (uiStates: UiState[], selectedUiStateId: string) =>
    uiStates.find(({ id }) => id === selectedUiStateId) || null,
);

export const getPanelsWithPoints = createSelector(
  getActivityInstances,
  getIdsToViolations,
  getSelectedActivityInstanceId,
  getSelectedUiState,
  getSimulationResults,
  (
    activityInstances: ActivityInstance[] | null,
    idsToViolations: StringTMap<Violation[]>,
    selectedActivityInstanceId: string | null,
    uiState: UiState,
    simulationResults: SimulationResult[],
  ) => {
    if (uiState) {
      return uiState.panels.map(panel => {
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
                    if (idsToViolations[point.id]) {
                      bandConstraintViolations.push(
                        ...idsToViolations[point.id],
                      );
                      panelConstraintViolations.push(
                        ...idsToViolations[point.id],
                      );
                    }

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
                const yAxisId = subBand?.yAxisId || `axis-${subBand.id}`;
                let minY = Number.MAX_SAFE_INTEGER;
                let maxY = Number.MIN_SAFE_INTEGER;
                if (simulationResults && simulationResults.length) {
                  for (const { name, start, values } of simulationResults) {
                    const r = new RegExp(subBand?.filter?.state?.name);
                    const includeResult = r.test(name);
                    if (includeResult) {
                      if (idsToViolations[name]) {
                        bandConstraintViolations.push(...idsToViolations[name]);
                        panelConstraintViolations.push(
                          ...idsToViolations[name],
                        );
                      }

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
              constraintViolations: uniqBy(
                bandConstraintViolations,
                ({ constraint: { name } }) => name,
              ),
              subBands,
              yAxes: (band.yAxes || []).map(axis => ({
                ...axis,
                scaleDomain:
                  axis?.scaleDomain || yAxisIdToScaleDomain[axis.id] || [],
              })),
            };
          });

          return {
            ...panel,
            bands,
            constraintViolations: uniqBy(
              panelConstraintViolations,
              ({ constraint: { name } }) => name,
            ),
          };
        }

        return panel;
      });
    }
    return [];
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
