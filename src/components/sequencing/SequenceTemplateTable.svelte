<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { parcels, userTemplates } from '../../stores/sequencing';
  import type { User, UserId } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { UserSequenceTemplate } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { featurePermissions } from '../../utilities/permissions';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  type CellRendererParams = {
    deleteTemplate: (sequence: UserSequenceTemplate) => void;
    editTemplate: (sequence: UserSequenceTemplate) => void;
  };
  type TemplatesCellRendererParams = ICellRendererParams<UserSequenceTemplate> & CellRendererParams;

  export let filterText: string;
  export let user: User | null;

  let baseColumnDefs: DataGridColumnDef[] = [];
  let columnDefs = baseColumnDefs;
  let filteredTemplates: UserSequenceTemplate[] = [];
  let selectedTemplate: UserSequenceTemplate | null = null;

  const dispatch = createEventDispatcher<{
    templateSelected: UserSequenceTemplate;
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
      width: 60,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    {
      field: 'parcel',
      filter: 'text',
      headerName: 'Parcel',
      resizable: true,
      sortable: true,
      valueGetter: ({ data }) => {
        return $parcels.find(p => data.parcel_id === p.id)?.name;
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

  $: filteredTemplates = $userTemplates.filter(template => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${template.id}`.includes(filterTextLowerCase);
    const includesName = template.name.toLocaleLowerCase().includes(filterTextLowerCase);

    return includesId || includesName;
  });

  async function deleteTemplate(template: UserSequenceTemplate) {
    const success = await effects.deleteUserSequenceTemplate(template, user);

    // TODO: re-enable this once we're saving templates to GraphQL again
    // if (success) {
    //   userTemplates.filterValueById(template.id);

    //   if (template.id === selectedTemplate?.id) {
    //     selectedTemplate = null;
    //   }
    // }
  }

  function deleteTemplateContext(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as number;
    const template = $userTemplates.find(s => s.id === id);
    if (template) {
      deleteTemplate(template);
    }
  }

  function editTemplate({ id }: Pick<UserSequenceTemplate, 'id'>) {
    selectedTemplate = $userTemplates.find(s => s.id === id) ?? null;
  }

  function editTemplateContext(event: CustomEvent<RowId[]>) {
    editTemplate({ id: event.detail[0] as number });
  }

  function hasDeletePermission(user: User | null, template: UserSequenceTemplate) {
    return featurePermissions.sequences.canDelete(user, template);
  }

  function hasEditPermission(user: User | null, template: UserSequenceTemplate) {
    return featurePermissions.sequences.canUpdate(user, template);
  }

  function onFilterToUsersTemplates(event: Event) {
    const { value: enabled } = getTarget(event);

    if (enabled as boolean) {
      filteredTemplates = $userTemplates.filter(template => {
        return template.owner === user?.id;
      });
    } else {
      filteredTemplates = $userTemplates;
    }
  }

  async function toggleTemplate(event: CustomEvent<DataGridRowSelection<UserSequenceTemplate>>) {
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

<div class="filter-container">
  <div>
    <input type="checkbox" on:change={onFilterToUsersTemplates} />
    <span class=" st-typography-body">Filter to my templates</span>
  </div>
</div>

{#if filteredTemplates.length}
  <SingleActionDataGrid
    {columnDefs}
    hasEdit={true}
    {hasEditPermission}
    {hasDeletePermission}
    itemDisplayText="Template"
    items={filteredTemplates}
    {user}
    on:deleteItem={deleteTemplateContext}
    on:editItem={editTemplateContext}
    on:rowSelected={toggleTemplate}
  />
{:else}
  <div class="p1 st-typography-label">No Templates Found</div>
{/if}

<style>
  .filter-container {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
</style>
