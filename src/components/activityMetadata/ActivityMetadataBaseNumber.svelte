<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Input from '../form/Input.svelte';
  import ActivityMetadataName from './ActivityMetadataName.svelte';

  export let key: string = '';
  export let value: any; // TODO figure out how to type this so that we can pass in a bool
  export let disabled: boolean = false;
  export let labelColumnWidth: number = 200;

  const dispatch = createEventDispatcher<{
    change: { key: string; value: number | null };
  }>();

  $: columns = `${labelColumnWidth}px auto`;

  // Check that the incoming value is a number to handle cases of changed metadata schema.
  $: numberValue = typeof value === 'number' ? value : null;
</script>

<div class="activity-metadata-base-number" style="grid-template-columns: {columns}">
  <ActivityMetadataName {key} />
  <Input>
    <input
      bind:value={numberValue}
      class="st-input w-100"
      {disabled}
      type="number"
      on:change={() => dispatch('change', { key, value: numberValue })}
    />
  </Input>
</div>

<style>
  input {
    margin: 0;
  }

  .activity-metadata-base-number {
    align-items: center;
    display: grid;
    padding: 4px 0px;
  }
</style>
