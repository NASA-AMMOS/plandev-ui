<svelte:options immutable={true} />

<script lang="ts">
  import { schedulingColumns, schedulingConditions, schedulingGoals } from '../../stores/scheduling';
  import type { DataGridRowSelection } from '../../types/data-grid';
  import type { SchedulingCondition, SchedulingGoal } from '../../types/scheduling';
  import effects from '../../utilities/effects';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import SchedulingConditions from './conditions/SchedulingConditions.svelte';
  import SchedulingGoals from './goals/SchedulingGoals.svelte';
  import SchedulingEditor from './SchedulingEditor.svelte';

  let selectedCondition: SchedulingCondition | null = null;
  let selectedGoal: SchedulingGoal | null = null;
  let selectedItem: SchedulingCondition | SchedulingGoal | null = null;
  let editorTitle: string = 'Scheduling';

  $: if (selectedCondition !== null) {
    const found = $schedulingConditions.findIndex(condition => condition.id === selectedCondition.id);
    if (found === -1) {
      selectedCondition = null;
    }
  }

  $: if (selectedGoal !== null) {
    const found = $schedulingGoals.findIndex(goal => goal.id === selectedGoal.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }

  async function deleteCondition({ id }: Pick<SchedulingCondition, 'id'>) {
    const success = await effects.deleteSchedulingCondition(id);

    if (success) {
      schedulingConditions.filterValueById(id);

      if (id === selectedCondition?.id) {
        selectedCondition = null;
      }
    }
  }

  async function deleteGoal({ id }: Pick<SchedulingGoal, 'id'>) {
    const success = await effects.deleteSchedulingGoal(id);

    if (success) {
      schedulingGoals.filterValueById(id);

      if (id === selectedGoal?.id) {
        selectedGoal = null;
      }
    }
  }

  function deleteConditionContext(event: CustomEvent<number>) {
    deleteCondition({ id: event.detail });
  }

  function deleteGoalContext(event: CustomEvent<number>) {
    deleteGoal({ id: event.detail });
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
      {selectedGoal}
      schedulingGoals={$schedulingGoals}
      on:deleteGoal={deleteGoalContext}
      on:rowSelected={toggleGoal}
    />
    <CssGridGutter track={1} type="row" />
    <SchedulingConditions
      {selectedCondition}
      schedulingConditions={$schedulingConditions}
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
  />
</CssGrid>
