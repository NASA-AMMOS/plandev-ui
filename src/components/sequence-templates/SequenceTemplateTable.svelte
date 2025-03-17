<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { selectedSequenceTemplateId, sequenceTemplates } from '../../stores/sequence-template';
  import { parcels } from '../../stores/sequencing';
  import type { User, UserId } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { SequenceTemplate } from '../../types/sequence-template';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  type CellRendererParams = {
    deleteTemplate: (sequence: SequenceTemplate) => void;
    editTemplate: (sequence: SequenceTemplate) => void;
  };
  type TemplatesCellRendererParams = ICellRendererParams<SequenceTemplate> & CellRendererParams;

  export let filterText: string;
  export let user: User | null;

  let baseColumnDefs: DataGridColumnDef[] = [];
  let columnDefs = baseColumnDefs;
  let selectedTemplate: SequenceTemplate | null = null;

  const dispatch = createEventDispatcher<{
    templateSelected: SequenceTemplate;
  }>();

  $: baseColumnDefs = [
    {
      field: 'id',
      filter: 'text',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    {
      field: 'activity_type',
      filter: 'text',
      headerName: 'Activity',
      resizable: true,
      sortable: true,
    },
    {
      field: 'parcel_id',
      filter: 'text',
      headerName: 'Parcel',
      resizable: true,
      sortable: true,
      valueGetter: ({ data }) => {
        return `${$parcels.find(p => data.parcel_id === p.id)?.name} (${data.parcel_id})`;
      },
    },
    {
      comparator: usernameComparator,
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      sort: 'desc',
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
  ];

  $: columnDefs = [
    ...baseColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: TemplatesCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteTemplate,
            deleteTooltip: {
              content: 'Delete Template',
              placement: 'bottom',
            },
            editCallback: params.editTemplate,
            editTooltip: {
              content: 'Edit Template',
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
        deleteTemplate,
        editTemplate,
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

  function deleteTemplate(template: SequenceTemplate) {
    effects.deleteSequenceTemplate(template, user);
  }

  function deleteTemplateContext(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as number;
    const template = $sequenceTemplates.find(sequenceTemplate => sequenceTemplate.id === id);
    if (template) {
      deleteTemplate(template);
      $selectedSequenceTemplateId = null;
    }
  }

  function editTemplate({ id }: Pick<SequenceTemplate, 'id'>) {
    selectedTemplate = $sequenceTemplates.find(s => s.id === id) ?? null;
  }

  function editTemplateContext(event: CustomEvent<RowId[]>) {
    editTemplate({ id: event.detail[0] as number });
  }

  function hasDeletePermission(user: User | null, template: SequenceTemplate) {
    return featurePermissions.sequenceTemplate.canDelete(user, template);
  }

  function hasEditPermission(user: User | null, template: SequenceTemplate) {
    return featurePermissions.sequenceTemplate.canUpdate(user, template);
  }

  async function toggleTemplate(event: CustomEvent<DataGridRowSelection<SequenceTemplate>>) {
    const { detail } = event;
    const { data: clickedTemplate, isSelected } = detail;

    if (isSelected) {
      selectedTemplate = clickedTemplate;
      dispatch('templateSelected', selectedTemplate);
    }
  }

  /**
   * Sort the template table with the current users templates at the top.
   * @param valueA
   * @param valueB
   */
  function usernameComparator(valueA: UserId, valueB: UserId): number {
    if (valueA === null && valueB === null) {
      return 0;
    }
    if (valueA === null) {
      return -1;
    }
    if (valueB === null) {
      return 1;
    }

    return valueA === user?.id ? 1 : -1;
  }
</script>

{#if $sequenceTemplates.length}
  <div id="sequence-templates-table">
    <SingleActionDataGrid
      {columnDefs}
      filterExpression={filterText}
      hasEdit={true}
      {hasEditPermission}
      {hasDeletePermission}
      itemDisplayText="Template"
      items={$sequenceTemplates}
      {user}
      on:deleteItem={deleteTemplateContext}
      on:editItem={editTemplateContext}
      on:rowSelected={toggleTemplate}
    />
  </div>
{:else}
  <div class="st-typography-label">No Templates Found</div>
{/if}

<style>
  #sequence-templates-table {
    height: 100%;
  }
</style>
