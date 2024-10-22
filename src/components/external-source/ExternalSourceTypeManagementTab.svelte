<svelte:options immutable={true} />

<script lang="ts">
  import { externalSourceTypes } from '../../stores/external-source';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExternalSourceType } from '../../types/external-source';
  import { getExternalSourceTypeRowId } from '../../utilities/externalEvents';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';

  export let externalSourceTypeColumnDefs: DataGridColumnDef<ExternalSourceType>[] = [];
  export let filterString: string = '';

  let externalSourceTypeDataGrid: DataGrid<ExternalSourceType>;
</script>

<DataGrid
  bind:this={externalSourceTypeDataGrid}
  columnDefs={externalSourceTypeColumnDefs}
  filterExpression={filterString}
  rowData={$externalSourceTypes}
  getRowId={getExternalSourceTypeRowId}
/>
