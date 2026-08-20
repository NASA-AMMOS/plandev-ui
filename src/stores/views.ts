import { capitalize, isEqual } from 'lodash-es';
import { derived, get, writable, type Writable } from 'svelte/store';
import type { ActivityFilterField } from '../enums/filter';
import type { DynamicFilter } from '../types/filter';
import type { ResourceType } from '../types/simulation';
import type {
  ActivityLayerFilter,
  Axis,
  Layer,
  Row,
  Timeline,
  TimelineItemMetadata,
  TimelineItemRef,
  TimelineItemType,
  TimelineSection,
} from '../types/timeline';
import type { View, ViewGrid, ViewSlim, ViewTable, ViewToggleEvent } from '../types/view';
import { getTarget } from '../utilities/generic';
import gql from '../utilities/gql';
import {
  TimelineInteractionMode,
  TimelineLockStatus,
  createRow,
  createSection,
  createTimelineActivityLayer,
  createTimelineExternalEventLayer,
  createTimelineLineLayer,
  createTimelineResourceLayer,
  getNextThingID,
  getUniqueColorForActivityLayer,
  getUniqueColorForLineLayer,
  getUniqueColorSchemeForXRangeLayer,
  insertRowAfterInTimelineHierarchy,
  isLineLayer,
  isXRangeLayer,
} from '../utilities/timeline';
import { createColumnSizes, createRowSizes, parseColumnSizes } from '../utilities/view';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const views = gqlSubscribable<ViewSlim[]>(gql.SUB_VIEWS, {}, []);

/* Writeable. */

export const view: Writable<View | null> = writable(null);

export const originalView: Writable<View | null> = writable(null);

export const selectedLayerId: Writable<number | null> = writable(null);

export const selectedRowId: Writable<number | null> = writable(null);

export const selectedSectionId: Writable<number | null> = writable(null);

export const selectedTimelineId: Writable<number | null> = writable(0);

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

export const selectedSection = derived(
  [selectedTimeline, selectedSectionId],
  ([$selectedTimeline, $selectedSectionId]) => {
    if ($selectedTimeline !== null && $selectedSectionId !== null) {
      for (const section of $selectedTimeline.sections || []) {
        if (section.id === $selectedSectionId) {
          return section;
        }
      }
    }
    return null;
  },
);

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

  // Section editing and row editing are mutually exclusive in the editor panel.
  if (rowId !== null && rowId !== undefined) {
    selectedSectionId.set(null);
  }

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

/* Section Functions */

export function viewSetSelectedSection(sectionId?: number | null): void {
  selectedSectionId.set(sectionId ?? null);

  // Section editing and row editing are mutually exclusive in the editor panel.
  if (sectionId !== null && sectionId !== undefined) {
    selectedRowId.set(null);
  }
}

/**
 * Adds a section to a timeline. `insertAfter` places it directly below that item, so adding a
 * section from a row's context menu lands it where the user clicked rather than at the end.
 */
export function viewAddSection(
  timelineId?: number | null,
  name?: string,
  insertAfter?: TimelineItemRef | null,
): TimelineSection | undefined {
  const selectedTimelineIdValue = timelineId ?? get(selectedTimelineId);

  let createdSection: TimelineSection | undefined;

  view.update(currentView => {
    if (currentView !== null) {
      const timelines = currentView.definition.plan.timelines || [];
      const timeline = timelines.find(t => t.id === selectedTimelineIdValue);

      if (timeline) {
        const section = createSection(timelines, name ? { name } : undefined);
        createdSection = section;
        const newSections = [...(timeline.sections || []), section];
        const newItems: TimelineItemRef[] = [...(timeline.items || [])];
        const anchorIndex = insertAfter
          ? newItems.findIndex(item => item.type === insertAfter.type && item.id === insertAfter.id)
          : -1;
        newItems.splice(anchorIndex < 0 ? newItems.length : anchorIndex + 1, 0, { id: section.id, type: 'section' });

        return {
          ...currentView,
          definition: {
            ...currentView.definition,
            plan: {
              ...currentView.definition.plan,
              timelines: currentView.definition.plan.timelines.map(t => {
                if (t && t.id === selectedTimelineIdValue) {
                  return {
                    ...t,
                    items: newItems,
                    sections: newSections,
                  };
                }
                return t;
              }),
            },
          },
        };
      }
    }
    return currentView;
  });

  return createdSection;
}

