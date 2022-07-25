<svelte:options immutable={true} />

<script lang="ts">
  import { Grid, type ColDef, type GridOptions, type RowClickedEvent, type RowSelectedEvent } from 'ag-grid-community';
  import { createEventDispatcher, onMount } from 'svelte';

  export let columnDefs: ColDef[];
  export let rowData: TRowData[] = [];
  export let rowSelection: 'single' | 'multiple' | undefined = undefined;
  export let selectedRowIds: number[] = [];
  export let suppressCellFocus: boolean = true;
  export let suppressRowClickSelection: boolean = false;

  const dispatch = createEventDispatcher();

  let gridOptions: GridOptions;
  let gridDiv: HTMLDivElement;

  $: gridOptions?.api?.setRowData(rowData);
  $: gridOptions?.api?.sizeColumnsToFit();

  $: {
    const currentSelectedRowIds: number[] =
      gridOptions?.api?.getSelectedNodes().map(node => parseInt(getRowId(node))) || [];

    const currentSelectedRowIdsSet: Set<number> = new Set(currentSelectedRowIds);
    const selectedRowIdsSet: Set<number> = new Set(selectedRowIds);

    /**
     *  remove the rows that are present in both because those are the rows that haven't changed
     *  deleting the shared ids from the `currentSelectedRowIdsSet` will yield ids that need to be deselected
     *  deleting the shared ids from the `selectedRowIdsSet` will yield the new ids that need to be selected
     */
    for (let i = currentSelectedRowIds.length; i >= 0; --i) {
      const currentId = currentSelectedRowIdsSet[i];
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
      onRowClicked(event: RowClickedEvent<TRowData>) {
        dispatch('rowClicked', event);
      },
      onRowSelected(event: RowSelectedEvent<TRowData>) {
        if (event.node.isSelected()) {
          dispatch('rowSelected', event);
        }
      },
      rowData,
      rowSelection,
      suppressCellFocus,
      suppressRowClickSelection,
    };
    new Grid(gridDiv, gridOptions);
  });
</script>

<div bind:this={gridDiv} class={`ag-theme-stellar ${rowSelection !== undefined ? 'ag-selectable-rows ' : ''}table`} />

<style>
  .table {
    width: 100%;
    height: 100%;
  }
</style>
