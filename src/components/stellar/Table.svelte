<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { get } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import type { ColumnDef, RowSelectionMode } from '../../types';

  const dispatch = createEventDispatcher();

  export let columnDefs: ColumnDef[] = [];
  export let rowData: any[] = [];
  export let rowSelectionMode: RowSelectionMode = 'none';
  export let selectedRowId: number | null = null;

  let currentRow: any;
</script>

<table class="st-table">
  <thead>
    <tr>
      {#if rowSelectionMode !== 'none'}
        <th class="selection-header" />
      {/if}

      {#each columnDefs as columnDef}
        {#if columnDef.field === 'actions'}
          <th class="actions-header" />
        {:else}
          <th>{columnDef.name}</th>
        {/if}
      {/each}
    </tr>
  </thead>

  <tbody>
    {#each rowData as row}
      <tr
        on:click|preventDefault={() => dispatch('rowClick', row)}
        on:mouseenter={() => (currentRow = row)}
        on:mouseleave={() => (currentRow = null)}
        on:pointerenter|preventDefault={() => dispatch('pointerEnter', row)}
      >
        {#if rowSelectionMode !== 'none'}
          <td class="selection-data">
            <input
              checked={selectedRowId === row?.id}
              type={rowSelectionMode === 'single' ? 'radio' : 'checkbox'}
            />
          </td>
        {/if}

        {#each columnDefs as columnDef}
          {#if columnDef.field === 'actions'}
            <td class="actions-data">
              <slot {currentRow} name="actions-data" />
            </td>
          {:else}
            <td>{get(row, columnDef.field)}</td>
          {/if}
        {/each}
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

  .actions-data,
  .actions-header,
  .selection-data,
  .selection-header {
    min-width: 40px;
    width: 40px;
  }

  .actions-data {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .actions-data :global(*) {
    font-size: 1rem;
    visibility: hidden;
  }

  tr:hover td.actions-data :global(*) {
    visibility: visible;
  }
</style>
