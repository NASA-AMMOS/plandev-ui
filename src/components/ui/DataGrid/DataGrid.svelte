<svelte:options immutable={true} />

<script lang="ts">
  import { classNames } from '../../../utilities/generic';

  type RowData = $$Generic<TRowData>;

  interface $$Events extends ComponentEvents<SvelteComponent> {
    cellContextMenu: CustomEvent<CellContextMenuEvent<RowData>>;
    cellContextMenuHide: void;
    cellEditingStarted: CustomEvent<CellEditingStartedEvent<RowData>>;
    cellEditingStopped: CustomEvent<CellEditingStoppedEvent<RowData>>;
    cellMouseOver: CustomEvent<CellMouseOverEvent<RowData>>;
    cellValueChanged: CustomEvent<CellValueChangedEvent<RowData>>;
    columnMoved: CustomEvent<ColumnMovedEvent<RowData>>;
    columnPinned: CustomEvent<ColumnPinnedEvent<RowData>>;
    columnResized: CustomEvent<ColumnResizedEvent<RowData>>;
    columnStateChange: CustomEvent<ColumnState[] | undefined>;
    columnVisible: CustomEvent<ColumnVisibleEvent<RowData>>;
    columnsReset: void;
    filterChanged: CustomEvent<{ [key: string]: any } | undefined>;
    gridSizeChanged: CustomEvent<GridSizeChangedEvent<RowData>>;
    rowClicked: CustomEvent<DataGridRowSelection<RowData>>;
    rowDoubleClicked: CustomEvent<DataGridRowDoubleClick<RowData>>;
    rowSelected: CustomEvent<DataGridRowSelection<RowData>>;
    selectionChanged: CustomEvent<RowData[]>;
    sortChanged: CustomEvent<SortChangedEvent<RowData>>;
  }

  import {
    createGrid,
    type CellContextMenuEvent,
    type CellEditingStartedEvent,
    type CellEditingStoppedEvent,
    type CellMouseOverEvent,
    type CellValueChangedEvent,
    type ColDef,
    type Column,
    type ColumnMovedEvent,
    type ColumnPinnedEvent,
    type ColumnResizedEvent,
    type ColumnState,
    type ColumnVisibleEvent,
    type GridApi,
    type GridOptions,
    type GridSizeChangedEvent,
    type IRowNode,
    type ISizeColumnsToFitParams,
    type IsExternalFilterPresentParams,
    type RedrawRowsParams,
    type RefreshCellsParams,
    type RowClassParams,
    type RowClickedEvent,
    type RowDoubleClickedEvent,
    type RowSelectedEvent,
    type SelectionChangedEvent,
    type SortChangedEvent,
  } from 'ag-grid-community';
  import { debounce } from 'lodash-es';
  import { SvelteComponent, createEventDispatcher, onDestroy, onMount, type ComponentEvents } from 'svelte';
  import type { Dispatcher } from '../../../types/component';
  import type { DataGridRowDoubleClick, DataGridRowSelection, RowId, TRowData } from '../../../types/data-grid';
  import { removeLocalStorageItem, setLocalStorageItem } from '../../../utilities/localStorage';
  import ContextMenuInternal from '../../context-menu/ContextMenu.svelte';
  import ColumnResizeContextMenu from './column-menu/ColumnResizeContextMenu.svelte';
  import DataGridSkeleton from './DataGridSkeleton.svelte';

  export function autoSizeColumns(keys: (string | Column)[], skipHeader?: boolean) {
    gridApi?.autoSizeColumns(keys, skipHeader);
  }
  export function autoSizeAllColumns(skipHeader?: boolean) {
    gridApi?.autoSizeAllColumns(skipHeader);
  }
  export function focusDataGrid() {
    gridDiv.focus();
  }
  export function getColumnState() {
    return gridApi?.getColumnState();
  }
  // expose ag-grid function to select all visible rows
  export function selectAllVisible() {
    gridApi?.selectAllFiltered();
  }
  export function redrawRows(params?: RedrawRowsParams<RowData>) {
    gridApi?.redrawRows(params);
  }
  export function refreshCells(params?: RefreshCellsParams<RowData>) {
    gridApi?.refreshCells(params);
  }
  export function sizeColumnsToFit(params?: ISizeColumnsToFitParams) {
    gridApi?.sizeColumnsToFit(params);
  }
  export function resetColumns() {
    onResetColumns();
  }

  export function onFilterChanged() {
    gridApi?.onFilterChanged();
  }

  export function showContextMenu(event: MouseEvent, targetRowId?: RowId) {
    if (useCustomContextMenu) {
      if (targetRowId !== undefined) {
        contextMenuTargetRowId = targetRowId;
      }
      contextMenuOpen = true;
      contextMenu.show(event);
    }
  }

  export let autoSizeColumnsToFit: boolean = true;
  export { className as class };
  export let columnDefs: ColDef[];
  export let columnsToForceRefreshOnDataUpdate: (keyof RowData)[] = [];
  export let columnShiftResize: boolean = false;
  export let columnStates: ColumnState[] = [];
  /** When set, column state (visibility, order, width, sort, pinning) is persisted to localStorage under this key. */
  export let persistColumnStateKey: string | null = null;
  /** Optional transform applied both to loaded saved state (before applying to grid) and live state (before saving). */
  export let transformColumnState: ((state: ColumnState[]) => ColumnState[]) | null = null;
  export let currentSelectedRowId: RowId | null = null;
  export let filterExpression: string = '';
  export let headerHeight: number = 32;
  export let highlightOnSelection: boolean = true;
  export let doesExternalFilterPass: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;
  export let idKey: keyof RowData = 'id';
  export let loading: boolean = false;
  export let maintainColumnOrder: boolean | undefined = undefined;
  export let isExternalFilterPresent: ((params: IsExternalFilterPresentParams<RowData, any>) => boolean) | undefined =
    undefined;
  export let rowData: RowData[] = [];
  export let rowHeight: number | undefined = 33;
  export let rowSelection: 'single' | 'multiple' | undefined = undefined;
  export let scrollToSelection: boolean = false;
  export let selectedRowIds: RowId[] = [];
  export let shouldAutoGenerateId: boolean = false;
  export let shouldMultiSelectUpdatePrimarySelection: boolean = false;
  export let showLoadingSkeleton: boolean = false;
  export let suppressCellFocus: boolean = true;
  export let suppressContextMenuSelection: boolean = false;
  export let suppressDragLeaveHidesColumns: boolean = true;
  export let suppressRowClickSelection: boolean = false;
  export let tertiaryHighlightIds: RowId[] | null = null;
  export let useCustomContextMenu: boolean | undefined = undefined;
  export let noRowsOverlayText: string = 'No Rows To Show';

  export let getRowId: (data: RowData) => RowId = (data: RowData): number => {
    return parseInt(data[idKey]);
  };
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;

  // Ref type for values that AG Grid's rowClassRules need to access without triggering re-renders
  type Ref<T> = { value: T };

  const CURRENT_SELECTED_ROW_CLASS = 'ag-current-row-selected';
  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  // These refs allow AG Grid's rowClassRules to access current values without triggering full re-renders
  const contextMenuOpenRef: Ref<boolean> = { value: false };
  const contextMenuTargetRowIdRef: Ref<RowId | null> = { value: null };
  const currentSelectedRowIdRef: Ref<RowId | null> = { value: null };
  const selectedRowIdsRef: Ref<RowId[]> = { value: [] };
  const onColumnStateChangeDebounced = debounce(onColumnStateChange, 500);
  const onWindowResizedDebounced = debounce(sizeColumnsToFit, 50);

  let className: string = '';
  let contextMenu: ContextMenuInternal;
  let contextMenuOpen: boolean = false;
  let contextMenuTargetRowId: RowId | null = null;
  let gridOptions: GridOptions<RowData>;
  let gridApi: GridApi<RowData> | undefined;
  let gridDiv: HTMLDivElement;
  let loadingMessageTimeout: NodeJS.Timeout | null = null;
  let mounted: boolean = false;
  let previousSelectedRowId: RowId | null = null;
  let resizeObserver: ResizeObserver | null = null;

  $: {
    const seenSet = new Set<RowId>();
    rowData.forEach(rowDatum => {
      if (!seenSet.has(getRowId(rowDatum))) {
        // Non duplicate case
        seenSet.add(getRowId(rowDatum));
      } else {
        // Found duplicate, write error message
        console.error(
          `%c Grid Problems? Look Here!
A DataGrid has had multiple rows keyed over the same ID - ensure no two rows have the same value for the \`${String(
            idKey,
          )}\` property at the same time, even for a moment. The offending ID is ${getRowId(rowDatum)}
This has been seen to result in unintended and often glitchy behavior, which often requires a page reload to resolve.`,
          'font-weight:bold;',
        );
      }
    });
    if (rowData.length < 1 && !isLoading()) {
      gridApi?.setGridOption('suppressNoRowsOverlay', false);
    }
    gridApi?.setGridOption('rowData', rowData);

    const previousSelectedRowIds: RowId[] = [];
    // get all currently selected nodes. we cannot use `getSelectedNodes` because that does not include filtered rows
    gridApi?.forEachNode((rowNode: IRowNode<RowData>) => {
      if (rowNode.data && rowNode.isSelected()) {
        previousSelectedRowIds.push(getRowId(rowNode.data));
      }
    });
    const previousSelectedRowIdsSet: Set<RowId> = new Set(previousSelectedRowIds);
    const selectedRowIdsSet: Set<RowId> = new Set(selectedRowIds);

    /**
     *  remove the rows that are present in both because those are the rows that haven't changed
     *  deleting the shared ids from the `currentSelectedRowIdsSet` will yield ids that need to be deselected
     *  deleting the shared ids from the `selectedRowIdsSet` will yield the new ids that need to be selected
     */
    for (let i = previousSelectedRowIds.length; i >= 0; --i) {
      const currentId = previousSelectedRowIds[i];
      if (selectedRowIdsSet.has(currentId)) {
        previousSelectedRowIdsSet.delete(currentId);
        selectedRowIdsSet.delete(currentId);
      }
    }

    previousSelectedRowIdsSet.forEach(deselectedRowId => {
      const selectedRow = gridApi?.getRowNode(`${deselectedRowId}`);
      selectedRow?.setSelected(false);
    });

    selectedRowIdsSet.forEach(selectedRowId => {
      const selectedRow = gridApi?.getRowNode(`${selectedRowId}`);
      selectedRow?.setSelected(true);
    });

    if (columnsToForceRefreshOnDataUpdate.length) {
      gridApi?.refreshCells({
        columns: columnsToForceRefreshOnDataUpdate as string[],
        force: true,
      });
    }
  }
  $: if (autoSizeColumnsToFit) {
    gridApi?.sizeColumnsToFit();
  }
  $: gridApi?.applyColumnState({ applyOrder: true, state: columnStates });

  $: if (!selectedRowIds.length) {
    currentSelectedRowId = null;
  } else if (selectedRowIds.length === 1) {
    currentSelectedRowId = selectedRowIds[0];
  }

  $: contextMenuOpenRef.value = contextMenuOpen;
  $: contextMenuTargetRowIdRef.value = contextMenuTargetRowId;
  $: currentSelectedRowIdRef.value = currentSelectedRowId;
  $: selectedRowIdsRef.value = selectedRowIds;

  /**
   * Manually manipulate the old and newly selected row classes instead of invoking `redrawRows`
   * in order to correctly mark what the current selected row is. Calling `redrawRows` caused cellrenders to
   * lose their current state and be reinitialized. `refreshCells` is not enough to cause ag-grid to recompute
   * all the row styles.
   *
   * AG Grid renders each row in both the center and the pinned-left/right containers, so we must update every
   * matching element — querySelector only catches the first and leaves the pinned copies with stale classes.
   */
  $: {
    gridDiv
      ?.querySelectorAll(`[row-id="${previousSelectedRowId}"]`)
      .forEach(row => row.classList.remove(CURRENT_SELECTED_ROW_CLASS));
    gridDiv
      ?.querySelectorAll(`[row-id="${currentSelectedRowId}"]`)
      .forEach(row => row.classList.add(CURRENT_SELECTED_ROW_CLASS));

    previousSelectedRowId = currentSelectedRowId;
  }

  // Redraw rows when context menu state changes to apply rowClassRules
  $: contextMenuOpen, contextMenuTargetRowId, tertiaryHighlightIds, gridApi?.redrawRows();

  $: {
    gridApi?.setGridOption('quickFilterText', filterExpression);
  }

  // Update overlay text when noRowsOverlayText prop changes
  $: if (gridApi && noRowsOverlayText) {
    gridApi.setGridOption(
      'overlayNoRowsTemplate',
      `<span class="ag-overlay-no-rows-center">${noRowsOverlayText}</span>`,
    );
    // Re-show overlay if no visible rows, to reflect the updated text
    let visibleRowCount = 0;
    gridApi.forEachNodeAfterFilter(() => {
      visibleRowCount++;
    });
    if (visibleRowCount === 0 && !loading) {
      gridApi.showNoRowsOverlay();
    }
  }

  $: if (loading) {
    if (loadingMessageTimeout) {
      clearTimeout(loadingMessageTimeout);
    }
    loadingMessageTimeout = setTimeout(() => {
      gridApi?.setGridOption('loading', true);
    }, 50);
  } else {
    if (loadingMessageTimeout) {
      clearTimeout(loadingMessageTimeout);
    }
    if (gridApi?.getGridOption('loading')) {
      gridApi?.setGridOption('loading', false);
    }
    // Show no-rows overlay after loading completes with empty data
    if (gridApi) {
      gridApi.setGridOption('suppressNoRowsOverlay', false);
      if (gridApi.getDisplayedRowCount() === 0) {
        gridApi.showNoRowsOverlay();
      }
    }
  }

  onDestroy(() => {
    resizeObserver?.disconnect();
  });

  function isLoading() {
    return loading;
  }

  function onAutoSizeContent() {
    gridApi?.autoSizeAllColumns();
  }

  function onAutoSizeSpace() {
    if (!gridApi) {
      return;
    }

    // Temporarily override suppressSizeToFit on resizable columns so the explicit
    // user action works even on columns that normally suppress auto-fitting
    const columns = gridApi.getColumns();
    const overrides: { colDef: ColDef; original: boolean | undefined }[] = [];
    if (columns) {
      for (const col of columns) {
        const colDef = col.getColDef();
        if (colDef.resizable !== false && colDef.suppressSizeToFit) {
          overrides.push({ colDef, original: colDef.suppressSizeToFit });
          colDef.suppressSizeToFit = false;
        }
      }
    }

    gridApi.sizeColumnsToFit();

    // Restore original values so automatic resizing still respects the column settings
    for (const { colDef, original } of overrides) {
      colDef.suppressSizeToFit = original;
    }
  }

  function onResetColumns() {
    gridApi?.resetColumnState();
    gridApi?.sizeColumnsToFit();
    if (persistColumnStateKey) {
      removeLocalStorageItem(persistColumnStateKey);
    }
    dispatch('columnsReset');
  }

  function onColumnStateChange() {
    const state = gridApi?.getColumnState();
    dispatch('columnStateChange', state);
    if (persistColumnStateKey && state) {
      const toSave = transformColumnState ? transformColumnState(state) : state;
      setLocalStorageItem(persistColumnStateKey, toSave);
    }
  }

  function onCellContextMenu(event: CellContextMenuEvent<RowData>) {
    if (useCustomContextMenu) {
      // Call show() first - this triggers hideAllMenus() which may dispatch 'hide' event
      // and reset our state variables. We set them after to ensure they persist.
      contextMenu.show(event.event as MouseEvent);

      const { data: clickedRow } = event;

      if (suppressContextMenuSelection) {
        // Track the context menu target without changing selection
        if (clickedRow) {
          contextMenuTargetRowId = getRowId(clickedRow);
        }
      } else if (
        clickedRow &&
        selectedRowIds.length <= 1 &&
        (!isRowSelectable || isRowSelectable(event.node)) &&
        !suppressRowClickSelection
      ) {
        currentSelectedRowId = getRowId(clickedRow);
        selectedRowIds = [currentSelectedRowId];
      }

      contextMenuOpen = true;
    }
    dispatch('cellContextMenu', event);
  }

  function onCellContextMenuHide() {
    contextMenuOpen = false;
    contextMenuTargetRowId = null;
    dispatch('cellContextMenuHide');
  }

  onMount(() => {
    gridOptions = {
      // each entry here represents one column
      ...(columnShiftResize ? {} : { colResizeDefault: 'shift' }),
      animateRows: false,
      columnDefs,
      doesExternalFilterPass,
      headerHeight,
      includeHiddenColumnsInQuickFilter: true,
      ...(shouldAutoGenerateId ? {} : { getRowId: (params: { data: RowData }) => `${getRowId(params.data)}` }),
      isExternalFilterPresent,
      isRowSelectable,
      loading,
      maintainColumnOrder,
      onCellContextMenu,
      onCellEditingStarted(event: CellEditingStartedEvent<RowData>) {
        dispatch('cellEditingStarted', event);
      },
      onCellEditingStopped(event: CellEditingStoppedEvent<RowData>) {
        dispatch('cellEditingStopped', event);
      },
      onCellMouseOver(event: CellMouseOverEvent<RowData>) {
        dispatch('cellMouseOver', event);
      },
      onCellValueChanged(event: CellValueChangedEvent<RowData>) {
        dispatch('cellValueChanged', event);
      },
      onColumnMoved(event: ColumnMovedEvent<RowData>) {
        dispatch('columnMoved', event);
        onColumnStateChangeDebounced();
      },
      onColumnPinned(event: ColumnPinnedEvent<RowData>) {
        dispatch('columnPinned', event);
        onColumnStateChangeDebounced();
      },
      onColumnResized(event: ColumnResizedEvent<RowData>) {
        dispatch('columnResized', event);
        onColumnStateChangeDebounced();
      },
      onColumnVisible(event: ColumnVisibleEvent<RowData>) {
        dispatch('columnVisible', event);
        onColumnStateChangeDebounced();
      },
      onFilterChanged() {
        const selectedRows: RowData[] = [];
        let visibleRowCount = 0;

        gridApi?.forEachNodeAfterFilter((rowNode: IRowNode<RowData>) => {
          visibleRowCount++;
          if (rowNode.data && rowNode.isSelected()) {
            selectedRows.push(rowNode.data);
          }
        });

        // Show/hide the no rows overlay based on visible row count after filtering
        if (visibleRowCount === 0 && !isLoading()) {
          gridApi?.showNoRowsOverlay();
        } else if (visibleRowCount > 0) {
          gridApi?.hideOverlay();
        }

        dispatch('filterChanged', gridApi?.getFilterModel());

        // re-throw `selectionChanged` with only the visible rows after filtering
        dispatch('selectionChanged', selectedRows);
      },
      onGridSizeChanged(event: GridSizeChangedEvent<RowData>) {
        dispatch('gridSizeChanged', event);
      },
      onRowClicked({ data, node, event }: RowClickedEvent<RowData>) {
        const isSelected = node.isSelected();
        dispatch('rowClicked', {
          data,
          event,
          isSelected,
        } as DataGridRowSelection<RowData>);

        if (data && !suppressRowClickSelection && isSelected) {
          const mouseEvent = event as MouseEvent;
          const isMultiGrid = rowSelection === 'multiple'; // todo update, deprecated api
          const usedMultiKey = mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey;
          const isMulti = isMultiGrid && usedMultiKey;
          // only change the primary selection if we're not in the middle of a multi-select operation
          // (or if shouldMultiSelectUpdatePrimarySelection is true)
          const isPrimarySelect = !isMulti || (isMulti && shouldMultiSelectUpdatePrimarySelection);

          if (isPrimarySelect) {
            currentSelectedRowId = getRowId(data);
            dispatch('rowSelected', {
              data,
              isSelected,
            } as DataGridRowSelection<RowData>);
          }
        }
      },
      onRowDoubleClicked(event: RowDoubleClickedEvent<RowData>) {
        if (event.data) {
          dispatch('rowDoubleClicked', { data: event.data });
        }
      },
      onRowSelected({ data, node }: RowSelectedEvent<RowData>) {
        const selectedNodes = gridApi?.getSelectedNodes() ?? [];

        // only dispatch `rowSelected` or enforce visibility for single row selections
        if (selectedNodes.length <= 1 || suppressRowClickSelection) {
          if (selectedNodes.length && scrollToSelection && selectedNodes[0].rowIndex !== null) {
            gridApi?.ensureIndexVisible(selectedNodes[0].rowIndex);
          }

          dispatch('rowSelected', {
            data,
            isSelected: node.isSelected(),
          } as DataGridRowSelection<RowData>);
        }
      },
      onSelectionChanged(event: SelectionChangedEvent) {
        const selectedRows = gridApi?.getSelectedRows() ?? [];
        selectedRowIds = selectedRows.map((selectedRow: RowData) => getRowId(selectedRow));

        if (selectedRows.length === 1) {
          currentSelectedRowId = getRowId(selectedRows[0]);
        } else if (currentSelectedRowId != null && !selectedRowIds.includes(currentSelectedRowId)) {
          // select the first displayed selected row in the table if the current selected row is deselected
          let wasCurrentSelectedRowUpdated: boolean = false;
          gridApi?.forEachNodeAfterFilterAndSort((rowNode: IRowNode<RowData>) => {
            if (!wasCurrentSelectedRowUpdated && rowNode.data && rowNode.isSelected()) {
              currentSelectedRowId = getRowId(rowNode.data);
              wasCurrentSelectedRowUpdated = true;

              dispatch('rowSelected', {
                data: rowNode.data,
                isSelected: rowNode.isSelected(),
              } as DataGridRowSelection<RowData>);
            }
          });
        }

        if (event.source === 'rowClicked') {
          dispatch('selectionChanged', selectedRows);
        }
      },
      onSortChanged(event: SortChangedEvent<RowData>) {
        dispatch('sortChanged', event);
        onColumnStateChangeDebounced();
      },
      overlayNoRowsTemplate: `<span class="ag-overlay-no-rows-center">${noRowsOverlayText}</span>`,
      preventDefaultOnContextMenu: useCustomContextMenu,
      rowClassRules: {
        [CURRENT_SELECTED_ROW_CLASS]: (params: RowClassParams<RowData>) => {
          return !!params.data && currentSelectedRowIdRef.value === getRowId(params.data);
        },
        'ag-context-menu-target': (params: RowClassParams<RowData>) => {
          if (!params.data || !contextMenuOpenRef.value) {
            return false;
          }
          const rowId = getRowId(params.data);
          const targetId = contextMenuTargetRowIdRef.value;
          // If target is in selection, highlight all selected rows; otherwise just the target
          const targetInSelection = targetId !== null && selectedRowIdsRef.value.includes(targetId);
          if (targetInSelection) {
            return selectedRowIdsRef.value.includes(rowId);
          }
          return rowId === targetId;
        },
        'ag-selectable-row': (params: RowClassParams<RowData>) => {
          if (isRowSelectable) {
            if (isRowSelectable(params.node)) {
              return true;
            }
          } else if (rowSelection !== undefined) {
            return true;
          }
          return false;
        },
        'ag-tertiary-highlight': (params: RowClassParams<RowData>) => {
          if (!params.data || !tertiaryHighlightIds) {
            return false;
          }
          const rowId = getRowId(params.data);
          return tertiaryHighlightIds.includes(rowId);
        },
      },
      rowData,
      rowHeight,
      rowSelection,
      suppressCellFocus,
      suppressDragLeaveHidesColumns,
      suppressNoRowsOverlay: loading,
      suppressRowClickSelection,
    };
    gridApi = createGrid(gridDiv, gridOptions);

    if (autoSizeColumnsToFit) {
      resizeObserver = new ResizeObserver(entries => {
        // Skip when the grid is collapsed or too small to avoid saving bad column sizes
        if ((entries[0]?.contentRect.width ?? 0) < 50) {
          return;
        }
        onWindowResizedDebounced();
      });
      resizeObserver.observe(gridDiv);
    }

    mounted = true;
  });
