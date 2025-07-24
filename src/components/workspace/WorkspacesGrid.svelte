<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { workspaces } from '../../stores/workspaces';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection } from '../../types/data-grid';
  import type { Workspace } from '../../types/workspace';
  import { featurePermissions } from '../../utilities/permissions';
  import Input from '../form/Input.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  type CellRendererParams = {
    deleteWorkspace: (workspace: Workspace) => void;
    viewWorkspace: (workspace: Workspace) => void;
  };
  type WorkspaceCellRendererParams = ICellRendererParams<Workspace> & CellRendererParams;

  export let selectedWorkspaceId: number | null | undefined;
  export let user: User | null;

  let baseColumnDefs: DataGridColumnDef[];
  let filterText: string = '';
  let filteredWorkspaces: Workspace[] = [];
  let selectedWorkspace: Workspace | null = null;

  const dispatch = createEventDispatcher<{
    deleteWorkspace: number;
    selectWorkspace: number;
    viewWorkspace: number;
  }>();

  $: baseColumnDefs = [
    {
      field: 'id',
      filter: 'text',
      headerName: 'ID',
      resizable: true,
      sort: 'asc',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    {
      field: 'name',
      filter: 'text',
      headerName: 'Name',
      resizable: true,
      sortable: true,
    },
    {
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: WorkspaceCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions<Workspace>({
          props: {
            deleteCallback: params.deleteWorkspace,
            deleteTooltip: {
              content: 'Delete Workspace',
              placement: 'bottom',
            },
            hasDeletePermission: params.data ? hasDeletePermission(user, params.data) : false,
            hasEditPermission: params.data ? hasViewPermission(user, params.data) : false,
            rowData: params.data,
            viewCallback: data => user && params.viewWorkspace(data),
            viewTooltip: {
              content: 'Open Workspace',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteWorkspace,
        viewWorkspace,
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

  $: filteredWorkspaces = $workspaces.filter(workspace => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = workspace.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  async function deleteWorkspace(workspace: Workspace | undefined) {
    if (workspace !== undefined) {
      dispatch('deleteWorkspace', workspace.id);
    }
  }

  function hasDeletePermission(user: User | null, workspace: Workspace) {
    return featurePermissions.workspaces.canDelete(user, workspace);
  }

  async function viewWorkspace(workspace: Workspace | undefined) {
    if (workspace !== undefined) {
      dispatch('viewWorkspace', workspace.id);
    }
  }

  function hasViewPermission(user: User | null, workspace: Workspace) {
    return featurePermissions.workspaces.canRead(user, workspace);
  }

  function workspaceSelected(event: CustomEvent<DataGridRowSelection<Workspace>>) {
    const { detail } = event;
    const { data: clickedWorkspace, isSelected } = detail;

    if (isSelected) {
      selectedWorkspace = clickedWorkspace;
      dispatch('selectWorkspace', selectedWorkspace.id);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Sequence Workspaces</SectionTitle>

    <Input>
      <input
        bind:value={filterText}
        class="st-input"
        placeholder="Filter workspaces"
        aria-label="Filter workspaces"
        style="width: 100%;"
      />
    </Input>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if filteredWorkspaces.length}
      <SingleActionDataGrid
        showLoadingSkeleton
        loading={$workspaces === null}
        columnDefs={baseColumnDefs}
        hasEdit={true}
        itemDisplayText="Workspaces"
        items={filteredWorkspaces}
        selectedItemId={selectedWorkspaceId}
        hasDeletePermission={false}
        {user}
        on:rowSelected={workspaceSelected}
        on:rowDoubleClicked={({ detail }) => viewWorkspace(detail.data)}
      />
    {:else}
      <div class="p1 st-typography-label">No Workspaces Found</div>
    {/if}
  </svelte:fragment>
</Panel>
