import type { Readable, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { Activity, NewActivity, UpdateActivity } from '../../../types';
import {
  reqCreateActivity,
  reqDeleteActivity,
  reqUpdateActivity,
} from '../../../utilities/requests';

/**
 * Main store for activity management.
 * Contains a map of all activities and keeps them in sync with the database.
 */
export const activitiesMap = (() => {
  const { set, subscribe, update: updateStore } = writable({});
  return {
    async create(activity: NewActivity, planId: string, token: string) {
      const { ids, success } = await reqCreateActivity(activity, planId, token);
      if (success) {
        const [id] = ids;
        const newActivity: Activity = {
          ...activity,
          children: [],
          duration: 0,
          id,
          parent: null,
        };
        updateStore(activitiesMap => {
          activitiesMap[id] = newActivity;
          return activitiesMap;
        });
        Toastify({
          backgroundColor: '#2da44e',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'Activity Created Successfully',
        }).showToast();
        return { id, success: true };
      } else {
        Toastify({
          backgroundColor: '#a32a2a',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'Activity Create Failed',
        }).showToast();
        return { id: null, success: false };
      }
    },
    async delete(activityId: string, planId: string, token: string) {
      const { success } = await reqDeleteActivity(activityId, planId, token);
      if (success) {
        updateStore(activitiesMap => {
          delete activitiesMap[activityId];
          return activitiesMap;
        });
        Toastify({
          backgroundColor: '#2da44e',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'Activity Deleted Successfully',
        }).showToast();
      } else {
        Toastify({
          backgroundColor: '#a32a2a',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'Activity Delete Failed',
        }).showToast();
      }
    },
    set,
    subscribe,
    async update(activity: UpdateActivity, planId: string, token: string) {
      const { success } = await reqUpdateActivity(activity, planId, token);
      if (success) {
        updateStore(activitiesMap => ({
          ...activitiesMap,
          [activity.id]: {
            ...activitiesMap[activity.id],
            ...activity,
          },
        }));
        Toastify({
          backgroundColor: '#2da44e',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'Activity Updated Successfully',
        }).showToast();
      } else {
        Toastify({
          backgroundColor: '#a32a2a',
          duration: 3000,
          gravity: 'bottom',
          position: 'left',
          text: 'Activity Update Failed',
        }).showToast();
      }
    },
  };
})();

/**
 * Derived store that converts the activities map into a list of activities.
 */
export const activities = derived(activitiesMap, $activitiesMap =>
  Object.values($activitiesMap),
) as Readable<Activity[]>;

/**
 * Store that tracks the currently selected activity ID.
 */
export const selectedActivityId: Writable<string | null> = writable(null);

/**
 * Derived store that returns either the selected activity or null if no activity is selected.
 */
export const selectedActivity = derived(
  [activitiesMap, selectedActivityId],
  ([$activitiesMap, $selectedActivityId]) =>
    $activitiesMap[$selectedActivityId] || null,
);
