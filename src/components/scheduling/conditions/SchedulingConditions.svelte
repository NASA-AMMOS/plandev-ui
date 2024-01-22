<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../../types/data-grid';
  import type { PlanSchedulingSpec } from '../../../types/plan';
  import type { SchedulingCondition } from '../../../types/scheduling';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let schedulingConditions: SchedulingCondition[] = [];
  export let selectedCondition: SchedulingCondition | null | undefined = null;
  export let user: User | null;
  export let plans: PlanSchedulingSpec[] | null;

  type CellRendererParams = {
    deleteCondition: (condition: SchedulingCondition) => void;
    editCondition: (condition: SchedulingCondition) => void;
  };
  type SchedulingConditionsCellRendererParams = ICellRendererParams<SchedulingCondition> & CellRendererParams;

  let columnDefs: DataGridColumnDef[] = [];
  $: if (user && plans) {
    columnDefs = [
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
      { field: 'author', filter: 'string', headerName: 'Author', sortable: true, width: 100 },
      { field: 'last_modified_by', filter: 'string', headerName: 'Last Modified By', sortable: true, width: 100 },
      { field: 'description', filter: 'string', headerName: 'Description', sortable: true, width: 120 },
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: SchedulingConditionsCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              deleteCallback: params.deleteCondition,
              deleteTooltip: {
                content: 'Delete Condition',
                placement: 'bottom',
              },
              editCallback: params.editCondition,
              editTooltip: {
                content: 'Edit Condition',
                placement: 'bottom',
              },
              hasDeletePermission: params.data ? hasDeletePermission(params.data) : false,
              hasEditPermission: params.data ? hasEditPermission(params.data) : false,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteCondition,
          editCondition,
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
  }

  const dispatch = createEventDispatcher();

  let filteredConditions: SchedulingCondition[] = [];
  let filterText: string = '';

  $: filteredConditions = schedulingConditions.filter(condition => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${condition.id}`.includes(filterTextLowerCase);
    const includesName = condition.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: if (selectedCondition !== null) {
    const found = schedulingConditions.findIndex(condition => condition.id === selectedCondition?.id);
    if (found === -1) {
      selectedCondition = null;
    }
  }

  function deleteCondition({ id }: Pick<SchedulingCondition, 'id'>) {
    dispatch('deleteCondition', id);
  }

  function deleteConditionContext(event: CustomEvent<RowId[]>) {
    deleteCondition({ id: event.detail[0] as number });
  }

  function editCondition({ id }: Pick<SchedulingCondition, 'id'>) {
    goto(`${base}/scheduling/conditions/edit/${id}`);
  }

  function editConditionContext(event: CustomEvent<RowId[]>) {
    editCondition({ id: event.detail[0] as number });
  }

  function getPlanForCondition(condition: SchedulingCondition): PlanSchedulingSpec | null {
    // If there is no spec id attached to the goal, the goal is not associated with a plan
    let plan = null;
    if (condition.scheduling_specification_conditions.length > 0) {
      const specification_id = condition.scheduling_specification_conditions[0].specification_id;
      plan = plans?.find(plan => plan.scheduling_specifications[0]?.id === specification_id) ?? null;
    }
    return plan;
  }

  function hasDeletePermission(condition: SchedulingCondition) {
    return featurePermissions.schedulingConditions.canDelete(user, getPlanForCondition(condition), condition);
  }

  function hasEditPermission(condition: SchedulingCondition) {
    return featurePermissions.schedulingConditions.canUpdate(user, getPlanForCondition(condition), condition);
  }

  function hasCreatePermission(user: User): boolean {
    return plans?.some(plan => featurePermissions.schedulingConditions.canCreate(user, plan)) ?? false;
  }

  function rowSelected(event: CustomEvent<DataGridRowSelection<SchedulingCondition>>) {
    dispatch('rowSelected', event.detail);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Scheduling Conditions</SectionTitle>

    <Input>
      <input bind:value={filterText} class="st-input" placeholder="Filter conditions" style="width: 100%;" />
    </Input>

    <div class="right">
      <button
        class="st-button secondary ellipsis"
        use:permissionHandler={{
          hasPermission: user ? hasCreatePermission(user) : false,
          permissionError: 'You do not have permission to create Scheduling Conditions',
        }}
        on:click={() => goto(`${base}/scheduling/conditions/new`)}
      >
        New
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if filteredConditions.length}
      <SingleActionDataGrid
        {columnDefs}
        hasEdit={true}
        itemDisplayText="Condition"
        items={filteredConditions}
        selectedItemId={selectedCondition?.id ?? null}
        {user}
        on:deleteItem={deleteConditionContext}
        on:editItem={editConditionContext}
        on:rowSelected={rowSelected}
      />
    {:else}
      No Scheduling Conditions Found
    {/if}
  </svelte:fragment>
</Panel>
