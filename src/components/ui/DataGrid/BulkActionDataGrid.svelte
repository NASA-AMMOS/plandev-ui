<svelte:options immutable={true} />

<script lang="ts">
  type RowData = $$Generic<TRowData>;

  // eslint-disable-next-line
  interface $$Events extends ComponentEvents<DataGrid<RowData>> {
    bulkCopyItems: CustomEvent<RowData[]>;
    bulkDeleteItems: CustomEvent<RowData[]>;
  }

  import { browser } from '$app/environment';
  import type { ColDef, ColumnState, IRowNode, RedrawRowsParams } from 'ag-grid-community';
  import { keyBy } from 'lodash-es';
  import { type ComponentEvents, createEventDispatcher, onDestroy } from 'svelte';
  import type { User } from '../../../types/app';
  import type { Dispatcher } from '../../../types/component';
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
  export let columnsToForceRefreshOnDataUpdate: (keyof RowData)[] = [];
  export let dataGrid: DataGrid<RowData> | undefined = undefined;
  export let hasDeletePermission: PermissionCheck<RowData> | boolean = true;
  export let hasDeletePermissionError: string = 'You do not have permission to delete.';
  export let idKey: keyof RowData = 'id';
  export let items: RowData[];
  export let loading: boolean = false;
  export let pluralItemDisplayText: string = '';
  export let scrollToSelection: boolean = false;
  export let selectedItemId: RowId | null = null;
  export let selectedItemIds: RowId[] = [];
  export let showContextMenu: boolean = true;
  export let showCopyMenu: boolean = false;
  export let showLoadingSkeleton: boolean = false;
  export let singleItemDisplayText: string = '';
  export let suppressDragLeaveHidesColumns: boolean = true;
  export let suppressRowClickSelection: boolean = false;
  export let user: User | null;
  export let filterExpression: string = '';

  export let getRowId: (data: RowData) => RowId = (data: RowData): RowId => parseInt(data[idKey]);
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;
  export let redrawRows: ((params?: RedrawRowsParams<RowData> | undefined) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  let isFiltered: boolean = false;
  let deletePermission: boolean = true;

  $: if (typeof hasDeletePermission === 'function' && user) {
    if (selectedItemIds.length > 0) {
      const selectedItems = items.filter(item => {
        return item.id !== undefined && selectedItemIds.includes(item.id);
      });
      if (selectedItems.length !== undefined && selectedItems.length > 0) {
        // Check that the user has delete permission on all selected items, or else don't let them delete any
        deletePermission = selectedItems.every(selectedItem => {
          if (typeof hasDeletePermission === 'function') {
            return hasDeletePermission(user, selectedItem) === true;
          }
        });
      }
    } else {
      const selectedItem = items.find(item => item.id === selectedItemId) ?? null;
      if (selectedItem) {
        if (typeof hasDeletePermission === 'function') {
          deletePermission = hasDeletePermission(user, selectedItem);
        }
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
  $: if (deletePermission != null) {
    redrawRows?.();
  }

  onDestroy(() => onBlur());

  function bulkCopyItems() {
    const selectedRows = getRowDataFromSelectedItems();
    if (selectedRows.length) {
      dispatch('bulkCopyItems', selectedRows);
    }
  }

  function bulkDeleteItems() {
    if (deletePermission) {
      const selectedRows = getRowDataFromSelectedItems();
      if (selectedRows.length) {
        dispatch('bulkDeleteItems', selectedRows);
      }
    }
  }

  function getRowDataFromSelectedItems(): RowData[] {
    const selectedItemIdsMap = keyBy(selectedItemIds);
    return items.reduce((selectedRows: RowData[], row: RowData) => {
      const id = getRowId(row);
      if (selectedItemIdsMap[id] !== undefined) {
        selectedRows.push(row);
      }
      return selectedRows;
    }, []);
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
  {columnsToForceRefreshOnDataUpdate}
  {getRowId}
  {idKey}
  {isRowSelectable}
  useCustomContextMenu={showContextMenu}
  rowData={items}
  rowSelection="multiple"
  {scrollToSelection}
  {showLoadingSkeleton}
  {suppressDragLeaveHidesColumns}
  {suppressRowClickSelection}
  {filterExpression}
  {loading}
  on:blur={onBlur}
  on:cellEditingStarted
  on:cellEditingStopped
  on:cellValueChanged
  on:cellMouseOver
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnStateChange
  on:filterChanged={onFilterChanged}
  on:focus={onFocus}
  on:gridSizeChanged
  on:rowClicked
  on:rowDoubleClicked
  on:rowSelected
  on:selectionChanged
>
  <svelte:fragment slot="context-menu">
    {#if showContextMenu}
      <slot name="context-menu" />
      <ContextMenuHeader>Bulk Actions</ContextMenuHeader>
      <ContextMenuItem on:click={selectAllItems}>
        Select All {isFiltered ? 'Visible ' : ''}{pluralItemDisplayText}
      </ContextMenuItem>

      {#if selectedItemIds.length}
        {#if showCopyMenu}
          <ContextMenuItem on:click={bulkCopyItems}>
            Copy {selectedItemIds.length}
            {selectedItemIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
          </ContextMenuItem>
        {/if}

        <ContextMenuItem
          use={[
            [
              permissionHandler,
              {
                hasPermission: deletePermission,
                permissionError: hasDeletePermissionError,
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
