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

<table class="table">
  <thead>
    <tr>
      {#each columns as column}
        <th>{column}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sortedData as item}
      <tr>
        {#each columns as column}
          {#if column === 'select'}
            <input
              checked={selectedId === item?.id}
              name="select"
              type="radio"
              on:click={() => onSelect(item)}
            />
          {:else}
            <td>{item[column]}</td>
          {/if}
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
