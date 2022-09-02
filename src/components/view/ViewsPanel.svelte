<svelte:options immutable={true} />

<script lang="ts">
  import { user as userStore } from '../../stores/app';
  import { view, viewLayout, views } from '../../stores/views';
  import effects from '../../utilities/effects';
  import { setQueryParam } from '../../utilities/generic';
  import GridMenu from '../menus/GridMenu.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  type CellRendererParams = {
    deleteView: (view: View) => void;
    openView: (view: View) => void;
  };
  type ViewCellRendererParams = ICellRendererParams<View> & CellRendererParams;

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
    { field: 'owner', filter: 'text', headerName: 'Owner', resizable: true, sortable: true },
    { field: 'updated_at', filter: 'text', headerName: 'Last Updated', resizable: true, sortable: true },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ViewCellRendererParams) => {
        const isEditable = params.data.owner !== 'system';
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            ...(isEditable
              ? {
                  deleteCallback: params.deleteView,
                  deleteTooltip: {
                    content: 'Delete View',
                    placement: 'bottom',
                  },
                }
              : {}),
            rowData: params.data,
            viewCallback: params.openView,
            viewTooltip: {
              content: 'Open View',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteView,
        openView,
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

  async function deleteView({ id: viewId }: View) {
    const success = await effects.deleteView(viewId);

    if (success) {
      if ($view.id === viewId) {
        const nextView = await effects.getView($userStore?.id, null);
        $view = { ...nextView };
        $viewLayout = { ...nextView.definition.plan.layout };
        setQueryParam('viewId', `${nextView.id}`);
      }
    }
  }

  function deleteViews({ detail: ids }: CustomEvent<number[]>) {
    effects.deleteViews(ids);
  }

  async function openView({ id: viewId }: View) {
    const query = new URLSearchParams(`?viewId=${viewId}`);
    const newView = await effects.getView($userStore?.id, query);

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
    {#if $views.length}
      <BulkActionDataGrid
        {columnDefs}
        isRowSelectable={rowData => rowData.data.owner !== 'system'}
        items={$views}
        pluralItemDisplayText="Views"
        singleItemDisplayText="View"
        on:bulkDeleteItems={deleteViews}
        on:rowDoubleClicked={event => openView(event.detail)}
      />
    {:else}
      No Views Found
    {/if}
  </svelte:fragment>
</Panel>
