<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ActivityMetadataName from './ActivityMetadataName.svelte';

  export let key: string = '';
  export let value: any; // TODO figure out how to type this so that we can pass in a bool
  export let disabled: boolean = false;
  export let enumerates: (number | string)[];
  export let labelColumnWidth: number = 200;

  $: value = value as ActivityMetadataValueEnum;
  $: columns = `${labelColumnWidth}px auto`;

  // Check that the incoming value is a number or a string to handle cases of changed metadata schema.
  $: enumValue = typeof value === 'number' || typeof value === 'string' ? value : null;

  const dispatch = createEventDispatcher();
</script>

<div class="activity-metadata-base-enum" style="grid-template-columns: {columns}">
  <ActivityMetadataName {key} />
  <select
    bind:value={enumValue}
    class="st-select w-100"
    {disabled}
    on:change={() => dispatch('change', { key, value: enumValue })}
  >
    {#if !enumerates.length}
      <option value={null}>No values</option>
    {:else}
      <option value={null} />
      {#each enumerates as value}
        <option {value}>
          {value}
        </option>
      {/each}
    {/if}
  </select>
</div>

<style>
  .activity-metadata-base-enum {
    align-items: center;
    display: grid;
  }
</style>
