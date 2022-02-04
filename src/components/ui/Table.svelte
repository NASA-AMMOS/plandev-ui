<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { compare } from '../../utilities/generic';

  const dispatch = createEventDispatcher();

  export let columns: string[] = [];
  export let data: any[] = [];
  export let sortKey: string = 'type';
  export let selectedId: number | null = null;

  $: sortedData = [...data].sort((a, b) => compare(a[sortKey], b[sortKey]));

  function onSelect(item: any) {
    const id = item?.id || '';
    if (selectedId !== id) {
      dispatch('select', { id });
    }
  }
</script>

<table class="st-table">
  <thead>
    <tr>
      {#each columns as column}
        <th>{column}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sortedData as item}
      <tr on:click={() => onSelect(item)}>
        {#each columns as column}
          {#if column === 'select'}
            <td>
              <input
                checked={selectedId === item?.id}
                name="select"
                style="cursor: pointer"
                type="radio"
              />
            </td>
          {:else}
            <td>{item[column]}</td>
          {/if}
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
