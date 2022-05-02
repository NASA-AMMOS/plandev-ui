import type { Writable } from 'svelte/store';
import { derived, get, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { getTarget, setQueryParam } from '../utilities/generic';
import { activitiesGrid, constraintsGrid, schedulingGrid, simulationGrid, updateGrid } from '../utilities/grid';
import req from '../utilities/requests';

/* Stores. */

/**
 * Current user-defined view.
 */
export const view: Writable<View | null> = writable(null);

/**
 * Current user-defined layout.
 */
export const viewLayout: Writable<Grid | null> = writable(null);

/**
 * Formatted JSON string of the current view.
 */
export const viewText = derived(view, $view => ($view ? JSON.stringify($view, null, 2) : ''));

export const selectedTimelineId: Writable<number | null> = writable(null);

export const selectedTimeline = derived([view, selectedTimelineId], ([$view, $selectedTimelineId]) => {
  if ($view !== null && $selectedTimelineId !== null) {
    for (const timeline of $view.plan.timelines) {
      if (timeline && timeline.id === $selectedTimelineId) {
        return timeline;
      }
    }
  }
  return null;
});

export const selectedRowId: Writable<number | null> = writable(null);

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

export const selectedYAxisId: Writable<number | null> = writable(null);

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

export const selectedLayerId: Writable<number | null> = writable(null);

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

/* Action Functions. */

export const viewActions = {
  async createView(currentView: View): Promise<void> {
    const { errors, message, success, view: newView } = await req.createView(currentView);

    if (success) {
      view.update(() => newView);
      setQueryParam('viewId', `${newView.id}`);
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'View Created Successfully',
      }).showToast();
    } else {
      console.log(errors);
      console.log(message);
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'View Create Failed',
      }).showToast();
    }
  },

  setLayout(title: GridName) {
    let layout: Grid;

    if (title === 'Activities') {
      layout = activitiesGrid;
    } else if (title === 'Constraints') {
      layout = constraintsGrid;
    } else if (title === 'Scheduling') {
      layout = schedulingGrid;
    } else if (title === 'Simulation') {
      layout = simulationGrid;
    } else if (title === 'View') {
      const viewGrid = get(viewLayout);
      layout = viewGrid;
    } else {
      layout = activitiesGrid;
    }

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        layout,
      },
    }));
  },

  setSelectedRow(rowId: number | null): void {
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
  },

  setSelectedTimeline(timelineId: number | null): void {
    selectedTimelineId.set(timelineId);
    const currentTimeline = get(selectedTimeline);

    if (currentTimeline) {
      const firstRow = currentTimeline.rows[0];

      if (firstRow) {
        viewActions.setSelectedRow(firstRow.id);
      }
    }
  },

  updateLayer(event: Event) {
    event.stopPropagation();
    const { name: prop, value } = getTarget(event);

    const timelineId = get<number | null>(selectedTimelineId);
    const rowId = get<number | null>(selectedRowId);
    const layerId = get<number | null>(selectedLayerId);

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        timelines: currentView.plan.timelines.map(timeline => {
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
    }));
  },

  updateLayout(id: number, prop: string, value: any) {
    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        layout: updateGrid(currentView.plan.layout, id, prop, value),
      },
    }));
  },

  updateRow(prop: string, value: any, timelineId?: number, rowId?: number) {
    timelineId = timelineId ?? get<number | null>(selectedTimelineId);
    rowId = rowId ?? get<number | null>(selectedRowId);

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        timelines: currentView.plan.timelines.map(timeline => {
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
    }));
  },

  updateTimeline(prop: string, value: any, timelineId?: number) {
    timelineId = timelineId ?? get<number | null>(selectedTimelineId);

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        timelines: currentView.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            return {
              ...timeline,
              [prop]: value,
            };
          }
          return timeline;
        }),
      },
    }));
  },

  async updateView(currentView: View): Promise<void> {
    const { errors, message, success } = await req.updateView(currentView);

    if (success) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'View Updated Successfully',
      }).showToast();
    } else {
      console.log(errors);
      console.log(message);
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'View Update Failed',
      }).showToast();
    }
  },

  updateYAxis(prop: string, value: any) {
    const timelineId = get<number | null>(selectedTimelineId);
    const rowId = get<number | null>(selectedRowId);
    const yAxisId = get<number | null>(selectedYAxisId);

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        timelines: currentView.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            return {
              ...timeline,
              rows: timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    yAxes: row.yAxes.map(yAxis => {
                      if (yAxis.id === yAxisId) {
                        if (prop === 'id') selectedYAxisId.set(value);
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
    }));
  },
};
