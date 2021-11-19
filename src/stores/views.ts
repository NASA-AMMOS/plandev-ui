import type { Writable } from 'svelte/store';
import { derived, get, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { Axis, View } from '../types';
import { compare, setQueryParam } from '../utilities/generic';
import { reqCreateView, reqUpdateView } from '../utilities/requests';

/* Stores. */

export const view: Writable<View | null> = writable(null);

export const viewSectionIds = derived(view, $view =>
  $view ? $view.plan.sections.map(({ id }) => `#section-${id}`) : [],
);

export const viewSectionSizes = derived(view, $view =>
  $view ? $view.plan.sections.map(({ size }) => size) : [],
);

export const viewText = derived(view, $view =>
  $view ? JSON.stringify($view, null, 2) : '',
);

export const selectedTimelineId: Writable<number | null> = writable(null);

export const selectedTimeline = derived(
  [view, selectedTimelineId],
  ([$view, $selectedTimelineId]) => {
    if ($view !== null && $selectedTimelineId !== null) {
      for (const section of $view.plan.sections) {
        if (section.timeline && section.timeline.id === $selectedTimelineId) {
          return section.timeline;
        }
      }
    }
    return null;
  },
);

export const selectedRowId: Writable<number | null> = writable(null);

export const selectedRow = derived(
  [selectedTimeline, selectedRowId],
  ([$selectedTimeline, $selectedRowId]) => {
    if ($selectedTimeline !== null) {
      for (const row of $selectedTimeline.rows) {
        if (row.id === $selectedRowId) {
          return row;
        }
      }
    }
    return null;
  },
);

export const selectedYAxisId: Writable<number | null> = writable(null);

export const selectedYAxis = derived(
  [selectedRow, selectedYAxisId],
  ([$selectedRow, $selectedYAxisId]) => {
    if ($selectedRow !== null) {
      for (const yAxis of $selectedRow.yAxes) {
        if (yAxis.id === $selectedYAxisId) {
          return yAxis;
        }
      }
    }
    return null;
  },
);

export const selectedLayerId: Writable<number | null> = writable(null);

export const selectedLayer = derived(
  [selectedRow, selectedLayerId],
  ([$selectedRow, $selectedLayerId]) => {
    if ($selectedRow !== null) {
      for (const layer of $selectedRow.layers) {
        if (layer.id === $selectedLayerId) {
          return layer;
        }
      }
    }
    return null;
  },
);

/* Utility Functions. */

export async function createView(currentView: View): Promise<void> {
  const {
    errors,
    message,
    success,
    view: newView,
  } = await reqCreateView(currentView);

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
}

export function createYAxis(): void {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
                if (row.id === rowId) {
                  const { yAxes } = row;
                  const [yAxis] = yAxes.sort((a, b) =>
                    compare(a.id, b.id, false),
                  );
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
            },
          };
        }
        return section;
      }),
    },
  }));
}

export function deleteLayer(): void {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const layerId = get<number | null>(selectedLayerId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
                if (row.id === rowId) {
                  const layers = row.layers.filter(
                    layer => layer.id !== layerId,
                  );
                  if (layers.length) selectedLayerId.set(layers[0].id);
                  return {
                    ...row,
                    layers,
                  };
                }
                return row;
              }),
            },
          };
        }
        return section;
      }),
    },
  }));
}

export function deleteRow(): void {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          const rows = section.timeline.rows.filter(row => row.id !== rowId);
          if (rows.length) selectedRowId.set(rows[0].id);
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows,
            },
          };
        }
        return section;
      }),
    },
  }));
}

export function deleteTimeline(): void {
  const timelineId = get<number | null>(selectedTimelineId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.filter(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          selectedTimelineId.set(null);
          return false;
        }
        return true;
      }),
    },
  }));
}

export function deleteYAxis(): void {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const yAxisId = get<number | null>(selectedYAxisId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
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
            },
          };
        }
        return section;
      }),
    },
  }));
}

export function setSelectedTimeline(
  timelineId: number | null,
  rowId: number | null,
  layerId: number | null,
  yAxisId: number | null,
): void {
  selectedTimelineId.set(timelineId);
  selectedRowId.set(rowId);
  selectedYAxisId.set(yAxisId);
  selectedLayerId.set(layerId);
}

export function unsetSelectedTimeline(): void {
  selectedTimelineId.set(null);
  selectedRowId.set(null);
  selectedYAxisId.set(null);
  selectedLayerId.set(null);
}

export function updateLayer(prop: string, value: any) {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const layerId = get<number | null>(selectedLayerId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
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
            },
          };
        }
        return section;
      }),
    },
  }));
}

export function updateRow(
  prop: string,
  value: any,
  timelineId?: number,
  rowId?: number,
) {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);
  rowId = rowId ?? get<number | null>(selectedRowId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    [prop]: value,
                  };
                }
                return row;
              }),
            },
          };
        }
        return section;
      }),
    },
  }));
}

export function updateSectionSizes(newSizes: number[]) {
  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map((section, i) => {
        return {
          ...section,
          size: newSizes[i],
        };
      }),
    },
  }));
}

export function updateTimeline(prop: string, value: any, timelineId?: number) {
  timelineId = timelineId ?? get<number | null>(selectedTimelineId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              [prop]: value,
            },
          };
        }
        return section;
      }),
    },
  }));
}

export async function updateView(currentView: View): Promise<void> {
  const { errors, message, success } = await reqUpdateView(currentView);

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
}

export async function updateYAxis(prop: string, value: any) {
  const timelineId = get<number | null>(selectedTimelineId);
  const rowId = get<number | null>(selectedRowId);
  const yAxisId = get<number | null>(selectedYAxisId);

  view.update(currentView => ({
    ...currentView,
    plan: {
      ...currentView.plan,
      sections: currentView.plan.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
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
            },
          };
        }
        return section;
      }),
    },
  }));
}
