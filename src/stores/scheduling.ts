import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { Status } from '../utilities/enums';
import gql from '../utilities/gql';
import req from '../utilities/requests';
import { getGqlSubscribable } from './subscribable';

/* Stores. */

export const schedulingSpecGoals = getGqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: -1 },
  [],
);

export const schedulingStatus: Writable<Status> = writable(Status.Clean);

/* Utility Functions. */

export async function createSchedulingGoal(
  goal: SchedulingGoalInsertInput,
): Promise<SchedulingGoal | null> {
  const newGoal = await req.createSchedulingGoal(goal);
  if (newGoal) {
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Scheduling Goal Created Successfully',
    }).showToast();
    return newGoal;
  } else {
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Scheduling Goal Create Failed',
    }).showToast();
    return null;
  }
}

export async function deleteSchedulingGoal(id: number): Promise<void> {
  const success = await req.deleteSchedulingGoal(id);
  if (success) {
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Scheduling Goal Deleted Successfully',
    }).showToast();
  } else {
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Scheduling Goal Delete Failed',
    }).showToast();
  }
}
