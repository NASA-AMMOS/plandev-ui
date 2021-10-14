import type { Subscriber, Unsubscriber, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { View } from '../types';
import { reqUpdateView } from '../utilities/requests';

/* Types. */

type ViewStore = {
  deleteLayer(timelineId: string, rowId: string, layerId: string): void;
  deleteRow(timelineId: string, rowId: string): void;
  deleteTimeline(timelineId: string): void;
  set: (this: void, value: any) => void;
  subscribe: (
    this: void,
    run: Subscriber<View>,
    invalidate?: any,
  ) => Unsubscriber;
  update(currentView: View): Promise<void>;
  updateLayer(
    timelineId: string,
    rowId: string,
    layerId: string,
    prop: string,
    value: any,
  ): void;
  updateRow(timelineId: string, rowId: string, prop: string, value: any): void;
  updateSectionSizes(newSizes: number[]): void;
  updateTimeline(timelineId: string, prop: string, value: any): void;
};

/* Stores. */

export const view: ViewStore = (() => {
  const { set, subscribe, update: updateStore } = writable(null);
  return {
    deleteLayer(timelineId: string, rowId: string, layerId: string): void {
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
                        layers: row.layers.filter(
                          layer => layer.id !== layerId,
                        ),
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
    deleteRow(timelineId: string, rowId: string): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.map(section => {
            if (section.timeline && section.timeline.id === timelineId) {
              return {
                ...section,
                timeline: {
                  ...section.timeline,
                  rows: section.timeline.rows.filter(row => row.id !== rowId),
                },
              };
            }
            return section;
          }),
        };
      });
    },
    deleteTimeline(timelineId: string): void {
      updateStore((view: View): View => {
        return {
          ...view,
          sections: view.sections.filter(section => {
            if (section.timeline) {
              return section.timeline.id !== timelineId;
            }
            return true;
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
      timelineId: string,
      rowId: string,
      layerId: string,
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
    updateRow(timelineId: string, rowId: string, prop: string, value: any) {
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
    updateTimeline(timelineId: string, prop: string, value: any) {
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
  };
})();

export const viewSectionIds = derived(view, $view =>
  $view ? $view.sections.map(({ id }) => `#${id}`) : [],
);

export const viewSectionSizes = derived(view, $view =>
  $view ? $view.sections.map(({ size }) => size) : [],
);

export const viewText = derived(view, $view =>
  $view ? JSON.stringify($view, null, 2) : '',
);

export const selectedTimelineId: Writable<string | null> = writable(null);

export const selectedTimeline = derived(
  [view, selectedTimelineId],
  ([$view, $selectedTimelineId]) => {
    if ($view && $selectedTimelineId) {
      for (const section of $view.sections) {
        if (section.timeline && section.timeline.id === $selectedTimelineId) {
          return section.timeline;
        }
      }
    }
    return null;
  },
);

export const selectedRowId: Writable<string | null> = writable(null);

export const selectedRow = derived(
  [selectedTimeline, selectedRowId],
  ([$selectedTimeline, $selectedRowId]) => {
    if ($selectedTimeline) {
      for (const row of $selectedTimeline.rows) {
        if (row.id === $selectedRowId) {
          return row;
        }
      }
    }
    return null;
  },
);

export const selectedLayerId: Writable<string | null> = writable(null);

export const selectedLayer = derived(
  [selectedRow, selectedLayerId],
  ([$selectedRow, $selectedLayerId]) => {
    if ($selectedRow) {
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
  timelineId: string,
  rowId: string,
  layerId: string,
): void {
  selectedTimelineId.set(timelineId);
  selectedRowId.set(rowId);
  selectedLayerId.set(layerId);
}

export function unsetSelectedTimeline(): void {
  selectedTimelineId.set(null);
  selectedRowId.set(null);
  selectedLayerId.set(null);
}
