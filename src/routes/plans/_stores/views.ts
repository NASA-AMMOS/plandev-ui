import type { Subscriber, Unsubscriber } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { Row, View } from '../../../types';
import { reqUpdateView } from '../../../utilities/requests';

type ViewStore = {
  set: (this: void, value: any) => void;
  subscribe: (
    this: void,
    run: Subscriber<View>,
    invalidate?: any,
  ) => Unsubscriber;
  update(currentView: View): Promise<void>;
  updateRowHeight(newHeight: number, rowId: string, timelineId: string): void;
  updateRows(rows: Row[], timelineId: string): void;
  updateSizes(newSizes: number[]): void;
};

export const view: ViewStore = (() => {
  const { set, subscribe, update: updateStore } = writable(null);
  return {
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
    updateRowHeight(newHeight: number, rowId: string, timelineId: string) {
      updateStore(view => {
        for (const section of view.sections) {
          if (section?.timeline && section.timeline.id === timelineId) {
            for (const row of section.timeline.rows) {
              if (row.id === rowId) {
                row.height = newHeight;
              }
            }
          }
        }
        return view;
      });
    },
    updateRows(rows: Row[], timelineId: string) {
      updateStore(view => {
        for (const section of view.sections) {
          if (section?.timeline && section.timeline.id === timelineId) {
            section.timeline.rows = rows;
          }
        }
        return view;
      });
    },
    updateSizes(newSizes: number[]) {
      updateStore(view => {
        for (let i = 0; i < newSizes.length; ++i) {
          view.sections[i].size = newSizes[i];
        }
        return view;
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
