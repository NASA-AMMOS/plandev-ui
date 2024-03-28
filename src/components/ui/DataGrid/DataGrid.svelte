<svelte:options immutable={true} />

<script lang="ts">
  type RowData = $$Generic<TRowData>;

  interface $$Events extends ComponentEvents<SvelteComponent> {
    cellContextMenu: CustomEvent<CellContextMenuEvent<RowData>>;
    cellEditingStarted: CustomEvent<CellEditingStartedEvent<RowData>>;
    cellEditingStopped: CustomEvent<CellEditingStoppedEvent<RowData>>;
    cellMouseOver: CustomEvent<CellMouseOverEvent<RowData>>;
    cellValueChanged: CustomEvent<CellValueChangedEvent<RowData>>;
    columnMoved: CustomEvent<ColumnMovedEvent<RowData>>;
    columnPinned: CustomEvent<ColumnPinnedEvent<RowData>>;
    columnResized: CustomEvent<ColumnResizedEvent<RowData>>;
    columnStateChange: CustomEvent<ColumnState[] | undefined>;
    columnVisible: CustomEvent<ColumnVisibleEvent<RowData>>;
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
  import { filterEmpty } from '../../../utilities/generic';
  import ContextMenu from '../../context-menu/ContextMenu.svelte';
  import ColumnResizeContextMenu from './column-menu/ColumnResizeContextMenu.svelte';

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
  export function sizeColumnsToFit(params?: ISizeColumnsToFitParams) {
    gridApi?.sizeColumnsToFit(params);
  }

  export function onFilterChanged() {
    gridApi?.onFilterChanged();
  }

  export let autoSizeColumnsToFit: boolean = true;
  export let columnDefs: ColDef[];
  export let columnShiftResize: boolean = false;
  export let columnStates: ColumnState[] = [];
  export let currentSelectedRowId: RowId | null = null;
  export let filterExpression: string = '';
  export let highlightOnSelection: boolean = true;
  export let doesExternalFilterPass: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;
  export let idKey: keyof RowData = 'id';
  export let maintainColumnOrder: boolean | undefined = undefined;
  export let isExternalFilterPresent: ((params: IsExternalFilterPresentParams<RowData, any>) => boolean) | undefined =
    undefined;
  export let rowData: RowData[] = [];
  export let rowHeight: number | undefined = undefined;
  export let rowSelection: 'single' | 'multiple' | undefined = undefined;
  export let scrollToSelection: boolean = false;
  export let selectedRowIds: RowId[] = [];
  export let shouldAutoGenerateId: boolean = false;
  export let suppressCellFocus: boolean = true;
  export let suppressDragLeaveHidesColumns: boolean = true;
  export let suppressRowClickSelection: boolean = false;
  export let useCustomContextMenu: boolean | undefined = undefined;

  export let getRowId: (data: RowData) => RowId = (data: RowData): number => {
    return parseInt(data[idKey]);
  };
  export let isRowSelectable: ((node: IRowNode<RowData>) => boolean) | undefined = undefined;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  let contextMenu: ContextMenu;
  let gridOptions: GridOptions<RowData>;
  let gridApi: GridApi<RowData> | undefined;
  let gridDiv: HTMLDivElement;
  let onColumnStateChangeDebounced = debounce(onColumnStateChange, 500);
  let onWindowResizedDebounced = debounce(sizeColumnsToFit, 50);
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
  }
  $: gridApi?.sizeColumnsToFit();
  $: gridApi?.applyColumnState({ applyOrder: true, state: columnStates });

  $: if (!selectedRowIds.length) {
    currentSelectedRowId = null;
  } else if (selectedRowIds.length === 1) {
    currentSelectedRowId = selectedRowIds[0];
  }

  $: {
    gridApi?.redrawRows({
      rowNodes: [
        gridApi?.getRowNode(`${currentSelectedRowId}`),
        gridApi?.getRowNode(`${previousSelectedRowId}`),
      ].filter(filterEmpty),
    });
    previousSelectedRowId = currentSelectedRowId;
  }

  $: {
    // TODO verify
    gridApi?.setGridOption('quickFilterText', filterExpression);
  }

  onDestroy(() => {
    resizeObserver?.disconnect();
  });

  function getRowClass(params: RowClassParams<RowData>) {
    const rowClass: string[] = [];

    if (isRowSelectable) {
      if (isRowSelectable(params.node)) {
        rowClass.push('ag-selectable-row');
      }
    } else if (rowSelection !== undefined) {
      rowClass.push('ag-selectable-row');
    }

    if (params.data && currentSelectedRowId === getRowId(params.data)) {
      rowClass.push('ag-current-row-selected');
    }

    return rowClass.join(' ');
  }

  function onAutoSizeContent() {
    gridApi?.autoSizeAllColumns();
  }

  function onAutoSizeSpace() {
    gridApi?.sizeColumnsToFit();
  }

  function onColumnStateChange() {
    dispatch('columnStateChange', gridApi?.getColumnState());
  }

  function onCellContextMenu(event: CellContextMenuEvent<RowData>) {
    if (useCustomContextMenu) {
      const { data: clickedRow } = event;
      if (
        clickedRow &&
        selectedRowIds.length <= 1 &&
        (!isRowSelectable || isRowSelectable(event.node)) &&
        !suppressRowClickSelection
      ) {
        currentSelectedRowId = getRowId(clickedRow);
        selectedRowIds = [currentSelectedRowId];
      }

      contextMenu.show(event.event as MouseEvent);
    }
    dispatch('cellContextMenu', event);
  }

  onMount(() => {
    gridOptions = {
      // each entry here represents one column
      ...(columnShiftResize ? {} : { colResizeDefault: 'shift' }),
      animateRows: false,
      columnDefs,
      doesExternalFilterPass,
      excludeHiddenColumnsFromQuickFilter: false,
      getRowClass,
      ...(shouldAutoGenerateId ? {} : { getRowId: (params: { data: RowData }) => `${getRowId(params.data)}` }),
      isExternalFilterPresent,
      isRowSelectable,
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

        gridApi?.forEachNodeAfterFilter((rowNode: IRowNode<RowData>) => {
          if (rowNode.data && rowNode.isSelected()) {
            selectedRows.push(rowNode.data);
          }
        });

        dispatch('filterChanged', gridApi?.getFilterModel());

        // re-throw `selectionChanged` with only the visible rows after filtering
        dispatch('selectionChanged', selectedRows);
      },
      onGridSizeChanged(event: GridSizeChangedEvent<RowData>) {
        dispatch('gridSizeChanged', event);
      },
      onRowClicked({ data, node }: RowClickedEvent<RowData>) {
        const isSelected = node.isSelected();
        dispatch('rowClicked', {
          data,
          isSelected,
        } as DataGridRowSelection<RowData>);

        if (data && !suppressRowClickSelection && isSelected) {
          currentSelectedRowId = getRowId(data);

          dispatch('rowSelected', {
            data,
            isSelected,
          } as DataGridRowSelection<RowData>);
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
      preventDefaultOnContextMenu: useCustomContextMenu,
      rowData,
      rowHeight,
      rowSelection,
      suppressCellFocus,
      suppressDragLeaveHidesColumns,
      suppressRowClickSelection,
    };
    gridApi = createGrid(gridDiv, gridOptions);

    if (autoSizeColumnsToFit) {
      resizeObserver = new ResizeObserver(() => {
        onWindowResizedDebounced();
      });
      resizeObserver.observe(gridDiv);
    }
  });
</script>

<div bind:this={gridDiv} class="ag-theme-stellar table" class:highlightOnSelection tabindex="-1" on:focus on:blur />

<ContextMenu bind:this={contextMenu}>
  <slot name="context-menu" />
  <ColumnResizeContextMenu on:autoSizeContent={onAutoSizeContent} on:autoSizeSpace={onAutoSizeSpace} />
</ContextMenu>

<style>
  .table {
    height: 100%;
    width: 100%;
  }
  :global(.tags-cell) {
    display: inline-block;
    line-height: 24px;
    padding: 3px 0px;
  }

  :global(.tags-cell .tag.st-chip) {
    display: inline !important;
    margin-right: 2px;
  }
</style>
