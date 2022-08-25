<svelte:options immutable={true} />

<script lang="ts">
  import {
    Grid,
    RowNode,
    type CellContextMenuEvent,
    type CellMouseOverEvent,
    type ColDef,
    type GridOptions,
    type RowClassParams,
    type RowClickedEvent,
    type RowDoubleClickedEvent,
    type RowSelectedEvent,
  } from 'ag-grid-community';
  import { createEventDispatcher, onMount } from 'svelte';

  // expose ag-grid function to select all visible rows
  export function selectAllVisible() {
    gridOptions?.api?.selectAllFiltered();
  }

  export let columnDefs: ColDef[];
  export let currentSelectedRowId: number | null = null;
  export let highlightOnSelection: boolean = true;
  export let idKey: keyof TRowData = 'id';
  export let preventDefaultOnContextMenu: boolean | undefined = undefined;
  export let rowData: TRowData[] = [];
  export let rowSelection: 'single' | 'multiple' | undefined = undefined;
  export let selectedRowIds: number[] = [];
  export let suppressCellFocus: boolean = true;
  export let suppressRowClickSelection: boolean = false;

  const dispatch = createEventDispatcher();

  let gridOptions: GridOptions<TRowData>;
  let gridDiv: HTMLDivElement;
  let previousSelectedRowId: number | null = null;

  $: gridOptions?.api?.setRowData(rowData);
  $: gridOptions?.api?.sizeColumnsToFit();

  $: {
    const previousSelectedRowIds: number[] = [];
    // get all currently selected nodes. we cannot use `getSelectedNodes` because that does not include filtered rows
    gridOptions?.api?.forEachNode((rowNode: RowNode<TRowData>) => {
      if (rowNode.isSelected()) {
        previousSelectedRowIds.push(getRowId(rowNode.data));
      }
    });
    const previousSelectedRowIdsSet: Set<number> = new Set(previousSelectedRowIds);
    const selectedRowIdsSet: Set<number> = new Set(selectedRowIds);

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
    if (currentSelectedRowId === getRowId(params.data)) {
      return 'ag-first-row-selected';
    }

    return '';
  }

  function getRowId(data: TRowData): number {
    return parseInt(data[idKey]);
  }

  onMount(() => {
    gridOptions = {
      // each entry here represents one column
      columnDefs,
      getRowClass,
      getRowId: (params: { data: TRowData }) => `${getRowId(params.data)}`,
      onCellContextMenu(event: CellContextMenuEvent<TRowData>) {
        dispatch('cellContextMenu', event);
      },
      onCellMouseOver(event: CellMouseOverEvent<TRowData>) {
        dispatch('cellMouseOver', event);
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
      onRowClicked(event: RowClickedEvent<TRowData>) {
        dispatch('rowClicked', {
          data: event.data,
          isSelected: event.node.isSelected(),
        } as DataGridRowSelection<TRowData>);

        if (event.node.isSelected()) {
          currentSelectedRowId = getRowId(event.data);
        }
      },
      onRowDoubleClicked(event: RowDoubleClickedEvent<TRowData>) {
        dispatch('rowDoubleClicked', event.data);
      },
      onRowSelected(event: RowSelectedEvent<TRowData>) {
        const selectedNodes = gridOptions?.api?.getSelectedNodes();

        // only dispatch `rowSelected` for single row selections
        if (selectedNodes.length <= 1) {
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
          currentSelectedRowId = selectedRowIds[0];
        }

        dispatch('selectionChanged', selectedRows);
      },
      preventDefaultOnContextMenu,
      rowData,
      rowSelection,
      suppressCellFocus,
      suppressRowClickSelection,
    };
    new Grid(gridDiv, gridOptions);
  });
</script>

<div
  bind:this={gridDiv}
  class="ag-theme-stellar table"
  class:ag-selectable-rows={rowSelection !== undefined}
  class:highlightOnSelection
/>

<style>
  .table {
    height: 100%;
    width: 100%;
  }
</style>
