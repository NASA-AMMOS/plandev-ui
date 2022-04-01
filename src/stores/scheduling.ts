import { keyBy } from 'lodash-es';
import { derived, get, writable, type Writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { plan } from '../stores/plan';
import { Status } from '../utilities/enums';
import gql from '../utilities/gql';
import req from '../utilities/requests';
import { activitiesMap, selectedActivityId } from './activities';
import { schedulingPanelEditor } from './panels';
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

export const selectedSpecId = derived(
  plan,
  $plan => $plan?.scheduling_specifications[0]?.id ?? null,
);

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
  closeGoalEditor(): void {
    schedulingPanelEditor.set(false);
    selectedGoalId.set(null);
  },

  async createGoal(
    definition: string,
    description: string,
    name: string,
    userId: string,
  ): Promise<void> {
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

    const priorities = await req.getSchedulingSpecGoalPriorities(specId);
    const priority = priorities.pop() + 1 || 1;
    const specGoal: SchedulingSpecGoalInsertInput = {
      goal_id: newGoal.id,
      priority,
      specification_id: specId,
    };
    await req.createSchedulingSpecGoal(specGoal);

    schedulingActions.closeGoalEditor();

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

  openGoalEditor(goalId: number | null = null): void {
    schedulingPanelEditor.set(true);
    selectedGoalId.set(goalId);
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

    schedulingStatus.set(Status.Executing);
    const { reason, status } = await req.schedule(specification_id);

    if (status === 'complete') {
      const newActivities = await req.getActivitiesForPlan(planId);

      activitiesMap.set(keyBy(newActivities, 'id'));
      selectedActivityId.set(null);
      simulationStatus.update(Status.Dirty);
      schedulingStatus.set(Status.Complete);
    } else if (status === 'failed') {
      schedulingStatus.set(Status.Failed);
      console.log(reason);
    } else if (status === 'incomplete') {
      schedulingStatus.set(Status.Incomplete);
      console.log(reason);
    }
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