export function viewUpdateSection(
  prop: keyof TimelineSection,
  value: any,
  sectionId?: number | null,
  timelineId?: number | null,
): void {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);
  sectionId = sectionId ?? get<number | null>(selectedSectionId);

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
                  sections: (timeline.sections || []).map(section => {
                    if (section.id === sectionId) {
                      return {
                        ...section,
                        [prop]: value,
                      };
                    }
                    return section;
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

/**
 * Opens or folds a whole timeline: every row's `expanded` and every section's `collapsed`, in one
 * store update so a long timeline renders once rather than once per item.
 */
export function viewSetAllExpanded(expanded: boolean, timelineId?: number | null): void {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);

  view.update(currentView => {
    if (currentView === null) {
      return currentView;
    }

    return {
      ...currentView,
      definition: {
        ...currentView.definition,
        plan: {
          ...currentView.definition.plan,
          timelines: currentView.definition.plan.timelines.map(timeline =>
            timeline && timeline.id === timelineId
              ? {
                  ...timeline,
                  rows: timeline.rows.map(row => ({ ...row, expanded })),
                  sections: (timeline.sections || []).map(section => ({ ...section, collapsed: !expanded })),
                }
              : timeline,
          ),
        },
      },
    };
  });
}

export function viewDeleteSection(sectionId: number, moveRowsToRoot: boolean = true, timelineId?: number | null): void {
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
                const sectionToDelete = (timeline.sections || []).find(s => s.id === sectionId);
                let newItems = (timeline.items || []).filter(
                  item => !(item.type === 'section' && item.id === sectionId),
                );
                let newRows = timeline.rows;

                if (sectionToDelete) {
                  if (moveRowsToRoot) {
                    // The freed rows take the section's slot, so deleting one does not reorder
                    // the timeline.
                    const sectionIndex = (timeline.items || []).findIndex(
                      item => item.type === 'section' && item.id === sectionId,
                    );
                    const rowItems: TimelineItemRef[] = sectionToDelete.rowIds.map(rowId => ({
                      id: rowId,
                      type: 'row' as const,
                    }));
                    // A section missing from `items` appends rather than falling through to
                    // slice(0, -1), which would drop its rows in next-to-last.
                    const insertIndex = sectionIndex < 0 ? newItems.length : sectionIndex;
                    newItems = [...newItems.slice(0, insertIndex), ...rowItems, ...newItems.slice(insertIndex)];
                  } else {
                    const rowIdsToDelete = new Set(sectionToDelete.rowIds);
                    newRows = timeline.rows.filter(row => !rowIdsToDelete.has(row.id));
                  }
                }

                return {
                  ...timeline,
                  items: newItems,
                  rows: newRows,
                  sections: (timeline.sections || []).filter(s => s.id !== sectionId),
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

  if (get(selectedSectionId) === sectionId) {
    selectedSectionId.set(null);
  }
}

export function viewReorderTimelineItems(
  items: TimelineItemRef[],
  timelineId?: number | null,
  sections?: TimelineSection[],
): void {
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
                  items,
                  ...(sections !== undefined && { sections }),
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

export function getUpdatedActivityLayerFilter(
  items: TimelineItemType[],
  metadata?: TimelineItemMetadata,
  filter?: ActivityLayerFilter,
): ActivityLayerFilter {
  // Return updated activity layer filter
  // Prefer metadata like Type and/or Subsystem filter over named types
  const dynamicTypeFilters: ActivityLayerFilter['dynamic_type_filters'] = filter?.dynamic_type_filters || [];
  let staticTypes: string[] = filter?.static_types || [];
  const hasTextFilters = metadata?.textFilters && metadata?.textFilters.length;
  const hasSelectedFilters = metadata?.selectedFilters && Object.keys(metadata?.selectedFilters).length;
  if (hasTextFilters) {
    (metadata.textFilters || []).forEach(textFilter => {
      const typeFilter: DynamicFilter<Pick<typeof ActivityFilterField, 'Type' | 'Subsystem'>> = {
        field: 'Type',
        id: getNextThingID(dynamicTypeFilters),
        operator: 'includes',
        value: textFilter,
      };
      dynamicTypeFilters.push(typeFilter);
    });
  }
  if (hasSelectedFilters) {
    const subsystems = Object.values(metadata.selectedFilters || {}).map(
      selectedFilter => selectedFilter.value,
    ) as number[];
    if (subsystems.length) {
      const typeFilter: DynamicFilter<Pick<typeof ActivityFilterField, 'Type' | 'Subsystem'>> = {
        field: 'Subsystem',
        id: getNextThingID(dynamicTypeFilters),
        operator: 'includes',
        value: subsystems,
      };
      dynamicTypeFilters.push(typeFilter);
    }
  }
  if (!hasTextFilters && !hasSelectedFilters && items.length) {
    const newTypes = items.map(i => i.name);
    const existingTypes = filter?.static_types || [];
    staticTypes = Array.from(new Set([...newTypes, ...existingTypes]));
  }

  return {
    ...(filter || {}),
    dynamic_type_filters: dynamicTypeFilters,
    static_types: staticTypes,
  };
}

export function getUpdatedLayerWithFilters(
  timelines: Timeline[],
  type: string /* 'activity' | 'resource' | 'externalEvent' */,
  items: TimelineItemType[],
  metadata?: TimelineItemMetadata,
  layer?: Layer,
  row?: Row,
): { layer: Layer; yAxis?: Axis } {
  const itemNames = items.map(i => i.name);
  // Create a suitable layer if not provided
  if (!layer) {
    if (type === 'activity') {
      const updatedActivityFilter = getUpdatedActivityLayerFilter(items, metadata);
      return {
        layer: createTimelineActivityLayer(timelines, {
          activityColor: getUniqueColorForActivityLayer(row),
          filter: { activity: updatedActivityFilter },
        }),
      };
    } else if (type === 'externalEvent') {
      return {
        layer: createTimelineExternalEventLayer(timelines, {
          filter: { externalEvent: { static_types: itemNames } },
        }),
      };
    } else {
      const { layer: newLayer, yAxis } = createTimelineResourceLayer(timelines, items[0] as ResourceType);
      if (newLayer && newLayer.filter.resource) {
        // Add remaining resources if requested (generally avoided since resource layers are usually created on separate layers)
        newLayer.filter.resource = itemNames.length ? itemNames[0] : '';
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
    // Note that resources are skipped here since they cannot be added to existing layers
    const updatedFilter = layer.filter;
    if (type === 'activity') {
      updatedFilter.activity = getUpdatedActivityLayerFilter(items, metadata, layer.filter.activity);
    } else if (type === 'externalEvent') {
      updatedFilter.externalEvent = {
        static_types: Array.from(new Set([...(updatedFilter.externalEvent?.static_types || []), ...itemNames])),
      };
    }

    return {
      layer: {
        ...layer,
        filter: updatedFilter,
      },
    };
  }
}

export function viewAddTimelineRow(
  timelineId?: number | null,
  openEditor: boolean = false,
  targetSectionId?: number | null,
) {
  const selectedTimelineIdValue = timelineId ?? get(selectedTimelineId);

  let createdRow: Row | undefined;

  view.update(currentView => {
    if (currentView !== null) {
      const timelines = currentView.definition.plan.timelines || [];
      const timeline = timelines.find(t => t.id === selectedTimelineIdValue);

      if (timeline) {
        const row = createRow(timelines);
        createdRow = row;
        const newRows = [...timeline.rows, row];

        let newItems = [...(timeline.items || [])];
        let newSections = [...(timeline.sections || [])];

        if (targetSectionId !== undefined && targetSectionId !== null) {
          newSections = newSections.map(s => {
            if (s.id === targetSectionId) {
              return {
                ...s,
                rowIds: [...s.rowIds, row.id],
              };
            }
            return s;
          });
        } else {
          newItems = [...newItems, { id: row.id, type: 'row' as const }];
        }

        return {
          ...currentView,
          definition: {
            ...currentView.definition,
            plan: {
              ...currentView.definition.plan,
              timelines: currentView.definition.plan.timelines.map(t => {
                if (t && t.id === selectedTimelineIdValue) {
                  return {
                    ...t,
                    items: newItems,
                    rows: newRows,
                    sections: newSections,
                  };
                }
                return t;
              }),
            },
          },
        };
      }
    }
    return currentView;
  });

  if (createdRow && openEditor) {
    viewSetSelectedRow(createdRow.id);

    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });
  }

  return createdRow;
}

export function viewAddFilterToRow(
  items: TimelineItemType[],
  typeName: string /* 'activity' | 'resource' | 'externalEvent' */,
  metadata?: TimelineItemMetadata,
  rowId?: number,
  layer?: Layer,
  index?: number, // row index to insert after
) {
  if (typeName === 'resource') {
    // Add first resource to the row
    const row = viewAddFilterItemsToRow([items[0]], typeName, metadata, rowId, layer, index);
    if (row) {
      // TODO enforcing an arbitrary limit here to avoid a poor performance scenario
      // where a user hits "add to / new row" for all resources which would download
      // the entire simulation dataset which is potentially huge.
      // Furthermore, one cannot realistically or usefully plot all resources on individual layers
      // within the same row.
      items.slice(1, 50).forEach(item => {
        viewAddFilterItemsToRow([item], typeName, metadata, row.id, layer, index);
      });
    }
  } else {
    viewAddFilterItemsToRow(items, typeName, metadata, rowId, layer, index);
  }
}

export function viewAddFilterItemsToRow(
  items: TimelineItemType[],
  typeName: string /* 'activity' | 'resource' | 'externalEvent' */,
  metadata?: TimelineItemMetadata,
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
  // If no row was given, but one matches the default name, attempt to use it
  const row = typeof rowId === 'number' ? newRows.find(r => r.id === rowId) : undefined;
  const targetRow = row || createRow(timelines, { name: items.length === 1 ? items[0].name : defaultRowName });
  if (!row) {
    // If no row is provided we assume there is no relevant layer
    const { layer: newLayer, yAxis } = getUpdatedLayerWithFilters(timelines, typeName, items, metadata);
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
      (layer.chartType !== 'activity' && typeName === 'activity') ||
      (layer.chartType !== 'externalEvent' && typeName === 'externalEvent')
    ) {
      // Add to existing row
      const { layer: newLayer, yAxis } = getUpdatedLayerWithFilters(
        timelines,
        typeName,
        items,
        metadata,
        undefined,
        row,
      );
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
              return getUpdatedLayerWithFilters(timelines, typeName, items, metadata, layer, row).layer;
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

  if (row) {
    viewUpdateTimeline('rows', newRows, timelines[0].id);
  } else {
    // A brand new row has to be registered in `items` in the same update, next to the row it was
    // inserted after. The timeline draws from `items`, so a row added to `rows` alone exists in
    // the store, opens its editor, and renders nowhere.
    const timeline = timelines[0];
    const afterRow = newRows[newRows.indexOf(returnRow as Row) - 1];
    const hierarchy = afterRow
      ? insertRowAfterInTimelineHierarchy(timeline, afterRow.id, targetRow.id)
      : { items: [{ id: targetRow.id, type: 'row' as const }, ...(timeline.items || [])], sections: timeline.sections };

    view.update(currentView => {
      if (currentView === null) {
        return currentView;
      }
      return {
        ...currentView,
        definition: {
          ...currentView.definition,
          plan: {
            ...currentView.definition.plan,
            timelines: currentView.definition.plan.timelines.map(t =>
              t && t.id === timeline.id ? { ...t, ...hierarchy, rows: newRows } : t,
            ),
          },
        },
      };
    });
  }

  viewSetSelectedRow(targetRow.id);

  viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });

  return returnRow;
}
/* Loading stores. */
export const initialViewsLoading = views.loading;
