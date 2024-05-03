<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../../types/data-grid';
  import type { SchedulingConditionMetadata } from '../../../types/scheduling';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import Input from '../../form/Input.svelte';
  import DataGridActions from '../../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../../ui/DataGrid/DataGridTags';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';

  export let schedulingConditions: SchedulingConditionMetadata[] = [];
  export let selectedCondition: SchedulingConditionMetadata | null | undefined = null;
  export let user: User | null;

  type CellRendererParams = {
    deleteCondition: (condition: SchedulingConditionMetadata) => void;
    editCondition: (condition: SchedulingConditionMetadata) => void;
  };
  type SchedulingConditionsCellRendererParams = ICellRendererParams<SchedulingConditionMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    deleteCondition: number;
    rowSelected: DataGridRowSelection<SchedulingConditionMetadata>;
  }>();

  const baseColumnDefs: DataGridColumnDef<SchedulingConditionMetadata>[] = [
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
      valueGetter: (params: ValueGetterParams<SchedulingConditionMetadata>) => {
        return params?.data?.versions[0].revision;
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

  const permissionError = 'You do not have permission to create Scheduling Conditions';

  let columnDefs: DataGridColumnDef[] = baseColumnDefs;

  let filteredConditions: SchedulingConditionMetadata[] = [];
  let filterText: string = '';
  let hasPermission: boolean = false;

  $: filteredConditions = schedulingConditions.filter(condition => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${condition.id}`.includes(filterTextLowerCase);
    const includesName = condition.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: hasPermission = featurePermissions.schedulingConditions.canCreate(user);
  $: if (selectedCondition !== null) {
    const found = schedulingConditions.findIndex(condition => condition.id === selectedCondition?.id);
    if (found === -1) {
      selectedCondition = null;
    }
  }

  $: columnDefs = [
    ...baseColumnDefs,
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

  function deleteCondition({ id }: Pick<SchedulingConditionMetadata, 'id'>) {
    dispatch('deleteCondition', id);
  }

  function deleteConditionContext(event: CustomEvent<RowId[]>) {
    deleteCondition({ id: event.detail[0] as number });
  }

  function editCondition({ id }: Pick<SchedulingConditionMetadata, 'id'>) {
    goto(`${base}/scheduling/conditions/edit/${id}`);
  }

  function editConditionContext(event: CustomEvent<RowId[]>) {
    editCondition({ id: event.detail[0] as number });
  }

  function hasDeletePermission(condition: SchedulingConditionMetadata) {
    return featurePermissions.schedulingConditions.canDelete(user, condition);
  }

  function hasEditPermission(condition: SchedulingConditionMetadata) {
    return featurePermissions.schedulingConditions.canUpdate(user, condition);
  }

  function rowSelected(event: CustomEvent<DataGridRowSelection<SchedulingConditionMetadata>>) {
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
          hasPermission,
          permissionError,
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
