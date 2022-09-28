<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ActivityMetadataName from './ActivityMetadataName.svelte';

  export let key: string = '';
  export let value: any; // TODO figure out how to type this so that we can pass in a bool
  export let disabled: boolean = false;
  export let enumerates: (number | string)[];
  export let labelColumnWidth: number = 200;

  $: columns = `${labelColumnWidth}px auto`;
  $: values = (Array.isArray(value) ? value : []) as ActivityMetadataValueEnumMultiselect;

  // Check that the incoming values are a numbers or strings to handle cases of changed metadata schema.
  $: enumValues = allItemsStringsOrNumbers(values) ? values : [];

  function allItemsStringsOrNumbers(l: any[]) {
    return !l.find(x => !(typeof x === 'number' || typeof x === 'string'));
  }

  const dispatch = createEventDispatcher();
</script>

<div class="activity-metadata-base-enum-multiselect" style="grid-template-columns: {columns}">
  <ActivityMetadataName {key} />
  <select
    bind:value={enumValues}
    multiple
    class="st-select w-100"
    {disabled}
    on:change={() => {
      // Filter out the empty value
      let newValue = enumValues.filter(v => v !== null);
      // If only the empty value was selected
      // the new value should be set to null
      if (newValue.length < 1) {
        newValue = null;
      }
      dispatch('change', { key, value: newValue });
    }}
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
  .activity-metadata-base-enum-multiselect {
    align-items: flex-start;
    display: grid;
    padding: 4px 0px;
  }

  select {
    height: auto;
  }
</style>
