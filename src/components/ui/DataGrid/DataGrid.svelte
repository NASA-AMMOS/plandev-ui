<svelte:options immutable={true} />

<script lang="ts">
  import {
    Grid,
    RowNode,
    type CellContextMenuEvent,
    type CellMouseOverEvent,
    type ColDef,
    type GridOptions,
    type RowClickedEvent,
    type RowSelectedEvent,
  } from 'ag-grid-community';
  import { createEventDispatcher, onMount } from 'svelte';

  // expose ag-grid function to select all visible rows
  export function selectAllVisible() {
    gridOptions?.api?.selectAllFiltered();
  }

  export let columnDefs: ColDef[];
  export let highlightOnSelection: boolean = true;
  export let preventDefaultOnContextMenu: boolean | undefined = undefined;
  export let rowData: TRowData[] = [];
  export let rowSelection: 'single' | 'multiple' | undefined = undefined;
  export let selectedRowIds: number[] = [];
  export let suppressCellFocus: boolean = true;
  export let suppressRowClickSelection: boolean = false;

  const dispatch = createEventDispatcher();

  let gridOptions: GridOptions<TRowData>;
  let gridDiv: HTMLDivElement;

  $: gridOptions?.api?.setRowData(rowData);
  $: gridOptions?.api?.sizeColumnsToFit();

  $: {
    const currentSelectedRowIds: number[] = [];
    // get all currently selected nodes. we cannot use `getSelectedNodes` because that does not include filtered rows
    gridOptions?.api?.forEachNode((rowNode: RowNode<TRowData>) => {
      if (rowNode.isSelected()) {
        currentSelectedRowIds.push(parseInt(getRowId(rowNode)));
      }
    });
    const currentSelectedRowIdsSet: Set<number> = new Set(currentSelectedRowIds);
    const selectedRowIdsSet: Set<number> = new Set(selectedRowIds);

    /**
     *  remove the rows that are present in both because those are the rows that haven't changed
     *  deleting the shared ids from the `currentSelectedRowIdsSet` will yield ids that need to be deselected
     *  deleting the shared ids from the `selectedRowIdsSet` will yield the new ids that need to be selected
     */
    for (let i = currentSelectedRowIds.length; i >= 0; --i) {
      const currentId = currentSelectedRowIds[i];
      if (selectedRowIdsSet.has(currentId)) {
        currentSelectedRowIdsSet.delete(currentId);
        selectedRowIdsSet.delete(currentId);
      }
    }

    currentSelectedRowIdsSet.forEach(deselectedRowId => {
      const selectedRow = gridOptions?.api?.getRowNode(`${deselectedRowId}`);
      selectedRow?.setSelected(false);
    });
    selectedRowIds.forEach(selectedRowId => {
      const selectedRow = gridOptions?.api?.getRowNode(`${selectedRowId}`);
      selectedRow?.setSelected(true);
    });
  }

  function getRowId(params: { data: TRowData }) {
    return `${params.data.id}`;
  }

  onMount(() => {
    gridOptions = {
      // each entry here represents one column
      columnDefs,
      getRowId,
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
        dispatch('rowClicked', event);
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