</script>

<div class={classNames('data-grid-container', { [className]: !!className })}>
  {#if !mounted && showLoadingSkeleton}
    <div class="loading">
      <DataGridSkeleton columns={columnDefs.filter(c => !c.hide).length} />
    </div>
  {/if}
  <div
    bind:this={gridDiv}
    class="ag-theme-stellar data-grid-table"
    class:highlightOnSelection
    tabindex="-1"
    on:focus
    on:blur
  />
</div>

<ContextMenuInternal bind:this={contextMenu} on:hide={onCellContextMenuHide}>
  <slot name="context-menu" />
  <ColumnResizeContextMenu
    on:autoSizeContent={onAutoSizeContent}
    on:autoSizeSpace={onAutoSizeSpace}
    on:columnsReset={onResetColumns}
  />
</ContextMenuInternal>

<style>
  .data-grid-container {
    height: 100%;
    position: relative;
    width: 100%;
  }
  .loading {
    height: 100%;
    position: absolute;
    width: 100%;
  }
  .data-grid-table {
    height: 100%;
    width: 100%;
  }
  :global(.tags-cell) {
    align-items: center;
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 2px;
    min-height: 30px;
    padding: 2px 0px;
  }

  :global(.tags-cell .tag.st-chip) {
    display: inline !important;
  }
</style>
