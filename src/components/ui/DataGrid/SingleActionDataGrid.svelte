<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState, RowNode } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import ContextMenu from '../../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let idKey: keyof TRowData = 'id';
  export let hasEdit: boolean = false;
  export let items: TRowData[];
  export let selectedItemId: number | null = null;
  export let itemDisplayText: string;

  export let getRowId: (data: TRowData) => number = (data: TRowData): number => {
    return parseInt(data[idKey]);
  };
  export let isRowSelectable: (node: RowNode<TRowData>) => boolean = undefined;

  const dispatch = createEventDispatcher();

  let contextMenu: ContextMenu;
  let selectedItemIds: number[] = [];

  $: if (!selectedItemIds.includes(selectedItemId) && selectedItemId != null) {
    selectedItemIds = [selectedItemId];
  } else if (selectedItemId === null) {
    selectedItemIds = [];
  }

  function editItem() {
    dispatch('editItem', selectedItemIds);
  }

  function deleteItem() {
    dispatch('deleteItem', selectedItemIds);
  }

  function onCellContextMenu(event: CustomEvent) {
    const { detail } = event;
    const { data: clickedRow } = detail;
    if (selectedItemIds.length <= 1 && (!isRowSelectable || isRowSelectable(detail))) {
      selectedItemId = getRowId(clickedRow);
    }
    if (selectedItemId !== null) {
      contextMenu.show(detail.event);
    }
  }
</script>

<DataGrid
  {columnDefs}
  {columnStates}
  bind:currentSelectedRowId={selectedItemId}
  {getRowId}
  {isRowSelectable}
  rowSelection="single"
  rowData={items}
  bind:selectedRowIds={selectedItemIds}
  preventDefaultOnContextMenu
  on:filterChanged
  on:cellContextMenu={onCellContextMenu}
  on:cellMouseOver
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnStateChange
  on:rowClicked
  on:rowDoubleClicked
  on:rowSelected
  on:selectionChanged
/>
<ContextMenu bind:this={contextMenu}>
  <ContextMenuHeader>Actions</ContextMenuHeader>
  {#if hasEdit}
    <ContextMenuItem on:click={editItem}>
      Edit {itemDisplayText}
    </ContextMenuItem>
  {/if}
  <ContextMenuItem on:click={deleteItem}>
    Delete {itemDisplayText}
  </ContextMenuItem>
</ContextMenu>
