import { isEqual } from 'lodash-es';
import { derived, get, writable, type Writable } from 'svelte/store';
import type { View, ViewGrid, ViewTable, ViewToggleEvent } from '../types/view';
import { getTarget } from '../utilities/generic';
import gql from '../utilities/gql';
import { TimelineLockStatus } from '../utilities/timeline';
import { createColumnSizes, createRowSizes, parseColumnSizes } from '../utilities/view';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const views = gqlSubscribable<View[]>(gql.SUB_VIEWS, {}, [], null);

/* Writeable. */

export const view: Writable<View | null> = writable(null);

export const originalView: Writable<View | null> = writable(null);

export const selectedLayerId: Writable<number | null> = writable(null);

export const selectedRowId: Writable<number | null> = writable(null);

export const selectedTimelineId: Writable<number | null> = writable(null);

export const selectedYAxisId: Writable<number | null> = writable(null);

export const timelineLockStatus: Writable<TimelineLockStatus> = writable(TimelineLockStatus.Locked);

/* Derived. */

export const viewIsModified = derived([view, originalView], ([$view, $originalView]) => {
  return !isEqual($view, $originalView);
});

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

export function applyViewUpdate(updatedView: Partial<View>) {
  view.update(currentView => ({
    ...currentView,
    ...(updatedView.definition ? { definition: updatedView.definition } : {}),
    ...(updatedView.name ? { name: updatedView.name } : {}),
    ...(updatedView.updated_at ? { updated_at: updatedView.updated_at } : {}),
  }));

  originalView.update(view => ({
    ...view,
    ...(updatedView.definition ? { definition: updatedView.definition } : {}),
    ...(updatedView.name ? { name: updatedView.name } : {}),
    ...(updatedView.updated_at ? { updated_at: updatedView.updated_at } : {}),
  }));
}

export function initializeView(newView: View) {
  view.set(newView);
  originalView.set(get(view));
}

export function resetOriginalView() {
  originalView.set(get(view));
}

export function resetView() {
  view.set(get(originalView));
}

export function viewSetSelectedRow(rowId: number | null): void {
  // If no timeline is selected, select the first timeline
  if (get(selectedTimelineId) === null) {
    const firstTimeline = get(view).definition.plan.timelines[0];
    if (firstTimeline) {
      viewSetSelectedTimeline(firstTimeline.id);
    }
  }

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

export function viewTogglePanel(event: ViewToggleEvent) {
  const { state, type, update = {} } = event;
  const currentView = get(view);
  const grid = currentView?.definition?.plan?.grid ?? {
    columnSizes: '',
    leftHidden: false,
    rightHidden: false,
  };
  const { columnSizes, leftHidden, rightHidden } = grid;

  const { col1, col2, col3 } = parseColumnSizes(columnSizes, leftHidden, rightHidden);
  switch (type) {
    case 'left': {
      viewUpdateGrid({
        columnSizes: createColumnSizes({ col1, col2, col3 }, !state, rightHidden),
        leftHidden: !state,
        leftRowSizes: createRowSizes({}, false),
        leftSplit: false,
        ...update,
      });
      break;
    }
    case 'left-split': {
      viewUpdateGrid({
        columnSizes: createColumnSizes({ col1, col2, col3 }, !state, rightHidden),
        leftHidden: !state,
        leftRowSizes: createRowSizes({}, state),
        leftSplit: state,
        ...update,
      });
      break;
    }
    case 'bottom': {
      viewUpdateGrid({
        middleRowSizes: createRowSizes({ row1: '2fr', row2: '1fr' }, state),
        middleSplit: state,
        ...update,
      });
      break;
    }
    case 'right': {
      viewUpdateGrid({
        columnSizes: createColumnSizes({ col1, col2, col3 }, leftHidden, !state),
        rightHidden: !state,
        rightRowSizes: createRowSizes({}, false),
        rightSplit: false,
        ...update,
      });
      break;
    }
    case 'right-split': {
      viewUpdateGrid({
        columnSizes: createColumnSizes({ col1, col2, col3 }, leftHidden, !state),
        rightHidden: !state,
        rightRowSizes: createRowSizes({}, state),
        rightSplit: state,
        ...update,
      });
      break;
    }
  }
}

export function viewUpdateActivityDirectivesTable(update: Partial<ViewTable>): void {
  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        activityDirectivesTable: {
          ...currentView.definition.plan.activityDirectivesTable,
          ...update,
        },
      },
    },
  }));
}

export function viewUpdateActivitySpansTable(update: Partial<ViewTable>): void {
  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        activitySpansTable: {
          ...currentView.definition.plan.activitySpansTable,
          ...update,
        },
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

export function viewUpdateGrid(update: Partial<ViewGrid>) {
  view.update(currentView => ({
    ...currentView,
    definition: {
      ...currentView.definition,
      plan: {
        ...currentView.definition.plan,
        grid: {
          ...currentView.definition.plan.grid,
          ...update,
        },
      },
    },
  }));
}

export function viewUpdateRow(
  prop: string,
  value: any,
  timelineId?: number,
  rowId?: number,
  shouldSyncChange?: boolean,
) {
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

  if (shouldSyncChange) {
    originalView.update(currentView => ({
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
