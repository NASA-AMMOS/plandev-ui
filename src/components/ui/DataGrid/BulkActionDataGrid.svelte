<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import ContextMenu from '../../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  export let columnDefs: ColDef[];
  export let items: TRowData[];
  export let pluralItemDisplayText: string;
  export let selectedItemId: number | null = null;
  export let singleItemDisplayText: string;

  const dispatch = createEventDispatcher();

  let contextMenu: ContextMenu;
  let dataGrid: DataGrid;
  let isFiltered: boolean = false;
  let selectedItemIds: number[] = [];

  $: if (!selectedItemIds.includes(selectedItemId) && selectedItemId !== null) {
    selectedItemIds = [selectedItemId];
  }

  function bulkDeleteItems() {
    dispatch('bulkDeleteItems', selectedItemIds);
  }

  function onCellContextMenu(event: CustomEvent) {
    const { detail } = event;
    const { data: clickedRow } = detail;
    if (selectedItemIds.length <= 1) {
      selectedItemId = clickedRow.id;
    }

    contextMenu.show(detail.event);
  }

  function onFilterChanged(event: CustomEvent) {
    const { detail: filterModel } = event;

    isFiltered = Object.keys(filterModel).length > 0;
  }

  function selectAllItems() {
    dataGrid.selectAllVisible();
  }
</script>

<DataGrid
  bind:this={dataGrid}
  {columnDefs}
  bind:currentSelectedRowId={selectedItemId}
  rowSelection="multiple"
  rowData={items}
  bind:selectedRowIds={selectedItemIds}
  preventDefaultOnContextMenu
  on:filterChanged={onFilterChanged}
  on:cellContextMenu={onCellContextMenu}
  on:cellMouseOver
  on:rowClicked
  on:rowDoubleClicked
  on:rowSelected
  on:selectionChanged
/>
<ContextMenu bind:this={contextMenu}>
  <ContextMenuHeader>Bulk Actions</ContextMenuHeader>
  <ContextMenuItem on:click={selectAllItems}>
    Select All {isFiltered ? 'Visible ' : ''}{pluralItemDisplayText}
  </ContextMenuItem>
  <ContextMenuItem on:click={bulkDeleteItems}>
    Delete {selectedItemIds.length}
    {selectedItemIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
  </ContextMenuItem>
</ContextMenu>
