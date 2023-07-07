<svelte:options immutable={true} />

<script lang="ts">
  type RowData = $$Generic<TRowData>;

  // eslint-disable-next-line
  interface $$Events extends ComponentEvents<DataGrid<RowData>> {
    bulkDeleteItems: CustomEvent<RowData[]>;
  }
  import { browser } from '$app/environment';
  import type { ColDef, ColumnState, IRowNode, RedrawRowsParams } from 'ag-grid-community';
  import { keyBy } from 'lodash-es';
  import { createEventDispatcher, onDestroy, type ComponentEvents } from 'svelte';
  import type { User } from '../../../types/app';
  import type { RowId, TRowData } from '../../../types/data-grid';
  import type { PermissionCheck } from '../../../types/permissions';
  import { isDeleteEvent } from '../../../utilities/keyboardEvents';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import ContextMenuHeader from '../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../context-menu/ContextMenuItem.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  export let autoSizeColumnsToFit: boolean = true;
  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<RowData> | undefined = undefined;
  export let hasDeletePermission: PermissionCheck<RowData> | boolean = true;
  export let idKey: keyof RowData = 'id';
  export let items: RowData[];
  export let pluralItemDisplayText: string = '';
  export let scrollToSelection: boolean = false;
  export let selectedItemId: RowId | null = null;
  export let showContextMenu: boolean = true;
  export let singleItemDisplayText: string = '';
  export let suppressDragLeaveHidesColumns: boolean = true;
  export let suppressRowClickSelection: boolean = false;
  export let user: User | null;

  export let getRowId: (data: RowData) => RowId = (data: RowData): RowId => parseInt(data[idKey]);
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;
  export let redrawRows: ((params?: RedrawRowsParams<RowData> | undefined) => void) | undefined = undefined;

  const dispatch = createEventDispatcher();

  let isFiltered: boolean = false;
  let deletePermission: boolean = true;
  let selectedItemIds: RowId[] = [];

  $: if (typeof hasDeletePermission === 'function' && user) {
    const selectedItem = items.find(item => item.id === selectedItemId) ?? null;
    if (selectedItem) {
      if (typeof hasDeletePermission === 'function') {
        deletePermission = hasDeletePermission(user, selectedItem);
      }
    }
  }
  $: if (typeof hasDeletePermission === 'boolean') {
    deletePermission = hasDeletePermission;
  }
  $: if (selectedItemId != null && !selectedItemIds.includes(selectedItemId)) {
    selectedItemIds = [selectedItemId];
  } else if (selectedItemId === null) {
    selectedItemIds = [];
  }
  $: if (user !== undefined) {
    redrawRows?.();
  }

  onDestroy(() => onBlur());

  function bulkDeleteItems() {
    if (deletePermission) {
      const selectedItemIdsMap = keyBy(selectedItemIds);
      const selectedRows: RowData[] = items.reduce((selectedRows: RowData[], row: RowData) => {
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
    dataGrid?.selectAllVisible();
    dataGrid?.focusDataGrid();
  }
</script>

<DataGrid
  bind:this={dataGrid}
  bind:currentSelectedRowId={selectedItemId}
  bind:selectedRowIds={selectedItemIds}
  bind:redrawRows
  {autoSizeColumnsToFit}
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
        <ContextMenuItem
          use={[
            [
              permissionHandler,
              {
                hasPermission: deletePermission,
                permissionError: 'You do not have permission to delete.',
              },
            ],
          ]}
          on:click={bulkDeleteItems}
        >
          Delete {selectedItemIds.length}
          {selectedItemIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
        </ContextMenuItem>
      {/if}
    {/if}
  </svelte:fragment>
</DataGrid>
