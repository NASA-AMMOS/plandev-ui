import { capitalize, isEqual } from 'lodash-es';
import { derived, get, writable, type Writable } from 'svelte/store';
import type { ResourceType } from '../types/simulation';
import type {
  ActivityLayerFilter,
  Axis,
  Layer,
  ResourceLayerFilter,
  Row,
  Timeline,
  TimelineItemType,
} from '../types/timeline';
import type { View, ViewGrid, ViewSlim, ViewTable, ViewToggleEvent } from '../types/view';
import { getTarget } from '../utilities/generic';
import gql from '../utilities/gql';
import {
  TimelineInteractionMode,
  TimelineLockStatus,
  createRow,
  createTimelineActivityLayer,
  createTimelineLineLayer,
  createTimelineResourceLayer,
  getUniqueColorForActivityLayer,
  getUniqueColorForLineLayer,
  getUniqueColorSchemeForXRangeLayer,
  isLineLayer,
  isXRangeLayer,
} from '../utilities/timeline';
import { createColumnSizes, createRowSizes, parseColumnSizes } from '../utilities/view';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const views = gqlSubscribable<ViewSlim[]>(gql.SUB_VIEWS, {}, [], null);

/* Writeable. */

export const view: Writable<View | null> = writable(null);

export const originalView: Writable<View | null> = writable(null);

export const selectedLayerId: Writable<number | null> = writable(null);

export const selectedRowId: Writable<number | null> = writable(null);

export const selectedTimelineId: Writable<number | null> = writable(null);

export const selectedYAxisId: Writable<number | null> = writable(null);

export const timelineLockStatus: Writable<TimelineLockStatus> = writable(TimelineLockStatus.Locked);

export const timelineInteractionMode: Writable<TimelineInteractionMode> = writable(TimelineInteractionMode.Interact);

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
  view.update(currentView => {
    if (currentView !== null) {
      return {
        ...currentView,
        ...(updatedView.definition ? { definition: updatedView.definition } : {}),
        ...(updatedView.name ? { name: updatedView.name } : {}),
        ...(updatedView.updated_at ? { updated_at: updatedView.updated_at } : {}),
      };
    }
    return currentView;
  });

  originalView.update(view => {
    if (view !== null) {
      return {
        ...view,
        ...(updatedView.definition ? { definition: updatedView.definition } : {}),
        ...(updatedView.name ? { name: updatedView.name } : {}),
        ...(updatedView.updated_at ? { updated_at: updatedView.updated_at } : {}),
      };
    }
    return view;
  });
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

export function viewSetSelectedRow(rowId?: number | null): void {
  // If no timeline is selected, select the first timeline
  if (get(selectedTimelineId) === null) {
    const firstTimeline = get(view)?.definition.plan.timelines[0];
    if (firstTimeline) {
      viewSetSelectedTimeline(firstTimeline.id);
    }
  }

  selectedRowId.set(rowId ?? null);
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

export function viewSetSelectedTimeline(timelineId?: number | null): void {
  selectedTimelineId.set(timelineId ?? null);
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

  const parsedColumnSizes = parseColumnSizes(columnSizes, leftHidden, rightHidden);
  if (parsedColumnSizes !== null) {
    const { col1, col2, col3 } = parsedColumnSizes;
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
}

export function viewUpdateActivityDirectivesTable(update: Partial<ViewTable>): void {
  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });
}

export function viewUpdateActivitySpansTable(update: Partial<ViewTable>): void {
  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });
}

export function viewUpdateSimulationEventsTable(update: Partial<ViewTable>): void {
  view.update(currentView => {
    if (currentView !== null) {
      return {
        ...currentView,
        definition: {
          ...currentView.definition,
          plan: {
            ...currentView.definition.plan,
            simulationEventsTable: {
              ...currentView.definition.plan.simulationEventsTable,
              ...update,
            },
          },
        },
      };
    }
    return currentView;
  });
}

export function viewUpdateIFrame(prop: string, value: any, iFrameId?: number) {
  if (iFrameId !== undefined) {
    view.update(currentView => {
      if (currentView !== null) {
        return {
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
        };
      }
      return currentView;
    });
  }
}

export function viewUpdateLayer(event: Event) {
  event.stopPropagation();
  const { name: prop, value } = getTarget(event);

  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const layerId = get<number | null>(selectedLayerId);

  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });
}

export function viewUpdateGrid(update: Partial<ViewGrid>) {
  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });
}

export function viewUpdateRow(
  prop: string,
  value: any,
  timelineId?: number | null,
  rowId?: number | null,
  shouldSyncChange?: boolean | null,
) {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);
  rowId = rowId ?? get<number | null>(selectedRowId);

  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });

  if (shouldSyncChange) {
    originalView.update(currentView => {
      if (currentView !== null) {
        return {
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
        };
      }
      return currentView;
    });
  }
}

export function viewUpdateTimeline(prop: string, value: any, timelineId?: number | null) {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);

  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });
}

export function viewUpdateYAxis(prop: string, value: any) {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const yAxisId = get<number | null>(selectedYAxisId);

  view.update(currentView => {
    if (currentView !== null) {
      return {
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
      };
    }
    return currentView;
  });
}

