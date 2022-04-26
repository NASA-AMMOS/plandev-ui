import type { Writable } from 'svelte/store';
import { derived, get, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { compare, setQueryParam } from '../utilities/generic';
import {
  activitiesGrid,
  constraintsGrid,
  schedulingGrid,
  simulationGrid,
  timelineGrid,
  updateGrid,
  viewsGrid,
} from '../utilities/grid';
import req from '../utilities/requests';

/* Stores. */

export const view: Writable<View | null> = writable(null);

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

  createYAxis(): void {
    const timelineId = get<number | null>(selectedTimelineId);
    const rowId = get<number | null>(selectedRowId);

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
                  const { yAxes } = row;
                  const [yAxis] = yAxes.sort((a, b) => compare(a.id, b.id, false));
                  const newYAxis: Axis = {
                    color: '#000000',
                    id: yAxis !== undefined ? yAxis.id + 1 : 0,
                    label: { text: '' },
                    scaleDomain: [],
                    tickCount: 0,
                  };
                  selectedYAxisId.set(newYAxis.id);
                  return {
                    ...row,
                    yAxes: [...yAxes, newYAxis],
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

  deleteLayer(): void {
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
                  const layers = row.layers.filter(layer => layer.id !== layerId);
                  if (layers.length) selectedLayerId.set(layers[0].id);
                  return {
                    ...row,
                    layers,
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

  deleteRow(): void {
    const timelineId = get<number | null>(selectedTimelineId);
    const rowId = get<number | null>(selectedRowId);

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        timelines: currentView.plan.timelines.map(timeline => {
          if (timeline && timeline.id === timelineId) {
            const rows = timeline.rows.filter(row => row.id !== rowId);
            if (rows.length) selectedRowId.set(rows[0].id);

            return {
              ...timeline,
              rows,
            };
          }
          return timeline;
        }),
      },
    }));
  },

  deleteTimeline(): void {
    const timelineId = get<number | null>(selectedTimelineId);

    view.update(currentView => ({
      ...currentView,
      plan: {
        ...currentView.plan,
        timelines: currentView.plan.timelines.filter(timeline => {
          if (timeline && timeline.id === timelineId) {
            selectedTimelineId.set(null);
            return false;
          }
          return true;
        }),
      },
    }));
  },

  deleteYAxis(): void {
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
                  const yAxes = row.yAxes.filter(yAxis => yAxis.id !== yAxisId);
                  if (yAxes.length) selectedYAxisId.set(yAxes[0].id);
                  return {
                    ...row,
                    yAxes,
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
    } else if (title === 'Timeline') {
      layout = timelineGrid;
    } else if (title === 'Views') {
      layout = viewsGrid;
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

  setSelectedTimeline(timelineId: number | null): void {
    selectedTimelineId.set(timelineId);
    const currentTimeline = get(selectedTimeline);

    if (currentTimeline) {
      const firstRow = currentTimeline.rows[0];

      if (firstRow) {
        selectedRowId.set(firstRow.id);

        const firstLayer = firstRow.layers[0];
        if (firstLayer) selectedLayerId.set(firstLayer.id);

        const firstYAxis = firstRow.yAxes[0];
        if (firstYAxis) selectedYAxisId.set(firstYAxis.id);
      }
    }
  },

  updateLayer(prop: string, value: any) {
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
