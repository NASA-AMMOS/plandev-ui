import { derived, get, writable, type Writable } from 'svelte/store';
import type { Grid } from '../types/grid';
import type { View, ViewActivityTable } from '../types/view';
import { getTarget } from '../utilities/generic';
import gql from '../utilities/gql';
import { activitiesGrid, constraintsGrid, schedulingGrid, simulationGrid, updateGrid } from '../utilities/grid';
import { TimelineLockStatus } from '../utilities/timeline';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const views = gqlSubscribable<View[]>(gql.SUB_VIEWS, {}, []);

/* Writeable. */

export const view: Writable<View | null> = writable(null);

export const selectedLayerId: Writable<number | null> = writable(null);

export const selectedRowId: Writable<number | null> = writable(null);

export const selectedTimelineId: Writable<number | null> = writable(null);

export const selectedYAxisId: Writable<number | null> = writable(null);

export const timelineLockStatus: Writable<TimelineLockStatus> = writable(TimelineLockStatus.Locked);

/* Derived. */

export const viewDefinitionText = derived(view, $view => ($view ? JSON.stringify($view.definition, null, 2) : ''));

export const selectedTimeline = derived([view, selectedTimelineId], ([$view, $selectedTimelineId]) => {
  if ($view !== null && $selectedTimelineId !== null) {
    for (const timeline of $view.definition.plan.timelines) {
      if (timeline && timeline.id === $selectedTimelineId) {
        return timeline;
      }
    }
  }
  return null;
});

export const selectedRow = derived([selectedTimeline, selectedRowId], ([$selectedTimeline, $selectedRowId]) => {
  if ($selectedTimeline !== null) {
    for (const row of $selectedTimeline.rows) {
      if (row.id === $selectedRowId) {
        return row;
      }
    }
  }
  return null;
});

export const selectedYAxis = derived([selectedRow, selectedYAxisId], ([$selectedRow, $selectedYAxisId]) => {
  if ($selectedRow !== null) {
    for (const yAxis of $selectedRow.yAxes) {
      if (yAxis.id === $selectedYAxisId) {
        return yAxis;
      }
    }
  }
  return null;
});

export const selectedLayer = derived([selectedRow, selectedLayerId], ([$selectedRow, $selectedLayerId]) => {
  if ($selectedRow !== null) {
    for (const layer of $selectedRow.layers) {
      if (layer.id === $selectedLayerId) {
        return layer;
      }
    }
  }
  return null;
});

/* Helper Functions. */

export function viewSetLayout(title: string) {
  let layout: Grid;

  if (title === 'Activities') {
    layout = activitiesGrid;
  } else if (title === 'Constraints') {
    layout = constraintsGrid;
  } else if (title === 'Scheduling') {
    layout = schedulingGrid;
  } else if (title === 'Simulation') {
    layout = simulationGrid;
  } else {
    layout = activitiesGrid;
  }

  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        layout,
      },
    },
  }));
}

export function viewSetSelectedRow(rowId: number | null): void {
  selectedRowId.set(rowId);
  const currentRow = get(selectedRow);

  if (currentRow) {
    const firstLayer = currentRow.layers[0];
    if (firstLayer) {
      selectedLayerId.set(firstLayer.id);
    } else {
      selectedLayerId.set(null);
    }

    const firstYAxis = currentRow.yAxes[0];
    if (firstYAxis) {
      selectedYAxisId.set(firstYAxis.id);
    } else {
      selectedYAxisId.set(null);
    }
  } else {
    selectedRowId.set(null);
  }
}

export function viewSetSelectedTimeline(timelineId: number | null): void {
  selectedTimelineId.set(timelineId);
}

export function viewUpdateActivityTables(update: Partial<ViewActivityTable>, activityTableId: number): void {
  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        activityTables: currentView.definition.plan.activityTables.map((table: ViewActivityTable) => {
          if (table.id === activityTableId) {
            return {
              ...table,
              ...update,
            };
          }
          return table;
        }),
      },
    },
  }));
}

export function viewUpdateIFrame(prop: string, value: any, iFrameId?: number) {
  if (iFrameId !== undefined) {
    view.update(currentView => ({
      ...currentView,
      definition: {
        ...currentView.definition,
        plan: {
          ...currentView.definition.plan,
          iFrames: currentView.definition.plan.iFrames.map(iFrame => {
            if (iFrame && iFrame.id === iFrameId) {
              return {
                ...iFrame,
                [prop]: value,
              };
            }
            return iFrame;
          }),
        },
      },
    }));
  }
}

export function viewUpdateLayer(event: Event) {
  event.stopPropagation();
  const { name: prop, value } = getTarget(event);

  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const layerId = get<number | null>(selectedLayerId);

  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        timelines: currentView.definition.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            return {
              ...timeline,
              rows: timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    layers: row.layers.map(layer => {
                      if (layer.id === layerId) {
                        return {
                          ...layer,
                          [prop]: value,
                        };
                      }
                      return layer;
                    }),
                  };
                }
                return row;
              }),
            };
          }
          return timeline;
        }),
      },
    },
  }));
}

export function viewUpdateLayout(id: number, update: Record<string, any>) {
  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        layout: updateGrid(currentView.definition.plan.layout, id, update),
      },
    },
  }));
}

export function viewUpdateRow(prop: string, value: any, timelineId?: number, rowId?: number) {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);
  rowId = rowId ?? get<number | null>(selectedRowId);

  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        timelines: currentView.definition.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            return {
              ...timeline,
              rows: timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    [prop]: value,
                  };
                }
                return row;
              }),
            };
          }
          return timeline;
        }),
      },
    },
  }));
}

export function viewUpdateTimeline(prop: string, value: any, timelineId?: number) {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);

  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        timelines: currentView.definition.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            return {
              ...timeline,
              [prop]: value,
            };
          }
          return timeline;
        }),
      },
    },
  }));
}

export function viewUpdateYAxis(prop: string, value: any) {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const yAxisId = get<number | null>(selectedYAxisId);

  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        timelines: currentView.definition.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            return {
              ...timeline,
              rows: timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    yAxes: row.yAxes.map(yAxis => {
                      if (yAxis.id === yAxisId) {
                        if (prop === 'id') {
                          selectedYAxisId.set(value);
                        }
                        return {
                          ...yAxis,
                          [prop]: value,
                        };
                      }
                      return yAxis;
                    }),
                  };
                }
                return row;
              }),
            };
          }
          return timeline;
        }),
      },
    },
  }));
}
