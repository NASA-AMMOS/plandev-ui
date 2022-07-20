<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { schedulingGoals, schedulingGoalsColumns } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import Table from '../ui/Table.svelte';
  import SchedulingGoalEditor from './SchedulingGoalEditor.svelte';

  let filteredGoals: SchedulingGoal[] = [];
  let filterText: string = '';
  let selectedGoal: SchedulingGoal | null = null;
  let sortedGoals: SchedulingGoal[] = [];

  $: filteredGoals = $schedulingGoals.filter(goal => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${goal.id}`.includes(filterTextLowerCase);
    const includesName = goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: sortedGoals = filteredGoals.sort((a, b) => compare(a.id, b.id));
  $: if (selectedGoal !== null) {
    const found = $schedulingGoals.findIndex(goal => goal.id === selectedGoal.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }

  async function deleteGoal(id: number) {
    const success = await effects.deleteSchedulingGoal(id);

    if (success) {
      sortedGoals = sortedGoals.filter(goal => goal.id !== id);

      if (id === selectedGoal?.id) {
        selectedGoal = null;
      }
    }
  }

  function toggleGoal(event: CustomEvent<SchedulingGoal>) {
    const { detail: clickedGoal } = event;

    if (selectedGoal?.id === clickedGoal.id) {
      selectedGoal = null;
    } else {
      selectedGoal = clickedGoal;
    }
  }
</script>

<CssGrid bind:columns={$schedulingGoalsColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>Scheduling Goals</Chip>

      <Input>
        <input bind:value={filterText} class="st-input" placeholder="Filter goals" style="width: 300px" />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/scheduling/goals/new`)}>
          New
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if sortedGoals.length}
        <Table
          let:currentRow
          columnDefs={[
            { field: 'id', name: 'Goal ID', sortable: true },
            { field: 'name', name: 'Name', sortable: true },
            { field: 'model_id', name: 'Model ID', sortable: true },
          ]}
          rowActions
          rowData={sortedGoals}
          rowSelectionMode="single"
          selectedRowId={selectedGoal?.id}
          on:rowClick={toggleGoal}
        >
          <div slot="actions-cell">
            <button
              class="st-button icon"
              on:click|stopPropagation={() => goto(`${base}/scheduling/goals/edit/${currentRow.id}`)}
              use:tooltip={{ content: 'Edit Goal', placement: 'bottom' }}
            >
              <i class="bi bi-pencil" />
            </button>
            <button
              class="st-button icon"
              on:click|stopPropagation={() => deleteGoal(currentRow.id)}
              use:tooltip={{ content: 'Delete Goal', placement: 'bottom' }}
            >
              <i class="bi bi-trash" />
            </button>
          </div>
        </Table>
      {:else}
        No Scheduling Goals Found
      {/if}
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SchedulingGoalEditor
    goalDefinition={selectedGoal?.definition ?? 'No Scheduling Goal Selected'}
    goalModelId={selectedGoal?.model_id}
    readOnly={true}
    title="Scheduling Goal - Definition Editor (Read-only)"
  />
</CssGrid>
