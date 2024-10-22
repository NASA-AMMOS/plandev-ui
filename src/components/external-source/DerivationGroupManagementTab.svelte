<svelte:options immutable={true} />

<script lang="ts">
  import { derivationGroups } from '../../stores/external-source';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { DerivationGroup } from '../../types/external-source';
  import { getDerivationGroupRowId } from '../../utilities/externalEvents';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';

  export let derivationGroupColumnsDef: DataGridColumnDef<DerivationGroup>[] = [];
  export let filterString: string = '';

  let derivationGroupDataGrid: DataGrid<DerivationGroup>;
</script>

<DataGrid
  bind:this={derivationGroupDataGrid}
  columnDefs={derivationGroupColumnsDef}
  filterExpression={filterString}
  rowData={$derivationGroups}
  getRowId={getDerivationGroupRowId}
/>
