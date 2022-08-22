<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { schedulingGoals, schedulingGoalsColumns } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import SchedulingGoalEditor from './SchedulingGoalEditor.svelte';

  type CellRendererParams = {
    deleteGoal: (goal: SchedulingGoal) => void;
    editGoal: (goal: SchedulingGoal) => void;
  };
  type SchedulingGoalsCellRendererParams = ICellRendererParams & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      headerName: 'Goal ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
    { field: 'name', headerName: 'Name', resizable: true, sortable: true },
    { field: 'model_id', headerName: 'Model ID', sortable: true, width: 120 },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: SchedulingGoalsCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteGoal,
            deleteTooltip: {
              content: 'Delete Goal',
              placement: 'bottom',
            },
            editCallback: params.editGoal,
            editTooltip: {
              content: 'Edit Goal',
              placement: 'bottom',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteGoal,
        editGoal,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
  ];

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

  async function deleteGoal({ id }: SchedulingGoal) {
    const success = await effects.deleteSchedulingGoal(id);

    if (success) {
      sortedGoals = sortedGoals.filter(goal => goal.id !== id);

      if (id === selectedGoal?.id) {
        selectedGoal = null;
      }
    }
  }

  function editGoal({ id }: SchedulingGoal) {
    goto(`${base}/scheduling/goals/edit/${id}`);
  }

  function toggleGoal(event: CustomEvent<DataGridRowSelection<SchedulingGoal>>) {
    const {
      detail: { data: clickedGoal, isSelected },
    } = event;

    if (isSelected) {
      selectedGoal = clickedGoal;
    } else if (selectedGoal?.id === clickedGoal.id) {
      selectedGoal = null;
    }
  }
</script>

<CssGrid bind:columns={$schedulingGoalsColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>Scheduling Goals</Chip>

      <Input>
        <input
          bind:value={filterText}
          class="st-input"
          placeholder="Filter goals"
          style="max-width: 300px; width: 100%;"
        />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/scheduling/goals/new`)}>
          New
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if sortedGoals.length}
        <DataGrid {columnDefs} rowData={sortedGoals} rowSelection="single" on:rowSelected={toggleGoal} />
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
