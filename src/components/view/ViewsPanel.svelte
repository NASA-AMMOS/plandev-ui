<svelte:options immutable={true} />

<script lang="ts">
  import { session } from '$app/stores';
  import { onMount } from 'svelte';
  import { view, viewLayout } from '../../stores/views';
  import effects from '../../utilities/effects';
  import { setQueryParam } from '../../utilities/generic';
  import GridMenu from '../menus/GridMenu.svelte';
  import DataGrid from '../ui/DataGrid.svelte';
  import DataGridActions from '../ui/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  type CellRendererParams = {
    deleteView: (view: View) => void;
  };
  type ViewCellRendererParams = ICellRendererParams & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 40,
    },
    { field: 'name', headerName: 'Name', resizable: true, sortable: true },
    { field: 'owner', headerName: 'Owner', resizable: true, sortable: true },
    { field: 'updated_at', headerName: 'Last Updated', resizable: true, sortable: true },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ViewCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteView,
            deleteTooltip: {
              content: 'Delete View',
              placement: 'bottom',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteView,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 25,
    },
  ];

  let views: View[] = [];

  onMount(async () => {
    views = await effects.getViews();
  });

  async function deleteView({ id: viewId }: View) {
    const success = await effects.deleteView(viewId);

    if (success) {
      views = views.filter(v => v.id !== viewId);
      if ($view.id === viewId) {
        const nextView = await effects.getView($session?.user?.id, null);
        $view = { ...nextView };
        $viewLayout = { ...nextView.definition.plan.layout };
        setQueryParam('viewId', `${nextView.id}`);
      }
    }
  }

  async function loadView(viewId: number) {
    const query = new URLSearchParams(`?viewId=${viewId}`);
    const newView = await effects.getView($session?.user?.id, query);

    if (view) {
      $view = { ...newView };
      $viewLayout = { ...newView.definition.plan.layout };
      setQueryParam('viewId', `${newView.id}`);
    } else {
      console.log(`No view found for ID: ${viewId}`);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Views" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if views.length}
      <DataGrid
        {columnDefs}
        rowData={views}
        rowSelection="single"
        on:rowSelected={({ detail }) => loadView(detail.data.id)}
      />
    {:else}
      No Views Found
    {/if}
  </svelte:fragment>
</Panel>
