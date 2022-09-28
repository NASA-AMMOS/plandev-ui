<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { attemptStringConversion } from '../../utilities/generic';
  import Input from '../form/Input.svelte';
  import ActivityMetadataName from './ActivityMetadataName.svelte';

  export let key: string = '';
  export let value: any; // TODO figure out how to type this so that we can pass in a bool
  export let disabled: boolean = false;
  export let labelColumnWidth: number = 200;

  const dispatch = createEventDispatcher();

  $: columns = `${labelColumnWidth}px auto`;

  // Check that the incoming value is a string to handle cases of changed metadata schema, otherwise attempt to convert it to a string.
  $: stringValue = typeof value === 'string' ? value : attemptStringConversion(value);
</script>

<div class="activity-metadata-base-string" style="grid-template-columns: {columns}">
  <ActivityMetadataName {key} />
  <Input>
    <input
      class="st-input w-100"
      bind:value={stringValue}
      {disabled}
      on:change={() => dispatch('change', { key, value: stringValue })}
    />
  </Input>
</div>

<style>
  input {
    margin: 0;
  }

  .activity-metadata-base-string {
    align-items: center;
    display: grid;
    padding: 4px 0px;
  }
</style>
