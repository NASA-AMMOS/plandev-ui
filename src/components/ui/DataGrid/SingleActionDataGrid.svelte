<svelte:options immutable={true} />

<script lang="ts">
  type RowData = $$Generic<TRowData>;

  interface $$Events extends ComponentEvents<DataGrid<RowData>> {
    deleteItem: CustomEvent<RowId[]>;
    editItem: CustomEvent<RowId[]>;
  }
  import { browser } from '$app/environment';
  import type { ColDef, ColumnState, IRowNode } from 'ag-grid-community';
  import { createEventDispatcher, onDestroy, type ComponentEvents } from 'svelte';
  import type { RowId, TRowData } from '../../../types/data-grid';
  import { isDeleteEvent } from '../../../utilities/keyboardEvents';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<RowData> | undefined = undefined;
  export let hasEdit: boolean = false;
  export let idKey: keyof RowData = 'id';
  export let items: RowData[];
  export let itemDisplayText: string;
  export let selectedItemId: RowId | null = null;
  export let scrollToSelection: boolean = false;

  export let getRowId: (data: RowData) => RowId = (data: RowData): RowId => parseInt(data[idKey]);
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;

  const dispatch = createEventDispatcher();

  let selectedItemIds: RowId[] = [];

  $: if (selectedItemId != null && !selectedItemIds.includes(selectedItemId)) {
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

  function onBlur() {
    if (browser) {
      document.removeEventListener('keydown', onKeyDown);
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
  useCustomContextMenu
  rowData={items}
  rowSelection="single"
  {scrollToSelection}
  on:blur={onBlur}
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
>
  <svelte:fragment slot="context-menu">
    <ContextMenuHeader>Actions</ContextMenuHeader>
    {#if hasEdit}
      <ContextMenuItem on:click={editItem}>
        Edit {itemDisplayText}
      </ContextMenuItem>
    {/if}
    {#if selectedItemId !== null}
      <ContextMenuItem on:click={deleteItem}>
        Delete {itemDisplayText}
      </ContextMenuItem>
    {/if}
  </svelte:fragment>
</DataGrid>
