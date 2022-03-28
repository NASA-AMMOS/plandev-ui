import {
  derived,
  get,
  writable,
  type Readable,
  type Writable,
} from 'svelte/store';
import Toastify from 'toastify-js';
import { selectedActivityPanel } from '../stores/panels';
import { activitiesToPoints } from '../utilities/activities';
import { Status } from '../utilities/enums';
import req from '../utilities/requests';
import { plan } from './plan';
import { simulationStatus } from './simulation';

/* Stores. */

/**
 * Main store for activities.
 */
export const activitiesMap: Writable<ActivitiesMap> = writable({});

/**
 * Derived store that converts the activities map into a list of activities.
 */
export const activities = derived(activitiesMap, $activitiesMap =>
  Object.values($activitiesMap),
) as Readable<Activity[]>;

/**
 * Store that tracks the currently selected activity ID.
 */
export const selectedActivityId: Writable<number | null> = writable(null);

/**
 * Derived store that returns either the selected activity or null if no activity is selected.
 */
export const selectedActivity = derived(
  [activitiesMap, selectedActivityId],
  ([$activitiesMap, $selectedActivityId]) =>
    $activitiesMap[$selectedActivityId] || null,
);

/**
 * Derived store that transforms activities to activity points.
 * Returns a list of activity points and nested child activity points sorted by start time ascending.
 */
export const activityPoints = derived(
  [activitiesMap, activities, selectedActivityId],
  ([$activitiesMap, $activities, $selectedActivityId]) =>
    activitiesToPoints($activitiesMap, $activities, $selectedActivityId),
);

/* Action Functions. */

export const activityActions = {
  async createActivity(
    argumentsMap: ArgumentsMap,
    startTime: string,
    type: string,
  ) {
    const newActivity = await req.createActivity(argumentsMap, startTime, type);

    if (newActivity) {
      const { id } = newActivity;
      activitiesMap.update(activities => {
        activities[id] = newActivity;
        return { ...activities };
      });

      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Activity Created Successfully',
      }).showToast();

      activityActions.selectActivity(id);
      simulationStatus.update(Status.Dirty);

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

  async createActivityAtPlanStart(activityType: ActivityType) {
    const { startTime } = get(plan);
    activityActions.createActivity({}, startTime, activityType.name);
  },

  async deleteActivity(id: number): Promise<void> {
    const success = await req.deleteActivity(id);

    if (success) {
      activitiesMap.update(activities => {
        delete activities[id];
        return { ...activities };
      });

      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Activity Deleted Successfully',
      }).showToast();

      simulationStatus.update(Status.Dirty);
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

  reset(): void {
    activitiesMap.set({});
    selectedActivityId.set(null);
  },

  selectActivity(id: number): void {
    selectedActivityId.set(id);
    selectedActivityPanel.show();
  },

  async updateActivity(
    id: number,
    partialActivity: Partial<Activity>,
    doRequest: boolean = true,
  ) {
    if (doRequest) {
      const success = await req.updateActivity(id, partialActivity);

      if (success) {
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
    }

    activitiesMap.update(currActivitiesMap => ({
      ...currActivitiesMap,
      [id]: {
        ...currActivitiesMap[id],
        ...partialActivity,
      },
    }));

    simulationStatus.update(Status.Dirty);
  },
};
