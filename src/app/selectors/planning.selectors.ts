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
  PointActivity,
  PointLine,
  PointXRange,
  SimulationResult,
  StringTMap,
  TimeRange,
  UiState,
  Violation,
  ViolationListState,
} from '../types';

/**
 * Convert an activity instance to a point.
 */
function activityInstanceToPoint(
  activityInstance: ActivityInstance,
  selectedActivityInstanceId: string,
  activityInstancesMap: StringTMap<ActivityInstance> | null,
): PointActivity | null {
  if (activityInstance) {
    const point: PointActivity = {
      duration: activityInstance?.duration / 1000 || 0, // µs -> ms
      id: activityInstance.id,
      label: {
        text: activityInstance.type,
      },
      parent: activityInstance?.parent || null,
      selected: selectedActivityInstanceId === activityInstance.id,
      type: 'activity',
      x: getUnixEpochTime(activityInstance.startTimestamp),
    };

    if (activityInstance?.children?.length) {
      point.children = activityInstance.children.reduce(
        (children: PointActivity[], childId: string) => {
          const childActivityInstance = activityInstancesMap[childId];
          if (childActivityInstance) {
            const newChild = activityInstanceToPoint(
              childActivityInstance,
              selectedActivityInstanceId,
              activityInstancesMap,
            );
            if (newChild) {
              children.push(newChild);
            }
          }
          return children;
        },
        [],
      );
      point.children = point.children.sort((a, b) => compare(a.x, b.x, true));
    }

    return point;
  }
  return null;
}

export const getPlanningState = createFeatureSelector<PlanningState>(
  'planning',
);

export const getActivityInstancesMap = createSelector(
  getPlanningState,
  (state: PlanningState): StringTMap<ActivityInstance> =>
    state.activityInstances,
);

export const getActivityInstances = createSelector(
  getActivityInstancesMap,
  (
    activityInstances: StringTMap<ActivityInstance> | null,
  ): ActivityInstance[] | null =>
    activityInstances
      ? Object.values(activityInstances).sort((a, b) =>
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

export const getLastActivityInstanceUpdate = createSelector(
  getPlanningState,
  (state: PlanningState): number => state.lastActivityInstanceUpdate,
);

export const getLastSimulationTime = createSelector(
  getPlanningState,
  (state: PlanningState): number => state.lastSimulationTime,
);

export const getSimulationOutOfDate = createSelector(
  getLastActivityInstanceUpdate,
  getLastSimulationTime,
  (lastActivityInstanceUpdate: number, lastSimulationTime: number) =>
    lastActivityInstanceUpdate > lastSimulationTime,
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
  getActivityInstancesMap,
  getIdsToViolations,
  getSelectedActivityInstanceId,
  getSelectedUiState,
  getSimulationResults,
  (
    activityInstances: ActivityInstance[] | null,
    activityInstancesMap: StringTMap<ActivityInstance> | null,
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
                  if (
                    includePoint &&
                    (point.parent === null || point.parent === undefined)
                  ) {
                    if (idsToViolations[point.id]) {
                      bandConstraintViolations.push(
                        ...idsToViolations[point.id],
                      );
                      panelConstraintViolations.push(
                        ...idsToViolations[point.id],
                      );
                    }

                    const activityPoint = activityInstanceToPoint(
                      point,
                      selectedActivityInstanceId,
                      activityInstancesMap,
                    );
                    newPoints.push(activityPoint);
                  }
                  return newPoints;
                }, []);
                return {
                  ...subBand,
                  points,
                };
              }

              if (subBand.type === 'state') {
                if (subBand.chartType === 'line') {
                  const points: PointLine[] = [];
                  const yAxisId = subBand?.yAxisId || `axis-${subBand.id}`;

                  let minY = Number.MAX_SAFE_INTEGER;
                  let maxY = Number.MIN_SAFE_INTEGER;
                  if (simulationResults && simulationResults.length) {
                    for (const {
                      name,
                      schema,
                      start,
                      values,
                    } of simulationResults) {
                      if (schema.type === 'real') {
                        const r = new RegExp(subBand?.filter?.state?.name);
                        const includeResult = r.test(name);
                        if (includeResult) {
                          if (idsToViolations[name]) {
                            bandConstraintViolations.push(
                              ...idsToViolations[name],
                            );
                            panelConstraintViolations.push(
                              ...idsToViolations[name],
                            );
                          }

                          for (let i = 0; i < values.length; ++i) {
                            const value = values[i];
                            const { x } = value;
                            const y = value.y as number;
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
                } else if (subBand.chartType === 'x-range') {
                  const points: PointXRange[] = [];
                  const yAxisId = subBand?.yAxisId || `axis-${subBand.id}`;

                  if (simulationResults && simulationResults.length) {
                    for (const {
                      name,
                      schema,
                      start,
                      values,
                    } of simulationResults) {
                      if (schema.type === 'variant') {
                        const r = new RegExp(subBand?.filter?.state?.name);
                        const includeResult = r.test(name);
                        if (includeResult) {
                          if (idsToViolations[name]) {
                            bandConstraintViolations.push(
                              ...idsToViolations[name],
                            );
                            panelConstraintViolations.push(
                              ...idsToViolations[name],
                            );
                          }

                          for (let i = 0; i < values.length; ++i) {
                            const { x, y } = values[i];
                            points.push({
                              duration: 0,
                              id: `${subBand.id}-state-${name}-${i}`,
                              label: {
                                text: y as string,
                              },
                              type: 'x-range',
                              x: getUnixEpochTime(start) + x / 1000,
                            });
                          }
                        }
                      }
                    }
                  }

                  return {
                    ...subBand,
                    points,
                    yAxisId,
                  };
                }
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
