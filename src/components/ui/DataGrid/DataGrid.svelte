<svelte:options immutable={true} />

<script lang="ts">
  import {
    Grid,
    RowNode,
    type CellContextMenuEvent,
    type CellMouseOverEvent,
    type ColDef,
    type Column,
    type ColumnMovedEvent,
    type ColumnPinnedEvent,
    type ColumnResizedEvent,
    type ColumnState,
    type ColumnVisibleEvent,
    type GridOptions,
    type RedrawRowsParams,
    type RowClassParams,
    type RowClickedEvent,
    type RowDoubleClickedEvent,
    type RowSelectedEvent,
    type SortChangedEvent,
  } from 'ag-grid-community';
  import type { ISizeColumnsToFitParams } from 'ag-grid-community/dist/lib/gridApi';
  import { debounce } from 'lodash-es';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { DataGridRowSelection, RowId, TRowData } from '../../../types/data-grid';

  export function autoSizeColumns(keys: (string | Column)[], skipHeader?: boolean) {
    gridOptions?.columnApi?.autoSizeColumns(keys, skipHeader);
  }
  export function autoSizeAllColumns(skipHeader?: boolean) {
    gridOptions?.columnApi?.autoSizeAllColumns(skipHeader);
  }
  // expose ag-grid function to select all visible rows
  export function selectAllVisible() {
    gridOptions?.api?.selectAllFiltered();
  }
  export function redrawRows(params?: RedrawRowsParams<TRowData>) {
    gridOptions?.api?.redrawRows(params);
  }
  export function sizeColumnsToFit(params?: ISizeColumnsToFitParams) {
    gridOptions?.api?.sizeColumnsToFit(params);
  }

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let columnShiftResize: boolean = false;
  export let currentSelectedRowId: RowId | null = null;
  export let highlightOnSelection: boolean = true;
  export let idKey: keyof TRowData = 'id';
  export let preventDefaultOnContextMenu: boolean | undefined = undefined;
  export let rowData: TRowData[] = [];
  export let rowSelection: 'single' | 'multiple' | undefined = undefined;
  export let selectedRowIds: RowId[] = [];
  export let shouldAutoGenerateId: boolean = false;
  export let suppressCellFocus: boolean = true;
  export let suppressDragLeaveHidesColumns: boolean = true;
  export let suppressRowClickSelection: boolean = false;

  export let getRowId: (data: TRowData) => RowId = (data: TRowData): number => {
    return parseInt(data[idKey]);
  };
  export let isRowSelectable: (node: RowNode<TRowData>) => boolean = undefined;

  const dispatch = createEventDispatcher();

  let gridOptions: GridOptions<TRowData>;
  let gridDiv: HTMLDivElement;
  let onColumnStateChangeDebounced = debounce(onColumnStateChange, 500);
  let previousSelectedRowId: RowId | null = null;

  $: gridOptions?.api?.setRowData(rowData);
  $: gridOptions?.api?.sizeColumnsToFit();
  $: gridOptions?.columnApi?.applyColumnState({ applyOrder: true, state: columnStates });

  $: {
    const previousSelectedRowIds: RowId[] = [];
    // get all currently selected nodes. we cannot use `getSelectedNodes` because that does not include filtered rows
    gridOptions?.api?.forEachNode((rowNode: RowNode<TRowData>) => {
      if (rowNode.isSelected()) {
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
      const selectedRow = gridOptions?.api?.getRowNode(`${deselectedRowId}`);
      selectedRow?.setSelected(false);
    });

    selectedRowIds.forEach(selectedRowId => {
      const selectedRow = gridOptions?.api?.getRowNode(`${selectedRowId}`);
      selectedRow?.setSelected(true);
    });
  }

  $: if (!selectedRowIds.length) {
    currentSelectedRowId = null;
  } else if (selectedRowIds.length === 1) {
    currentSelectedRowId = selectedRowIds[0];
  }

  $: {
    gridOptions?.api?.redrawRows({
      rowNodes: [
        gridOptions?.api?.getRowNode(`${currentSelectedRowId}`),
        gridOptions?.api?.getRowNode(`${previousSelectedRowId}`),
      ],
    });
    previousSelectedRowId = currentSelectedRowId;
  }

  function getRowClass(params: RowClassParams<TRowData>) {
    const rowClass: string[] = [];

    if (isRowSelectable) {
      if (isRowSelectable(params.node)) {
        rowClass.push('ag-selectable-row');
      }
    } else if (rowSelection !== undefined) {
      rowClass.push('ag-selectable-row');
    }

    if (currentSelectedRowId === getRowId(params.data)) {
      rowClass.push('ag-current-row-selected');
    }

    return rowClass.join(' ');
  }

  function onColumnStateChange() {
    dispatch('columnStateChange', gridOptions?.columnApi?.getColumnState());
  }

  onMount(() => {
    gridOptions = {
      // each entry here represents one column
      ...(columnShiftResize ? {} : { colResizeDefault: 'shift' }),
      columnDefs,
      getRowClass,
      ...(shouldAutoGenerateId ? {} : { getRowId: (params: { data: TRowData }) => `${getRowId(params.data)}` }),
      isRowSelectable,
      onCellContextMenu(event: CellContextMenuEvent<TRowData>) {
        dispatch('cellContextMenu', event);
      },
      onCellMouseOver(event: CellMouseOverEvent<TRowData>) {
        dispatch('cellMouseOver', event);
      },
      onColumnMoved(event: ColumnMovedEvent<TRowData>) {
        dispatch('columnMoved', event);
        onColumnStateChangeDebounced();
      },
      onColumnPinned(event: ColumnPinnedEvent<TRowData>) {
        dispatch('columnPinned', event);
        onColumnStateChangeDebounced();
      },
      onColumnResized(event: ColumnResizedEvent<TRowData>) {
        dispatch('columnResized', event);
        onColumnStateChangeDebounced();
      },
      onColumnVisible(event: ColumnVisibleEvent<TRowData>) {
        dispatch('columnVisible', event);
        onColumnStateChangeDebounced();
      },
      onFilterChanged() {
        const selectedRows: TRowData[] = [];

        gridOptions?.api?.forEachNodeAfterFilter((rowNode: RowNode<TRowData>) => {
          if (rowNode.isSelected()) {
            selectedRows.push(rowNode.data);
          }
        });

        dispatch('filterChanged', gridOptions?.api?.getFilterModel());

        // re-throw `selectionChanged` with only the visible rows after filtering
        dispatch('selectionChanged', selectedRows);
      },
      onRowClicked({ data, node }: RowClickedEvent<TRowData>) {
        const isSelected = node.isSelected();
        dispatch('rowClicked', {
          data: data,
          isSelected,
        } as DataGridRowSelection<TRowData>);

        if (!suppressRowClickSelection && isSelected) {
          currentSelectedRowId = getRowId(data);

          dispatch('rowSelected', {
            data: data,
            isSelected,
          } as DataGridRowSelection<TRowData>);
        }
      },
      onRowDoubleClicked(event: RowDoubleClickedEvent<TRowData>) {
        dispatch('rowDoubleClicked', event.data);
      },
      onRowSelected(event: RowSelectedEvent<TRowData>) {
        const selectedNodes = gridOptions?.api?.getSelectedNodes();

        // only dispatch `rowSelected` for single row selections
        if (selectedNodes.length <= 1 || suppressRowClickSelection) {
          dispatch('rowSelected', {
            data: event.data,
            isSelected: event.node.isSelected(),
          } as DataGridRowSelection<TRowData>);
        }
      },
      onSelectionChanged() {
        const selectedRows = gridOptions?.api?.getSelectedRows();
        selectedRowIds = selectedRows.map((selectedRow: TRowData) => getRowId(selectedRow));

        if (selectedRows.length === 1) {
          currentSelectedRowId = getRowId(selectedRows[0]);
        } else if (!selectedRowIds.includes(currentSelectedRowId)) {
          // select the first displayed selected row in the table if the current selected row is deselected
          let wasCurrentSelectedRowUpdated: boolean = false;
          currentSelectedRowId = null;
          gridOptions?.api?.forEachNodeAfterFilterAndSort((rowNode: RowNode<TRowData>) => {
            if (!wasCurrentSelectedRowUpdated && rowNode.isSelected()) {
              currentSelectedRowId = getRowId(rowNode.data);
              wasCurrentSelectedRowUpdated = true;

              dispatch('rowSelected', {
                data: rowNode.data,
                isSelected: rowNode.isSelected(),
              } as DataGridRowSelection<TRowData>);
            }
          });
        }

        dispatch('selectionChanged', selectedRows);
      },
      onSortChanged(event: SortChangedEvent<TRowData>) {
        dispatch('sortChanged', event);
        onColumnStateChangeDebounced();
      },
      preventDefaultOnContextMenu,
      rowData,
      rowSelection,
      suppressCellFocus,
      suppressDragLeaveHidesColumns,
      suppressRowClickSelection,
    };
    new Grid(gridDiv, gridOptions);
  });
</script>

<div bind:this={gridDiv} class="ag-theme-stellar table" class:highlightOnSelection />

<style>
  .table {
    height: 100%;
    width: 100%;
  }
</style>
