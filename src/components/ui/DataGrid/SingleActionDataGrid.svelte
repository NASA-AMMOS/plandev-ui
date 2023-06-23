<svelte:options immutable={true} />

<script lang="ts">
  type RowData = $$Generic<TRowData>;

  interface $$Events extends ComponentEvents<DataGrid<RowData>> {
    deleteItem: CustomEvent<RowId[]>;
    editItem: CustomEvent<RowId[]>;
  }
  import { browser } from '$app/environment';
  import type { ColDef, ColumnState, IRowNode, RedrawRowsParams } from 'ag-grid-community';
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
  export let hasEdit: boolean = false;
  export let hasEditPermission: PermissionCheck<RowData> | boolean = true;
  export let idKey: keyof RowData = 'id';
  export let items: RowData[];
  export let itemDisplayText: string;
  export let selectedItemId: RowId | null = null;
  export let scrollToSelection: boolean = false;
  export let user: User | null;

  export let getRowId: (data: RowData) => RowId = (data: RowData): RowId => parseInt(data[idKey]);
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;
  export let redrawRows: ((params?: RedrawRowsParams<RowData> | undefined) => void) | undefined = undefined;

  const dispatch = createEventDispatcher();

  let deletePermission: boolean = true;
  let editPermission: boolean = true;
  let selectedItemIds: RowId[] = [];

  $: if ((typeof hasDeletePermission === 'function' || typeof hasEditPermission === 'function') && user) {
    const selectedItem = items.find(item => item.id === selectedItemId) ?? null;
    if (selectedItem) {
      if (typeof hasDeletePermission === 'function') {
        deletePermission = hasDeletePermission(user, selectedItem);
      }
      if (typeof hasEditPermission === 'function') {
        editPermission = hasEditPermission(user, selectedItem);
      }
    }
  }
  $: if (typeof hasDeletePermission === 'boolean') {
    deletePermission = hasDeletePermission;
  }
  $: if (typeof hasEditPermission === 'boolean') {
    editPermission = hasEditPermission;
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

  function editItem() {
    if (editPermission) {
      dispatch('editItem', selectedItemIds);
    }
  }

  function deleteItem() {
    if (deletePermission) {
      dispatch('deleteItem', selectedItemIds);
    }
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
  bind:redrawRows
  {autoSizeColumnsToFit}
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
      <ContextMenuItem
        use={[
          [
            permissionHandler,
            {
              hasPermission: editPermission,
              permissionError: 'You do not have permission to edit.',
            },
          ],
        ]}
        on:click={editItem}
      >
        Edit {itemDisplayText}
      </ContextMenuItem>
    {/if}
    {#if selectedItemId !== null}
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
        on:click={deleteItem}
      >
        Delete {itemDisplayText}
      </ContextMenuItem>
    {/if}
  </svelte:fragment>
</DataGrid>

<style>
  :global(.context-menu-item.disabled) {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
