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
    change: { key: string; value: boolean | null };
  }>();

  $: columns = `${labelColumnWidth}px auto`;

  // Check that the incoming value is a boolean to handle cases of changed metadata schema.
  $: boolValue = typeof value === 'boolean' ? value : null;
</script>

<div class="activity-metadata-base-boolean" style="grid-template-columns: {columns}">
  <ActivityMetadataName {key} />
  <Input>
    <input
      bind:checked={boolValue}
      {disabled}
      type="checkbox"
      on:change={() => dispatch('change', { key, value: boolValue })}
    />
  </Input>
</div>

<style>
  input {
    margin: 0;
  }

  .activity-metadata-base-boolean {
    align-items: center;
    display: grid;
    padding: 4px 0px;
  }
</style>
