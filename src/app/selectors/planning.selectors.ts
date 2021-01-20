import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import uniqBy from 'lodash-es/uniqBy';
import { PlanningState } from '../reducers/planning.reducer';
import {
  ActivityInstance,
  ActivityPoint,
  ActivityType,
  Adaptation,
  ConstraintViolation,
  DecompositionTreeState,
  LinePoint,
  Plan,
  SimulationResult,
  StringTMap,
  TimeRange,
  UiState,
  ViolationListState,
  XRangePoint,
} from '../types';

function compare(
  a: number | string,
  b: number | string,
  isAsc: boolean,
): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

/**
 * Convert an activity instance to a point.
 */
function activityInstanceToPoint(
  activityInstance: ActivityInstance,
  selectedActivityInstanceId: string,
  activityInstancesMap: StringTMap<ActivityInstance> | null,
): ActivityPoint | null {
  if (activityInstance) {
    const point: ActivityPoint = {
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
        (children: ActivityPoint[], childId: string) => {
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

export const getAdaptationId = createSelector(
  getPlanningState,
  (state: PlanningState): string | null =>
    state.selectedPlan?.adaptationId || '',
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

export const getDecompositionTreeState = createSelector(
  getPlanningState,
  (state: PlanningState): DecompositionTreeState =>
    state.decompositionTreeState,
);

export const getViolationListState = createSelector(
  getPlanningState,
  (state: PlanningState): ViolationListState => state.violationListState,
);

export const getViolations = createSelector(
  getPlanningState,
  (state: PlanningState): ConstraintViolation[] => state.violations || [],
);

export const getViolationsByCategory = createSelector(
  getViolations,
  (
    violations: ConstraintViolation[],
  ): StringTMap<ConstraintViolation[]> | null => {
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
  getViolations,
  getViolationListState,
  (
    violations: ConstraintViolation[],
    violationListState: ViolationListState,
  ): StringTMap<ConstraintViolation[]> => {
    if (violations) {
      return violations.reduce((idsToViolations, violation) => {
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
    idsToViolations: StringTMap<ConstraintViolation[]>,
    selectedActivityInstanceId: string | null,
    uiState: UiState,
    simulationResults: SimulationResult[],
  ) => {
    if (uiState) {
      return uiState.panels.map(panel => {
        const panelViolations: ConstraintViolation[] = [];

        if (panel.timeline) {
          const rows = panel.timeline.rows.map(row => {
            const yAxisIdToScaleDomain: StringTMap<number[]> = {};
            const rowViolations: ConstraintViolation[] = [];
            const layers = row.layers.map(layer => {
              if (layer.type === 'activity') {
                const activities = activityInstances || [];
                const points = activities.reduce((newPoints, point) => {
                  const r = new RegExp(layer?.filter?.activity?.type);
                  const includePoint = r.test(point.type);
                  if (
                    includePoint &&
                    (point.parent === null || point.parent === undefined)
                  ) {
                    if (idsToViolations[point.id]) {
                      rowViolations.push(...idsToViolations[point.id]);
                      panelViolations.push(...idsToViolations[point.id]);
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
                  ...layer,
                  points,
                };
              }

              if (layer.type === 'state') {
                if (layer.chartType === 'line') {
                  const points: LinePoint[] = [];
                  const yAxisId = layer?.yAxisId || `axis-${layer.id}`;

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
                        const r = new RegExp(layer?.filter?.state?.name);
                        const includeResult = r.test(name);
                        if (includeResult) {
                          if (idsToViolations[name]) {
                            rowViolations.push(...idsToViolations[name]);
                            panelViolations.push(...idsToViolations[name]);
                          }

                          for (let i = 0; i < values.length; ++i) {
                            const value = values[i];
                            const { x } = value;
                            const y = value.y as number;
                            points.push({
                              id: `${layer.id}-state-${name}-${i}`,
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
                    ...layer,
                    points,
                    yAxisId,
                  };
                } else if (layer.chartType === 'x-range') {
                  const points: XRangePoint[] = [];
                  const yAxisId = layer?.yAxisId || `axis-${layer.id}`;

                  if (simulationResults && simulationResults.length) {
                    for (const {
                      name,
                      schema,
                      start,
                      values,
                    } of simulationResults) {
                      if (schema.type === 'variant') {
                        const r = new RegExp(layer?.filter?.state?.name);
                        const includeResult = r.test(name);
                        if (includeResult) {
                          if (idsToViolations[name]) {
                            rowViolations.push(...idsToViolations[name]);
                            panelViolations.push(...idsToViolations[name]);
                          }

                          for (let i = 0; i < values.length; ++i) {
                            const { x, y } = values[i];
                            points.push({
                              id: `${layer.id}-state-${name}-${i}`,
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
                    ...layer,
                    points,
                    yAxisId,
                  };
                }
              }

              return layer;
            });

            return {
              ...row,
              layers,
              violations: uniqBy(
                rowViolations,
                ({ constraint: { name } }) => name,
              ),
              yAxes: (row.yAxes || []).map(axis => ({
                ...axis,
                scaleDomain:
                  axis?.scaleDomain || yAxisIdToScaleDomain[axis.id] || [],
              })),
            };
          });

          return {
            ...panel,
            timeline: {
              ...panel.timeline,
              rows,
              violations: uniqBy(
                panelViolations,
                ({ constraint: { name } }) => name,
              ),
            },
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
    return { end: 0, start: 0 };
  },
);

export const getViewTimeRange = createSelector(
  getPlanningState,
  (state: PlanningState): TimeRange => state.viewTimeRange,
);
