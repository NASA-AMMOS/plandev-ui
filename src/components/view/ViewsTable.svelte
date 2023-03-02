<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { View } from '../../types/view';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let views: View[] = [];

  type CellRendererParams = {
    deleteView: (view: View) => void;
    downloadView: (view: View) => void;
    openView: (view: View) => void;
  };
  type ViewCellRendererParams = ICellRendererParams<View> & CellRendererParams;

  const dispatch = createEventDispatcher();
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
    {
      field: 'updated_at',
      filter: 'text',
      headerName: 'Last Edited',
      resizable: true,
      sortable: true,
      valueFormatter: ({ value: updatedAt }: ValueFormatterParams<View, string>) => {
        const updatedAtDate = new Date(updatedAt);
        updatedAtDate.setMilliseconds(0);

        return updatedAtDate.toISOString().replace(/.\d+Z$/g, 'Z');
      },
    },
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
            downloadCallback: params.downloadView,
            downloadTooltip: {
              content: 'Download View',
              placement: 'bottom',
            },
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
        downloadView,
        openView,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 81,
    },
  ];

  function deleteView({ id: viewId }: View) {
    dispatch('deleteView', viewId);
  }

  function deleteViews({ detail: views }: CustomEvent<View[]>) {
    const viewIds = views.map(({ id }) => id);
    dispatch('deleteViews', viewIds);
  }

  function downloadView(view: View) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(view.definition, null, 2)], { type: 'application/json' }));
    a.download = view.name;
    a.click();
  }

  function openView({ id: viewId }: View) {
    dispatch('openView', viewId);
  }
</script>

<BulkActionDataGrid
  {columnDefs}
  isRowSelectable={rowData => rowData.data.owner !== 'system'}
  items={views}
  pluralItemDisplayText="Views"
  singleItemDisplayText="View"
  on:bulkDeleteItems={deleteViews}
  on:rowDoubleClicked={event => openView(event.detail)}
/>
