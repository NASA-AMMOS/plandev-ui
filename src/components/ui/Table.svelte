<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { get } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import { compare } from '../../utilities/generic';

  export let columnDefs: ColumnDef[] = [];
  export let rowActions: boolean = false;
  export let rowData: any[] = [];
  export let rowSelectionMode: RowSelectionMode = 'none';
  export let selectedRowId: number | null = null;

  const dispatch = createEventDispatcher();

  let currentRow: any;
  let currentSort: RowSort | null = null;
  let sortedRowData: any = rowData;

  $: sortedRowData =
    currentSort !== null
      ? [...rowData].sort((a, b) =>
          compare(
            a[currentSort.field],
            b[currentSort.field],
            currentSort.direction === 'asc',
          ),
        )
      : rowData;

  function sort(columnDef: ColumnDef) {
    if (columnDef.sortable) {
      if (currentSort === null || currentSort.field !== columnDef.field) {
        currentSort = { direction: 'asc', field: columnDef.field };
      } else if (currentSort.direction === 'asc') {
        currentSort = { direction: 'desc', field: columnDef.field };
      } else {
        currentSort = null;
      }
    }
  }
</script>

<table class="st-table">
  <thead>
    <tr>
      {#if rowSelectionMode !== 'none'}
        <th class="selection-header" />
      {/if}

      {#each columnDefs as columnDef}
        {#if columnDef.sortable}
          <th class="sortable-header" on:click={() => sort(columnDef)}>
            {columnDef.name}

            {#if currentSort?.field === columnDef.field}
              {#if currentSort.direction === 'asc'}
                <i class="bi bi-arrow-up-short" />
              {:else if currentSort.direction === 'desc'}
                <i class="bi bi-arrow-down-short" />
              {/if}
            {/if}
          </th>
        {:else}
          <th>{columnDef.name}</th>
        {/if}
      {/each}

      {#if rowActions}
        <th class="actions-header" />
      {/if}
    </tr>
  </thead>

  <tbody>
    {#each sortedRowData as row}
      <tr
        on:click|stopPropagation={() => dispatch('rowClick', row)}
        on:mouseenter={() => (currentRow = row)}
        on:mouseleave={() => (currentRow = null)}
        on:pointerenter|preventDefault={() => dispatch('pointerEnter', row)}
      >
        {#if rowSelectionMode !== 'none'}
          <td class="selection-cell">
            <input
              checked={selectedRowId === row?.id}
              type={rowSelectionMode === 'single' ? 'radio' : 'checkbox'}
            />
          </td>
        {/if}

        {#each columnDefs as columnDef}
          <td>{get(row, columnDef.field)}</td>
        {/each}

        {#if rowActions}
          <td class="actions-cell">
            <slot {currentRow} name="actions-cell" />
          </td>
        {/if}
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    border-left: 1px solid var(--st-gray-20);
    border-right: 1px solid var(--st-gray-20);
    border-top: 1px solid var(--st-gray-20);
  }

  input {
    cursor: pointer;
  }

  th,
  td {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tr {
    height: 2rem;
  }

  tr:hover {
    background-color: var(--st-gray-10);
    cursor: pointer;
  }

  .actions-cell,
  .actions-header,
  .selection-cell,
  .selection-header {
    min-width: 40px;
    width: 40px;
  }

  .actions-cell {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .actions-cell :global(*) {
    font-size: 1rem;
    visibility: hidden;
  }

  tr:hover td.actions-cell :global(*) {
    visibility: visible;
  }

  .sortable-header {
    align-items: center;
    display: flex;
  }

  .sortable-header > i {
    font-size: 1.3rem;
  }
</style>