export function getUpdatedLayerWithFilters(
  timelines: Timeline[],
  type: string /* 'activity' | 'resource' */,
  items: TimelineItemType[],
  layer?: Layer,
  row?: Row,
): { layer: Layer; yAxis?: Axis } {
  const itemNames = items.map(i => i.name);
  // Create a suitable layer if not provided
  if (!layer) {
    if (type === 'activity') {
      return {
        layer: createTimelineActivityLayer(timelines, {
          activityColor: getUniqueColorForActivityLayer(row),
          filter: { activity: { types: itemNames } },
        }),
      };
    } else {
      const { layer: newLayer, yAxis } = createTimelineResourceLayer(timelines, items[0] as ResourceType);
      if (newLayer && newLayer.filter.resource) {
        // Add remaining resources if requested (generally avoided since resource layers are usually created on separate layers)
        newLayer.filter.resource.names = itemNames;
        if (isLineLayer(newLayer)) {
          newLayer.lineColor = getUniqueColorForLineLayer(row);
        } else if (isXRangeLayer(newLayer)) {
          newLayer.colorScheme = getUniqueColorSchemeForXRangeLayer(row);
        }
        return {
          layer: newLayer,
          yAxis,
        };
      } else {
        return {
          layer: createTimelineLineLayer(timelines, []),
        };
      }
    }
  } else {
    // Otherwise augment the filter of the specified layer
    const prop = type === 'activity' ? 'types' : 'names';
    const typedType = type as 'activity' | 'resource';
    const existingFilter = layer.filter[typedType];
    let existingFilterItems: string[] = [];

    if (existingFilter && (existingFilter as ActivityLayerFilter).types) {
      existingFilterItems = (existingFilter as ActivityLayerFilter).types;
    } else if (existingFilter && (existingFilter as ResourceLayerFilter).names) {
      existingFilterItems = (existingFilter as ResourceLayerFilter).names;
    }

    return {
      layer: {
        ...layer,
        filter: {
          [type]: {
            [prop]: [...new Set(existingFilterItems.concat(itemNames))],
          },
        },
      },
    };
  }
}

export function viewAddTimelineRow(timelineId?: number | null, openEditor: boolean = false) {
  const timelines = get(view)?.definition.plan.timelines || [];
  const selectedTimelineIdValue = timelineId ?? get(selectedTimelineId);
  const timeline = timelines.find(t => t.id === selectedTimelineIdValue);
  if (timeline) {
    const row = createRow(timelines);
    viewUpdateTimeline('rows', [...timeline.rows, row], timelineId);

    if (openEditor) {
      viewSetSelectedRow(row.id);

      // Open the timeline editor panel on the right.
      viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });
    }
  }
}

export function viewAddFilterToRow(
  items: TimelineItemType[],
  typeName: string /* 'activity' | 'resource' */,
  rowId?: number,
  layer?: Layer,
  index?: number, // row index to insert after
) {
  if (typeName === 'resource') {
    // Add first to a new row
    const row = viewAddFilterItemsToRow([items[0]], typeName, rowId, layer, index);
    if (row) {
      // TODO enforcing an arbitrary limit here to avoid a poor performance scenario
      // where a user hits "add to / new row" for all resources which would download
      // the entire simulation dataset which is potentially huge.
      // Furthermore, one cannot realistically or usefully plot all resources on individual layers
      // within the same row.
      items.slice(1, 50).forEach(item => {
        viewAddFilterItemsToRow([item], typeName, row.id, layer, index);
      });
    }
  } else {
    viewAddFilterItemsToRow(items, typeName, rowId, layer, index);
  }
}

export function viewAddFilterItemsToRow(
  items: TimelineItemType[],
  typeName: string /* 'activity' | 'resource' */,
  rowId?: number,
  layer?: Layer,
  index?: number, // row index to insert after
): Row | undefined {
  const timelines = get(view)?.definition.plan.timelines || [];
  if (!timelines.length) {
    return;
  }

  let newRows: Row[] = timelines[0].rows;
  let returnRow: Row | undefined = undefined;
  const defaultRowName = `${capitalize(typeName)} Row`;
  const row = typeof rowId === 'number' ? newRows.find(r => r.id === rowId) : undefined;
  const targetRow = row || createRow(timelines, { name: items.length === 1 ? items[0].name : defaultRowName });
  if (!row) {
    // If no row is provided we assume there is no relevant layer
    const { layer: newLayer, yAxis } = getUpdatedLayerWithFilters(timelines, typeName, items);
    const insertIndex = index ?? newRows.length;
    returnRow = { ...targetRow, layers: [newLayer], yAxes: yAxis ? [yAxis] : [] };
    newRows = [...newRows];
    newRows.splice(insertIndex + 1, 0, returnRow);
  } else {
    // Find the layer in the row or create one if needed
    if (
      !layer ||
      // Case where the target layer type does not match the destination layer chart type
      (layer.chartType === 'activity' && typeName === 'resource') ||
      (layer.chartType !== 'activity' && typeName === 'activity')
    ) {
      // Add to existing row
      const { layer: newLayer, yAxis } = getUpdatedLayerWithFilters(timelines, typeName, items, undefined, row);
      newRows = newRows.map(r => {
        if (r.id === row.id) {
          returnRow = { ...row, layers: [...row.layers, newLayer], yAxes: yAxis ? [...row.yAxes, yAxis] : row.yAxes };
          return returnRow;
        } else {
          return r;
        }
      });
    } else {
      // If a layer is specified, update the layer in the associated row
      newRows = newRows.map(r => {
        if (r.id === row.id) {
          returnRow = r;
          const newLayers = r.layers.map(l => {
            if (l.id === layer.id) {
              return getUpdatedLayerWithFilters(timelines, typeName, items, layer, row).layer;
            }
            return l;
          });
          return { ...r, layers: newLayers };
        } else {
          return r;
        }
      });
    }
  }

  viewUpdateTimeline('rows', newRows, timelines[0].id);
  viewSetSelectedRow(targetRow.id);

  // Open the timeline editor panel on the right.
  viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });

  return returnRow;
}
