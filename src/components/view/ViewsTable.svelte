<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { View, ViewSlim } from '../../types/view';
  import { featurePermissions } from '../../utilities/permissions';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let views: ViewSlim[] = [];
  export let user: User | null;

  type CellRendererParams = {
    deleteView: (view: ViewSlim) => void;
    downloadView: (view: ViewSlim) => void;
    openView: (view: ViewSlim) => void;
  };
  type ViewCellRendererParams = ICellRendererParams<ViewSlim> & CellRendererParams;

  const dispatch = createEventDispatcher();
  const baseColumnDefs: DataGridColumnDef[] = [
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
        if (updatedAt) {
          const updatedAtDate = new Date(updatedAt);
          updatedAtDate.setMilliseconds(0);

          return updatedAtDate.toISOString().replace(/.\d+Z$/g, 'Z');
        }
        return '';
      },
    },
  ];

  let columnDefs = baseColumnDefs;

  $: columnDefs = [
    ...baseColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ViewCellRendererParams) => {
        const isEditable = params?.data?.owner !== 'system';
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
            hasDeletePermission: params.data ? hasDeletePermission(user, params.data) : false,
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

  function deleteView({ id: viewId }: ViewSlim) {
    dispatch('deleteView', viewId);
  }

  function downloadView({ id: viewId }: ViewSlim) {
    dispatch('downloadView', viewId);
  }

  function deleteViews({ detail: views }: CustomEvent<ViewSlim[]>) {
    const viewIds = views.map(({ id }) => id);
    dispatch('deleteViews', viewIds);
  }

  function hasDeletePermission(user: User | null, view: ViewSlim) {
    return featurePermissions.view.canDelete(user, view);
  }

  function openView({ id: viewId }: Partial<ViewSlim>) {
    dispatch('openView', viewId);
  }
</script>

<BulkActionDataGrid
  {columnDefs}
  isRowSelectable={rowData => rowData?.data?.owner !== 'system'}
  items={views}
  pluralItemDisplayText="Views"
  singleItemDisplayText="View"
  {user}
  on:bulkDeleteItems={deleteViews}
  on:rowDoubleClicked={event => openView(event.detail)}
/>
