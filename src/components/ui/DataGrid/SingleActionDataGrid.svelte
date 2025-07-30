<svelte:options immutable={true} accessors={true} />

<script lang="ts">
  type RowData = $$Generic<TRowData>;

  interface $$Events extends ComponentEvents<DataGrid<RowData>> {
    deleteItem: CustomEvent<RowId[]>;
    editItem: CustomEvent<RowId[]>;
  }
  import { browser } from '$app/environment';
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import type {
    ColDef,
    ColumnState,
    IRowNode,
    IsExternalFilterPresentParams,
    RedrawRowsParams,
  } from 'ag-grid-community';
  import { Trash2 } from 'lucide-svelte';
  import { createEventDispatcher, onDestroy, type ComponentEvents } from 'svelte';
  import type { User } from '../../../types/app';
  import type { Dispatcher } from '../../../types/component';
  import type { RowId } from '../../../types/data-grid';
  import type { PermissionCheck } from '../../../types/permissions';
  import { isDeleteEvent } from '../../../utilities/keyboardEvents';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  const defaultDeletePermissionError: string = 'You do not have permission to delete.';
  const defaultEditPermissionError: string = 'You do not have permission to edit.';

  export let autoSizeColumnsToFit: boolean = true;
  export { className as class };
  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let columnsToForceRefreshOnDataUpdate: (keyof RowData)[] = [];
  export let dataGrid: DataGrid<RowData> | undefined = undefined;
  export let filterExpression: string = '';
  export let hasDeletePermission: PermissionCheck<RowData> | boolean = true;
  export let hasDeletePermissionError: string | ((user: User, data: RowData) => string) | undefined =
    defaultDeletePermissionError;
  export let hasEdit: boolean = false;
  export let hasEditPermission: PermissionCheck<RowData> | boolean = true;
  export let hasEditPermissionError: string | ((user: User, data: RowData) => string) | undefined =
    defaultEditPermissionError;
  export let idKey: keyof RowData = 'id';
  export let items: RowData[];
  export let itemDisplayText: string;
  export let loading: boolean = false;
  export let selectedItemId: RowId | null = null;
  export let scrollToSelection: boolean = false;
  export let showLoadingSkeleton: boolean = false;
  export let suppressRowClickSelection: boolean = false;
  export let user: User | null;

  export let getRowId: (data: RowData) => RowId = (data: RowData): RowId => parseInt(data[idKey]);
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;
  export let isExternalFilterPresent: ((params: IsExternalFilterPresentParams<RowData, any>) => boolean) | undefined =
    undefined;
  export let doesExternalFilterPass: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;

  export let redrawRows: ((params?: RedrawRowsParams<RowData> | undefined) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  let className: string = '';
  let deletePermission: boolean = true;
  let deletePermissionError: string = defaultDeletePermissionError;
  let editPermission: boolean = true;
  let editPermissionError: string = defaultEditPermissionError;
  let selectedItemIds: RowId[] = [];

  $: if ((typeof hasDeletePermission === 'function' || typeof hasEditPermission === 'function') && user) {
    const selectedItem = items.find(item => getRowId(item) === selectedItemId) ?? null;
    if (selectedItem) {
      if (typeof hasDeletePermission === 'function') {
        deletePermission = hasDeletePermission(user, selectedItem);
      }
      if (typeof hasDeletePermissionError === 'function') {
        deletePermissionError = hasDeletePermissionError(user, selectedItem);
      }
      if (typeof hasEditPermission === 'function') {
        editPermission = hasEditPermission(user, selectedItem);
      }
      if (typeof hasEditPermissionError === 'function') {
        editPermissionError = hasEditPermissionError(user, selectedItem);
      }
    }
  }
  $: if (typeof hasDeletePermission === 'boolean') {
    deletePermission = hasDeletePermission;
  }
  $: if (typeof hasDeletePermissionError === 'string') {
    deletePermissionError = hasDeletePermissionError;
  }
  $: if (typeof hasEditPermission === 'boolean') {
    editPermission = hasEditPermission;
  }
  $: if (typeof hasEditPermissionError === 'string') {
    editPermissionError = hasEditPermissionError;
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
  class={className}
  {autoSizeColumnsToFit}
  {columnDefs}
  {columnStates}
  {columnsToForceRefreshOnDataUpdate}
  {filterExpression}
  {idKey}
  {getRowId}
  {isRowSelectable}
  {isExternalFilterPresent}
  {doesExternalFilterPass}
  useCustomContextMenu
  rowData={items}
  rowSelection="single"
  {scrollToSelection}
  {showLoadingSkeleton}
  {loading}
  {suppressRowClickSelection}
  on:blur={onBlur}
  on:cellContextMenu
  on:cellContextMenuHide
  on:cellEditingStarted
  on:cellEditingStopped
  on:cellValueChanged
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
    <slot name="context-menu" {selectedItemId} />
    {#if hasEdit}
      <div
        use:permissionHandler={{
          hasPermission: editPermission,
          permissionError: editPermissionError,
        }}
      >
        <ContextMenu.Item size="sm" disabled={!editPermission} on:click={editItem}>
          Edit {itemDisplayText}
        </ContextMenu.Item>
      </div>
    {/if}
    {#if selectedItemId !== null}
      <div
        use:permissionHandler={{
          hasPermission: deletePermission,
          permissionError: deletePermissionError,
        }}
      >
        <ContextMenu.Item class="items-center gap-2" size="sm" disabled={!deletePermission} on:click={deleteItem}>
          <Trash2 size={14} /> Delete {itemDisplayText}
        </ContextMenu.Item>
      </div>
    {/if}
    <ContextMenu.Separator />
  </svelte:fragment>
</DataGrid>
