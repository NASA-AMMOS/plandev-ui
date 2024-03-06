<svelte:options immutable={true} />

<script lang="ts">
  import { schedulingColumns, schedulingConditionsAll, schedulingGoalsAll } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { DataGridRowSelection } from '../../types/data-grid';
  import type { PlanSchedulingSpec } from '../../types/plan';
  import type { SchedulingCondition, SchedulingGoal, SchedulingGoalSlim } from '../../types/scheduling';
  import effects from '../../utilities/effects';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import SchedulingEditor from './SchedulingEditor.svelte';
  import SchedulingConditions from './conditions/SchedulingConditions.svelte';
  import SchedulingGoals from './goals/SchedulingGoals.svelte';

  export let plans: PlanSchedulingSpec[] | null;
  export let user: User | null;

  let selectedCondition: SchedulingCondition | null = null;
  let selectedGoal: SchedulingGoal | null = null;
  let selectedItem: SchedulingCondition | SchedulingGoal | null = null;
  let editorTitle: string = 'Scheduling';

  $: if (selectedCondition !== null) {
    const found = $schedulingConditionsAll.findIndex(condition => condition.id === selectedCondition?.id);
    if (found === -1) {
      selectedCondition = null;
    }
  }

  $: if (selectedGoal !== null) {
    const found = $schedulingGoalsAll.findIndex(goal => goal.id === selectedGoal?.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }

  async function deleteCondition(condition: SchedulingCondition) {
    const { scheduling_specification_conditions } = condition;
    const specification_id = scheduling_specification_conditions[0].specification_id;
    const plan = plans?.find(plan => plan.scheduling_specification?.id === specification_id);

    if (plan) {
      const success = await effects.deleteSchedulingCondition(condition, plan, user);

      if (success) {
        schedulingConditionsAll.filterValueById(condition.id);

        if (condition.id === selectedCondition?.id) {
          selectedCondition = null;
        }
      }
    }
  }

  async function deleteGoal(goal: SchedulingGoalSlim) {
    const { scheduling_specification_goal } = goal;
    let plan = null;
    if (scheduling_specification_goal) {
      const specification_id = scheduling_specification_goal.specification_id;
      plan = plans?.find(plan => plan.scheduling_specification?.id === specification_id) ?? null;
    }
    const success = await effects.deleteSchedulingGoal(goal, plan, user);
    if (success) {
      schedulingGoalsAll.filterValueById(goal.id);

      if (goal.id === selectedGoal?.id) {
        selectedGoal = null;
      }
    }
  }

  function deleteConditionContext(event: CustomEvent<number>) {
    const id = event.detail;
    const condition = $schedulingConditionsAll.find(s => s.id === id);
    if (condition) {
      deleteCondition(condition);
    }
  }

  function deleteGoalContext(event: CustomEvent<number>) {
    const id = event.detail;
    const goal = $schedulingGoalsAll.find(s => s.id === id);
    if (goal) {
      deleteGoal(goal);
    }
  }

  function selectCondition(condition: SchedulingCondition) {
    selectedCondition = condition;
    selectedItem = condition;
    selectedGoal = null;

    editorTitle = 'Scheduling Condition - Definition Editor (Read-only)';
  }

  function selectGoal(goal: SchedulingGoal) {
    selectedGoal = goal;
    selectedItem = goal;
    selectedCondition = null;

    editorTitle = 'Scheduling Goal - Definition Editor (Read-only)';
  }

  function toggleCondition(event: CustomEvent<DataGridRowSelection<SchedulingCondition>>) {
    const {
      detail: { data: clickedCondition, isSelected },
    } = event;

    if (isSelected) {
      selectCondition(clickedCondition);
    }
  }

  function toggleGoal(event: CustomEvent<DataGridRowSelection<SchedulingGoal>>) {
    const {
      detail: { data: clickedGoal, isSelected },
    } = event;

    if (isSelected) {
      selectGoal(clickedGoal);
    }
  }
</script>

<CssGrid bind:columns={$schedulingColumns}>
  <CssGrid rows="1fr 3px 1fr">
    <SchedulingGoals
      {plans}
      {selectedGoal}
      schedulingGoals={$schedulingGoalsAll}
      {user}
      on:deleteGoal={deleteGoalContext}
      on:rowSelected={toggleGoal}
    />
    <CssGridGutter track={1} type="row" />
    <SchedulingConditions
      {plans}
      {selectedCondition}
      schedulingConditions={$schedulingConditionsAll}
      {user}
      on:deleteCondition={deleteConditionContext}
      on:rowSelected={toggleCondition}
    />
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  <SchedulingEditor
    scheduleItemDefinition={selectedItem?.definition ?? 'No Scheduling Goal or Condition Selected'}
    scheduleItemModelId={selectedItem?.model_id}
    readOnly={true}
    title={editorTitle}
    {user}
  />
</CssGrid>
