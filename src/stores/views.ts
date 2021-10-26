import type { Subscriber, Unsubscriber, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { Axis, View } from '../types';
import { compare } from '../utilities/generic';
import { reqUpdateView } from '../utilities/requests';

/* Types. */

type ViewStore = {
  createYAxis(timelineId: number, rowId: number): void;
  deleteLayer(timelineId: number, rowId: number, layerId: number): void;
  deleteRow(timelineId: number, rowId: number): void;
  deleteTimeline(timelineId: number): void;
  deleteYAxis(timelineId: number, rowId: number, yAxisId: number): void;
  set: (this: void, value: any) => void;
  subscribe: (
    this: void,
    run: Subscriber<View>,
    invalidate?: any,
  ) => Unsubscriber;
  update(currentView: View): Promise<void>;
  updateLayer(
    timelineId: number,
    rowId: number,
    layerId: number,
    prop: string,
    value: any,
  ): void;
  updateRow(timelineId: number, rowId: number, prop: string, value: any): void;
  updateSectionSizes(newSizes: number[]): void;
  updateTimeline(timelineId: number, prop: string, value: any): void;
  updateYAxis(
    timelineId: number,
    rowId: number,
    yAxisId: number,
    prop: string,
    value: any,
  ): void;
};

/* Stores. */

export const view: ViewStore = (() => {
  const { set, subscribe, update: updateStore } = writable(null);
  return {
    createYAxis(timelineId: number, rowId: number): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
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
        };
      });
    },
    deleteLayer(timelineId: number, rowId: number, layerId: number): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
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
        };
      });
    },
    deleteRow(timelineId: number, rowId: number): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
            if (section.timeline && section.timeline.id === timelineId) {
              const rows = section.timeline.rows.filter(
                row => row.id !== rowId,
              );
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
        };
      });
    },
    deleteTimeline(timelineId: number): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.filter(section => {
            if (section.timeline && section.timeline.id === timelineId) {
              selectedTimelineId.set(null);
              return false;
            }
            return true;
          }),
        };
      });
    },
    deleteYAxis(timelineId: number, rowId: number, yAxisId: number): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
            if (section.timeline && section.timeline.id === timelineId) {
              return {
                ...section,
                timeline: {
                  ...section.timeline,
                  rows: section.timeline.rows.map(row => {
                    if (row.id === rowId) {
                      const yAxes = row.yAxes.filter(
                        yAxis => yAxis.id !== yAxisId,
                      );
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
        };
      });
    },
    set,
    subscribe,
    async update(currentView: View) {
      const { success } = await reqUpdateView(currentView);
      if (success) {
        Toastify({
          backgroundColor: '#2da44e',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'View Updated Successfully',
        }).showToast();
      }
    },
    updateLayer(
      timelineId: number,
      rowId: number,
      layerId: number,
      prop: string,
      value: any,
    ) {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
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
        };
      });
    },
    updateRow(timelineId: number, rowId: number, prop: string, value: any) {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
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
        };
      });
    },
    updateSectionSizes(newSizes: number[]) {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map((section, i) => {
            return {
              ...section,
              size: newSizes[i],
            };
          }),
        };
      });
    },
    updateTimeline(timelineId: number, prop: string, value: any) {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
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
        };
      });
    },
    updateYAxis(
      timelineId: number,
      rowId: number,
      yAxisId: number,
      prop: string,
      value: any,
    ) {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
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
        };
      });
    },
  };
})();

export const viewSectionIds = derived(view, $view =>
  $view ? $view.sections.map(({ id }) => `#section-${id}`) : [],
);

export const viewSectionSizes = derived(view, $view =>
  $view ? $view.sections.map(({ size }) => size) : [],
);

export const viewText = derived(view, $view =>
  $view ? JSON.stringify($view, null, 2) : '',
);

export const selectedTimelineId: Writable<number | null> = writable(null);

export const selectedTimeline = derived(
  [view, selectedTimelineId],
  ([$view, $selectedTimelineId]) => {
    if ($view !== null && $selectedTimelineId !== null) {
      for (const section of $view.sections) {
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

export function setSelectedTimeline(
  timelineId: number,
  rowId: number,
  layerId: number,
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
