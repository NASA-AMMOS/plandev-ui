import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PlanningState } from '../reducers/planning.reducer';
import {
  ActivityInstance,
  ActivityLayer,
  ActivityPoint,
  ActivityType,
  Adaptation,
  Axis,
  Constraint,
  ConstraintViolation,
  DecompositionTreeState,
  Layer,
  LineLayer,
  LinePoint,
  Plan,
  Row,
  SimulationResult,
  StringTMap,
  TimeRange,
  View,
  ViewSection,
  XRangeLayer,
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

export const getAdaptationConstraints = createSelector(
  getPlanningState,
  (state: PlanningState): Constraint[] | null =>
    state.adaptationConstraints
      ? Object.values(state.adaptationConstraints)
      : null,
);

export const getPlanConstraints = createSelector(
  getPlanningState,
  (state: PlanningState): Constraint[] | null =>
    state.planConstraints ? Object.values(state.planConstraints) : null,
);

export const getDecompositionTreeState = createSelector(
  getPlanningState,
  (state: PlanningState): DecompositionTreeState =>
    state.decompositionTreeState,
);

export const getConstraintViolations = createSelector(
  getPlanningState,
  (state: PlanningState): ConstraintViolation[] =>
    state.constraintViolations || [],
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

export const getSimulationResults = createSelector(
  getPlanningState,
  (state: PlanningState): SimulationResult[] => state.simulationResults || [],
);

export const getView = createSelector(
  getPlanningState,
  (state: PlanningState) => state.view,
);

export const getViewWithPoints = createSelector(
  getActivityInstances,
  getActivityInstancesMap,
  getSelectedActivityInstanceId,
  getSimulationResults,
  getView,
  (
    activityInstances: ActivityInstance[] | null,
    activityInstancesMap: StringTMap<ActivityInstance> | null,
    selectedActivityInstanceId: string | null,
    simulationResults: SimulationResult[],
    view: View,
  ): View => ({
    ...view,
    sections: (view?.sections || []).map(section => {
      if (section.timeline) {
        const rows = section.timeline.rows.map(row => {
          const yAxisIdToScaleDomain: StringTMap<number[]> = {};

          const layers: Layer[] = row.layers.map(layer => {
            if (layer.type === 'activity') {
              const activities = activityInstances || [];

              const points = activities.reduce((newPoints, point) => {
                const r = new RegExp(layer?.filter?.activity?.type);
                const includePoint = r.test(point.type);

                if (
                  includePoint &&
                  (point.parent === null || point.parent === undefined)
                ) {
                  const activityPoint = activityInstanceToPoint(
                    point,
                    selectedActivityInstanceId,
                    activityInstancesMap,
                  );
                  newPoints.push(activityPoint);
                }

                return newPoints;
              }, []);

              const newLayer: ActivityLayer = {
                ...layer,
                points,
              };

              return newLayer;
            } else if (layer.type === 'resource') {
              if (layer.chartType === 'line') {
                const points: LinePoint[] = [];
                const yAxisId = layer?.yAxisId || `axis-${layer.id}`;
                let minY = Number.MAX_SAFE_INTEGER;
                let maxY = Number.MIN_SAFE_INTEGER;

                if (simulationResults && simulationResults.length) {
                  for (const result of simulationResults) {
                    const { name, schema, start, values } = result;
                    const r = new RegExp(layer?.filter?.resource?.name);
                    const includeResult = r.test(name);

                    if (includeResult) {
                      if (schema.type === 'boolean') {
                        for (let i = 0; i < values.length; ++i) {
                          const value = values[i];
                          const { x, y: yBoolean } = value;
                          const y = yBoolean ? 1 : 0;
                          points.push({
                            id: `${layer.id}-resource-${name}-${i}`,
                            type: 'line',
                            x: getUnixEpochTime(start) + x / 1000,
                            y,
                          });
                        }
                        minY = 0;
                        maxY = 1;
                      } else if (
                        schema.type === 'int' ||
                        schema.type === 'real'
                      ) {
                        for (let i = 0; i < values.length; ++i) {
                          const value = values[i];
                          const { x } = value;
                          const y = value.y as number;
                          points.push({
                            id: `${layer.id}-resource-${name}-${i}`,
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

                const newLayer: LineLayer = {
                  ...layer,
                  curveType: 'curveLinear', // All lines are linear for now.
                  points,
                  yAxisId,
                };

                return newLayer;
              } else if (layer.chartType === 'x-range') {
                const points: XRangePoint[] = [];
                const yAxisId = layer?.yAxisId || `axis-${layer.id}`;
                let domain = null;

                if (simulationResults && simulationResults.length) {
                  for (const result of simulationResults) {
                    const { name, schema, start, values } = result;
                    const r = new RegExp(layer?.filter?.resource?.name);
                    const includeResult = r.test(name);

                    if (includeResult) {
                      if (schema.type === 'boolean') {
                        domain = ['TRUE', 'FALSE'];
                        for (let i = 0; i < values.length; ++i) {
                          const { x, y } = values[i];
                          const text = y ? 'TRUE' : 'FALSE';
                          points.push({
                            id: `${layer.id}-resource-${name}-${i}`,
                            label: { text },
                            type: 'x-range',
                            x: getUnixEpochTime(start) + x / 1000,
                          });
                        }
                      } else if (schema.type === 'string') {
                        const domainMap: StringTMap<string> = {};
                        for (let i = 0; i < values.length; ++i) {
                          const { x, y } = values[i];
                          const text = y as string;
                          points.push({
                            id: `${layer.id}-resource-${name}-${i}`,
                            label: { text },
                            type: 'x-range',
                            x: getUnixEpochTime(start) + x / 1000,
                          });
                          domainMap[text] = text;
                        }
                        domain = Object.values(domainMap);
                      } else if (schema.type === 'variant') {
                        domain = schema.variants.map(({ label }) => label);
                        for (let i = 0; i < values.length; ++i) {
                          const { x, y } = values[i];
                          const text = y as string;
                          points.push({
                            id: `${layer.id}-resource-${name}-${i}`,
                            label: { text },
                            type: 'x-range',
                            x: getUnixEpochTime(start) + x / 1000,
                          });
                        }
                      }
                    }
                  }
                }

                const newLayer: XRangeLayer = {
                  ...layer,
                  domain,
                  points,
                  yAxisId,
                };

                return newLayer;
              }
            }

            return layer;
          });

          const yAxes: Axis[] = (row.yAxes || []).map(axis => ({
            ...axis,
            scaleDomain:
              axis?.scaleDomain || yAxisIdToScaleDomain[axis.id] || [],
          }));

          const newRow: Row = {
            ...row,
            layers,
            yAxes,
          };

          return newRow;
        });

        const newSection: ViewSection = {
          ...section,
          timeline: {
            ...section.timeline,
            rows,
          },
        };

        return newSection;
      }

      return section;
    }),
  }),
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
