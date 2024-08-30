<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { workspaces } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { Workspace } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import Input from '../form/Input.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  type CellRendererParams = {
    editWorkspace?: (workspace: Workspace) => void;
  };
  type WorkspaceCellRendererParams = ICellRendererParams<Workspace> & CellRendererParams;

  export let selectedWorkspaceId: number | undefined;
  export let user: User | null;

  let baseColumnDefs: DataGridColumnDef[];
  let filterText = '';
  let filteredWorkspaces: Workspace[] = [];
  let selectedWorkspace: Workspace | null = null;

  const dispatch = createEventDispatcher<{
    workspaceSelected: number;
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
        new DataGridActions({
          props: {
            editCallback: params.editWorkspace,
            editTooltip: {
              content: 'Edit Workspace',
              placement: 'bottom',
            },
            hasEditPermission: params.data ? hasEditPermission(user, params.data) : false,
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        editWorkspace,
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

  async function createNewWorkspace() {
    await effects.createWorkspace(
      $workspaces.map(workspace => workspace.name),
      user,
    );
  }

  async function editWorkspace(workspace: Workspace | undefined) {
    if (workspace !== undefined) {
      await effects.editWorkspace(
        workspace,
        $workspaces.map(workspace => workspace.name),
        user,
      );
    }
  }

  function editWorkspaceContext(event: CustomEvent<RowId[]>) {
    editWorkspace($workspaces.find(workspace => workspace.id === (event.detail[0] as number)));
  }

  function hasEditPermission(user: User | null, workspace: Workspace) {
    return featurePermissions.workspace.canUpdate(user, workspace);
  }

  function workspaceSelected(event: CustomEvent<DataGridRowSelection<Workspace>>) {
    const { detail } = event;
    const { data: clickedWorkspace, isSelected } = detail;

    if (isSelected) {
      selectedWorkspace = clickedWorkspace;
      dispatch('workspaceSelected', selectedWorkspace.id);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Sequence Workspaces</SectionTitle>

    <Input>
      <input bind:value={filterText} class="st-input" placeholder="Filter workspaces" style="width: 100%;" />
    </Input>

    <div class="right">
      <button class="st-button secondary ellipsis" on:click|stopPropagation={createNewWorkspace}>
        Create Workspace
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if filteredWorkspaces.length}
      <SingleActionDataGrid
        columnDefs={baseColumnDefs}
        hasEdit={true}
        {hasEditPermission}
        itemDisplayText="Workspaces"
        items={filteredWorkspaces}
        selectedItemId={selectedWorkspaceId}
        hasDeletePermission={false}
        {user}
        on:editItem={editWorkspaceContext}
        on:rowSelected={workspaceSelected}
      />
    {:else}
      <div class="p1 st-typography-label">No Workspaces Found</div>
    {/if}
  </svelte:fragment>
</Panel>
