<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { tagsMap } from '../../../stores/tags';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../../types/data-grid';
  import type { SchedulingGoalMetadata } from '../../../types/scheduling';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../../ui/DataGrid/DataGridTags';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let schedulingGoals: SchedulingGoalMetadata[] = [];
  export let selectedGoal: SchedulingGoalMetadata | null | undefined = null;
  export let user: User | null;

  type CellRendererParams = {
    deleteGoal: (goal: SchedulingGoalMetadata) => void;
    editGoal: (goal: SchedulingGoalMetadata) => void;
  };
  type SchedulingGoalsCellRendererParams = ICellRendererParams<SchedulingGoalMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher();

  const baseColumnDefs: DataGridColumnDef<SchedulingGoalMetadata>[] = [
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
    { field: 'name', filter: 'text', headerName: 'Name', minWidth: 80, resizable: true, sortable: true },
    {
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 80,
    },
    {
      field: 'updated_by',
      filter: 'string',
      headerName: 'Updated By',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 120,
    },
    {
      field: 'versions',
      filter: 'string',
      headerName: 'Latest Version',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<SchedulingGoalMetadata>) => {
        return params?.data?.versions[params?.data?.versions.length - 1].revision;
      },
      width: 125,
    },
    {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      field: 'tags',
      filter: 'text',
      filterValueGetter: tagsFilterValueGetter,
      headerName: 'Tags',
      resizable: true,
      sortable: false,
      width: 220,
      wrapText: true,
    },
  ];

  const permissionError = 'You do not have permission to create a scheduling goal.';

  let columnDefs: DataGridColumnDef[] = baseColumnDefs;

  let filteredGoals: SchedulingGoalMetadata[] = [];
  let filterText: string = '';
  let hasPermission: boolean = false;

  $: if (schedulingGoals && $tagsMap) {
    filteredGoals = schedulingGoals.filter(goal => {
      const filterTextLowerCase = filterText.toLowerCase();
      const includesId = `${goal.id}`.includes(filterTextLowerCase);
      const includesName = goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
      return includesId || includesName;
    });
  }
  $: hasPermission = featurePermissions.schedulingGoals.canCreate(user);
  $: if (selectedGoal !== null) {
    const found = schedulingGoals.findIndex(goal => goal.id === selectedGoal?.id);
    if (found === -1) {
      selectedGoal = null;
    }
  }
  $: columnDefs = [
    ...baseColumnDefs,
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
            hasDeletePermission: params.data ? hasDeletePermission(user, params.data) : false,
            hasEditPermission: params.data ? hasEditPermission(user, params.data) : false,
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

  function deleteGoal({ id }: Pick<SchedulingGoalMetadata, 'id'>) {
    dispatch('deleteGoal', id);
  }

  function deleteGoalContext(event: CustomEvent<RowId[]>) {
    deleteGoal({ id: event.detail[0] as number });
  }

  function editGoal({ id }: Pick<SchedulingGoalMetadata, 'id'>) {
    goto(`${base}/scheduling/goals/edit/${id}`);
  }

  function editGoalContext(event: CustomEvent<RowId[]>) {
    editGoal({ id: event.detail[0] as number });
  }

  function hasDeletePermission(user: User | null, goal: SchedulingGoalMetadata) {
    return featurePermissions.schedulingGoals.canDelete(user, goal);
  }

  function hasEditPermission(user: User | null, goal: SchedulingGoalMetadata) {
    return featurePermissions.schedulingGoals.canUpdate(user, goal);
  }

  function rowSelected(event: CustomEvent<DataGridRowSelection<SchedulingGoalMetadata>>) {
    dispatch('rowSelected', event.detail);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Scheduling Goals</SectionTitle>

    <Input>
      <input bind:value={filterText} class="st-input" placeholder="Filter goals" style="width: 100%;" />
    </Input>

    <div class="right">
      <button
        class="st-button secondary ellipsis"
        use:permissionHandler={{
          hasPermission,
          permissionError,
        }}
        on:click={() => goto(`${base}/scheduling/goals/new`)}
      >
        New
      </button>
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
        {user}
        on:deleteItem={deleteGoalContext}
        on:editItem={editGoalContext}
        on:rowSelected={rowSelected}
      />
    {:else}
      No Scheduling Goals Found
    {/if}
  </svelte:fragment>
</Panel>
