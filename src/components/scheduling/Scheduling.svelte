<svelte:options immutable={true} />

<script lang="ts">
  import {
    schedulingColumns,
    schedulingConditionResponses,
    schedulingConditions,
    schedulingGoalResponses,
    schedulingGoals,
  } from '../../stores/scheduling';
  import type { User } from '../../types/app';
  import type { DataGridRowSelection } from '../../types/data-grid';
  import type { SchedulingConditionMetadata, SchedulingGoalMetadata } from '../../types/scheduling';
  import effects from '../../utilities/effects';
  import { isAdminRole } from '../../utilities/permissions';
  import DefinitionEditor from '../ui/Association/DefinitionEditor.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import SchedulingConditions from './conditions/SchedulingConditions.svelte';
  import SchedulingGoals from './goals/SchedulingGoals.svelte';

  export let user: User | null;

  let editorTitle: string = 'Scheduling';

  let allowedSchedulingConditions: SchedulingConditionMetadata[] = [];
  let allowedSchedulingGoals: SchedulingGoalMetadata[] = [];
  let selectedCondition: SchedulingConditionMetadata | null = null;
  let selectedGoal: SchedulingGoalMetadata | null = null;
  let selectedItem: SchedulingConditionMetadata | SchedulingGoalMetadata | null = null;

  // TODO: remove this after db merge as it becomes redundant
  $: allowedSchedulingConditions = $schedulingConditions.filter(({ owner, public: isPublic }) => {
    if (!isPublic && !isAdminRole(user?.activeRole)) {
      return owner === user?.id;
    }
    return true;
  });
  // TODO: remove this after db merge as it becomes redundant
  $: allowedSchedulingGoals = $schedulingGoals.filter(({ owner, public: isPublic }) => {
    if (!isPublic && !isAdminRole(user?.activeRole)) {
      return owner === user?.id;
    }
    return true;
  });
  $: if (selectedCondition !== null) {
    const found = allowedSchedulingConditions.findIndex(condition => condition.id === selectedCondition?.id);
    if (found === -1) {
      selectedCondition = null;
    }
  }

  $: if (selectedGoal !== null) {
    const found = allowedSchedulingGoals.findIndex(goal => goal.id === selectedGoal?.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }

  async function deleteCondition(condition: SchedulingConditionMetadata) {
    const success = await effects.deleteSchedulingCondition(condition, user);

    if (success) {
      schedulingConditionResponses.filterValueById(condition.id);

      if (condition.id === selectedCondition?.id) {
        selectedCondition = null;
      }
    }
  }

  async function deleteGoal(goal: SchedulingGoalMetadata) {
    const success = await effects.deleteSchedulingGoal(goal, user);
    if (success) {
      schedulingGoalResponses.filterValueById(goal.id);

      if (goal.id === selectedGoal?.id) {
        selectedGoal = null;
      }
    }
  }

  function deleteConditionContext(event: CustomEvent<number>) {
    const id = event.detail;
    const condition = allowedSchedulingConditions.find(s => s.id === id);
    if (condition) {
      deleteCondition(condition);
    }
  }

  function deleteGoalContext(event: CustomEvent<number>) {
    const id = event.detail;
    const goal = allowedSchedulingGoals.find(s => s.id === id);
    if (goal) {
      deleteGoal(goal);
    }
  }

  function selectCondition(condition: SchedulingConditionMetadata) {
    selectedCondition = condition;
    selectedItem = condition;
    selectedGoal = null;

    editorTitle = 'Scheduling Condition - Definition Editor (Read-only)';
  }

  function selectGoal(goal: SchedulingGoalMetadata) {
    selectedGoal = goal;
    selectedItem = goal;
    selectedCondition = null;

    editorTitle = 'Scheduling Goal - Definition Editor (Read-only)';
  }

  function toggleCondition(event: CustomEvent<DataGridRowSelection<SchedulingConditionMetadata>>) {
    const {
      detail: { data: clickedCondition, isSelected },
    } = event;

    if (isSelected) {
      selectCondition(clickedCondition);
    }
  }

  function toggleGoal(event: CustomEvent<DataGridRowSelection<SchedulingGoalMetadata>>) {
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
      schedulingGoals={allowedSchedulingGoals}
      {user}
      on:deleteGoal={deleteGoalContext}
      on:rowSelected={toggleGoal}
    />
    <CssGridGutter track={1} type="row" />
    <SchedulingConditions
      {selectedCondition}
      schedulingConditions={allowedSchedulingConditions}
      {user}
      on:deleteCondition={deleteConditionContext}
      on:rowSelected={toggleCondition}
    />
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  <DefinitionEditor
    definition={selectedItem
      ? selectedItem?.versions[selectedItem.versions.length - 1].definition
      : 'No Scheduling Goal or Condition Selected'}
    readOnly={true}
    title={editorTitle}
  />
</CssGrid>
