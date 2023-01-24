<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { DataGridColumnDef } from '../../../types/data-grid';
  import type { SchedulingGoal } from '../../../types/scheduling';
  import Input from '../../form/Input.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let schedulingGoals: SchedulingGoal[] = [];
  export let selectedGoal: SchedulingGoal | null | undefined = null;

  type CellRendererParams = {
    deleteGoal: (goal: SchedulingGoal) => void;
    editGoal: (goal: SchedulingGoal) => void;
  };
  type SchedulingGoalsCellRendererParams = ICellRendererParams<SchedulingGoal> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    { field: 'model_id', filter: 'number', headerName: 'Model ID', sortable: true, width: 120 },
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

  const dispatch = createEventDispatcher();

  let filteredGoals: SchedulingGoal[] = [];
  let filterText: string = '';

  $: filteredGoals = schedulingGoals.filter(goal => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${goal.id}`.includes(filterTextLowerCase);
    const includesName = goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: if (selectedGoal !== null) {
    const found = schedulingGoals.findIndex(goal => goal.id === selectedGoal.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }

  function deleteGoal({ id }: Pick<SchedulingGoal, 'id'>) {
    dispatch('deleteGoal', id);
  }

  function deleteGoalContext(event: CustomEvent<number[]>) {
    deleteGoal({ id: event.detail[0] });
  }

  function editGoal({ id }: Pick<SchedulingGoal, 'id'>) {
    goto(`${base}/scheduling/goals/edit/${id}`);
  }

  function editGoalContext(event: CustomEvent<number[]>) {
    editGoal({ id: event.detail[0] });
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Scheduling Goals</SectionTitle>

    <Input>
      <input
        bind:value={filterText}
        class="st-input"
        placeholder="Filter goals"
        style="max-width: 300px; width: 100%;"
      />
    </Input>

    <div class="right">
      <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/scheduling/goals/new`)}> New </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if filteredGoals.length}
      <SingleActionDataGrid
        {columnDefs}
        hasEdit={true}
        itemDisplayText="Goal"
        items={filteredGoals}
        selectedItemId={selectedGoal?.id ?? null}
        on:deleteItem={deleteGoalContext}
        on:editItem={editGoalContext}
        on:rowSelected
      />
    {:else}
      No Scheduling Goals Found
    {/if}
  </svelte:fragment>
</Panel>
