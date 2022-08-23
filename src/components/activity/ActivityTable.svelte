<svelte:options immutable={true} />

<script lang="ts">
  import { activities, selectedActivityId } from '../../stores/activities';
  import { view } from '../../stores/views';
  import effects from '../../utilities/effects';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let activityTableId: number;

  type CellRendererParams = {
    deleteActivityDirective: (activity: Activity) => void;
  };
  type ActivityCellRendererParams = ICellRendererParams & CellRendererParams;

  const activityActionColumnDef: DataGridColumnDef = {
    cellClass: 'action-cell-container',
    cellRenderer: (params: ActivityCellRendererParams) => {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions-cell';
      new DataGridActions({
        props: {
          deleteCallback: params.deleteActivityDirective,
          deleteTooltip: {
            content: 'Delete Activity',
            placement: 'bottom',
          },
          rowData: params.data,
        },
        target: actionsDiv,
      });

      return actionsDiv;
    },
    cellRendererParams: {
      deleteActivityDirective,
    } as CellRendererParams,
    field: 'actions',
    headerName: '',
    resizable: false,
    sortable: false,
    suppressAutoSize: true,
    suppressSizeToFit: true,
    width: 55,
  };

  let activityTable: ViewActivityTable;
  let previousSelectedActivityId: number | null = null;
  let selectedActivityIds: number[] = [];

  $: activityTable = $view?.definition.plan.activityTables.find(table => table.id === activityTableId);
  $: {
    if (previousSelectedActivityId !== $selectedActivityId) {
      selectedActivityIds = [$selectedActivityId];
    }
    previousSelectedActivityId = $selectedActivityId;
  }

  async function deleteActivityDirective({ id }: Activity) {
    const success = await effects.deleteActivityDirective(id);

    if (success) {
      selectedActivityIds = selectedActivityIds.filter(selectedId => selectedId !== id);
    }
  }

  function deleteActivityDirectives({ detail: ids }: CustomEvent<number[]>) {
    effects.deleteActivityDirectives(ids);
  }
</script>

<BulkActionDataGrid
  columnDefs={[
    ...Object.keys(activityTable?.columnDefs).map(columnKey => {
      const columnDef = activityTable?.columnDefs[columnKey];
      return {
        field: columnDef.field,
        filter: 'agTextColumnFilter',
        headerName: columnDef.name,
        resizable: true,
        sortable: columnDef.sortable,
      };
    }),
    activityActionColumnDef,
  ]}
  items={$activities}
  pluralItemDisplayText="Activities"
  singleItemDisplayText="Activity"
  selectedItemId={$selectedActivityId}
  on:bulkDeleteItems={deleteActivityDirectives}
/>
