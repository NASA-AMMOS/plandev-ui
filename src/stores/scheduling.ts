import { keyBy } from 'lodash-es';
import { derived, get, writable, type Writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { plan } from '../stores/plan';
import { Status } from '../utilities/enums';
import { sleep } from '../utilities/generic';
import gql from '../utilities/gql';
import req from '../utilities/requests';
import { activitiesMap, selectedActivityId } from './activities';
import { simulationStatus } from './simulation';
import { getGqlSubscribable } from './subscribable';

/* Stores. */

export const schedulingDslTypes: Writable<string> = writable('');

export const schedulingSpecGoals = getGqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: -1 },
  [],
);

export const schedulingStatus: Writable<Status> = writable(Status.Clean);

export const selectedGoalId: Writable<number | null> = writable(null);

export const selectedSpecId = derived(plan, $plan => $plan?.scheduling_specifications[0]?.id ?? null);

export const selectedSpecGoal = derived(
  [schedulingSpecGoals, selectedSpecId, selectedGoalId],
  ([$schedulingSpecGoals, $selectedSpecId, $selectedGoalId]) =>
    $schedulingSpecGoals.find(
      ({ goal: { id: goal_id }, specification_id }) =>
        $selectedSpecId !== null &&
        $selectedGoalId !== null &&
        $selectedSpecId === specification_id &&
        $selectedGoalId === goal_id,
    ) ?? null,
);

/* Action Functions. */

export const schedulingActions = {
  async createGoal(definition: string, description: string, name: string, userId: string): Promise<void> {
    const { model } = get(plan);
    const specId = get(selectedSpecId);

    const goal: SchedulingGoalInsertInput = {
      author: userId,
      definition,
      description,
      last_modified_by: userId,
      model_id: model.id,
      name,
    };
    const newGoal = await req.createSchedulingGoal(goal);

    const specGoal: SchedulingSpecGoalInsertInput = {
      goal_id: newGoal.id,
      specification_id: specId,
    };
    await req.createSchedulingSpecGoal(specGoal);

    schedulingActions.selectGoal(null);

    if (newGoal) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Scheduling Goal Created Successfully',
      }).showToast();
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Scheduling Goal Create Failed',
      }).showToast();
    }
  },

  async deleteGoal(id: number): Promise<void> {
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
  },

  reset(): void {
    schedulingDslTypes.set('');
    schedulingStatus.set(Status.Clean);
    selectedGoalId.set(null);
  },

  async runScheduling(): Promise<void> {
    const { id: planId } = get(plan);
    const specification_id = get(selectedSpecId);

    const plan_revision = await req.getPlanRevision(planId);
    await req.updateSchedulingSpec(specification_id, { plan_revision });

    let tries = 0;
    schedulingStatus.set(Status.Executing);

    do {
      const { reason, status } = await req.schedule(specification_id);

      if (status === 'complete') {
        const newActivities = await req.getActivitiesForPlan(planId);

        activitiesMap.set(keyBy(newActivities, 'id'));
        selectedActivityId.set(null);
        simulationStatus.update(Status.Dirty);
        schedulingStatus.set(Status.Complete);
        return;
      } else if (status === 'failed') {
        schedulingStatus.set(Status.Failed);
        console.log(reason);
        return;
      } else if (status === 'incomplete') {
        schedulingStatus.set(Status.Incomplete);
        console.log(reason);
      }

      await sleep();
      ++tries;
    } while (tries < 10); // Trying a max of 10 times.

    schedulingStatus.set(Status.Incomplete);
  },

  selectGoal(goalId: number | null = null): void {
    selectedGoalId.set(goalId);
  },

  async updateGoal(id: number, goal: Partial<SchedulingGoal>): Promise<void> {
    const success = await req.updateSchedulingGoal(id, goal);

    if (success) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Scheduling Goal Updated Successfully',
      }).showToast();
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Scheduling Goal Update Failed',
      }).showToast();
    }
  },
};
