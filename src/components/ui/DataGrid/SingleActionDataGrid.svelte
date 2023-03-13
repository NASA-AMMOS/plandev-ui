<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import type { ColDef, ColumnState, RowNode } from 'ag-grid-community';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import type { TRowData } from '../../../types/data-grid';
  import { isDeleteEvent } from '../../../utilities/keyboardEvents';
  import ContextMenu from '../../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import ColumnResizeContextMenu from './column-menu/ColumnResizeContextMenu.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid = undefined;
  export let hasEdit: boolean = false;
  export let idKey: keyof TRowData = 'id';
  export let items: TRowData[];
  export let itemDisplayText: string;
  export let selectedItemId: number | null = null;
  export let scrollToSelection: boolean = false;

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

  onDestroy(() => onBlur());

  function editItem() {
    dispatch('editItem', selectedItemIds);
  }

  function deleteItem() {
    dispatch('deleteItem', selectedItemIds);
  }

  function onAutoSizeContent() {
    dataGrid?.autoSizeAllColumns();
  }

  function onAutoSizeSpace() {
    dataGrid?.sizeColumnsToFit();
  }

  function onBlur() {
    if (browser) {
      document.removeEventListener('keydown', onKeyDown);
    }
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

  function onFocus() {
    document.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (selectedItemId !== null && isDeleteEvent(event)) {
      deleteItem();
    }
  }
</script>

<DataGrid
  bind:this={dataGrid}
  bind:currentSelectedRowId={selectedItemId}
  bind:selectedRowIds={selectedItemIds}
  {columnDefs}
  {columnStates}
  {getRowId}
  {isRowSelectable}
  preventDefaultOnContextMenu
  rowData={items}
  rowSelection="single"
  {scrollToSelection}
  on:blur={onBlur}
  on:cellContextMenu={onCellContextMenu}
  on:cellMouseOver
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnStateChange
  on:filterChanged
  on:focus={onFocus}
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
  <ColumnResizeContextMenu on:autoSizeContent={onAutoSizeContent} on:autoSizeSpace={onAutoSizeSpace} />
</ContextMenu>
