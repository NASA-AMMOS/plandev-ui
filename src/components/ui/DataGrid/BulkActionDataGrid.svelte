<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import type { ColDef, ColumnState, RowNode } from 'ag-grid-community';
  import { keyBy } from 'lodash-es';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import type { RowId, TRowData } from '../../../types/data-grid';
  import { isDeleteEvent } from '../../../utilities/keyboardEvents';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid = undefined;
  export let idKey: keyof TRowData = 'id';
  export let items: TRowData[];
  export let pluralItemDisplayText: string = '';
  export let scrollToSelection: boolean = false;
  export let selectedItemId: RowId | null = null;
  export let showContextMenu: boolean = true;
  export let singleItemDisplayText: string = '';
  export let suppressDragLeaveHidesColumns: boolean = true;
  export let suppressRowClickSelection: boolean = false;

  export let getRowId: (data: TRowData) => RowId = (data: TRowData): RowId => parseInt(data[idKey]);
  export let isRowSelectable: (node: RowNode<TRowData>) => boolean = undefined;

  const dispatch = createEventDispatcher();

  let isFiltered: boolean = false;
  let selectedItemIds: RowId[] = [];

  $: if (!selectedItemIds.includes(selectedItemId) && selectedItemId != null) {
    selectedItemIds = [selectedItemId];
  } else if (selectedItemId === null) {
    selectedItemIds = [];
  }

  onDestroy(() => onBlur());

  function bulkDeleteItems() {
    const selectedItemIdsMap = keyBy(selectedItemIds);
    const selectedRows: TRowData[] = items.reduce((selectedRows: TRowData[], row: TRowData) => {
      const id = getRowId(row);
      if (selectedItemIdsMap[id] !== undefined) {
        selectedRows.push(row);
      }
      return selectedRows;
    }, []);

    if (selectedRows.length) {
      dispatch('bulkDeleteItems', selectedRows);
    }
  }

  function onBlur() {
    if (browser) {
      document.removeEventListener('keydown', onKeyDown);
    }
  }

  function onFilterChanged(event: CustomEvent) {
    const { detail: filterModel } = event;

    isFiltered = Object.keys(filterModel).length > 0;
  }

  function onFocus() {
    document.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (isDeleteEvent(event)) {
      bulkDeleteItems();
    }
  }

  function selectAllItems() {
    dataGrid.selectAllVisible();
    dataGrid.focusDataGrid();
  }
</script>

<DataGrid
  bind:this={dataGrid}
  bind:currentSelectedRowId={selectedItemId}
  bind:selectedRowIds={selectedItemIds}
  {columnDefs}
  {columnStates}
  {getRowId}
  {idKey}
  {isRowSelectable}
  useCustomContextMenu={showContextMenu}
  rowData={items}
  rowSelection="multiple"
  {scrollToSelection}
  {suppressDragLeaveHidesColumns}
  {suppressRowClickSelection}
  on:blur={onBlur}
  on:cellMouseOver
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnStateChange
  on:filterChanged={onFilterChanged}
  on:focus={onFocus}
  on:rowClicked
  on:rowDoubleClicked
  on:rowSelected
  on:selectionChanged
>
  <svelte:fragment slot="context-menu">
    {#if showContextMenu}
      <ContextMenuHeader>Bulk Actions</ContextMenuHeader>
      <ContextMenuItem on:click={selectAllItems}>
        Select All {isFiltered ? 'Visible ' : ''}{pluralItemDisplayText}
      </ContextMenuItem>
      {#if selectedItemIds.length}
        <ContextMenuItem on:click={bulkDeleteItems}>
          Delete {selectedItemIds.length}
          {selectedItemIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
        </ContextMenuItem>
      {/if}
    {/if}
  </svelte:fragment>
</DataGrid>
