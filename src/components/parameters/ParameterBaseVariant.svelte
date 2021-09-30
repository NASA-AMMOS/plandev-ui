<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter } from '../../types';
  import ParameterBaseError from './ParameterBaseError.svelte';
  import ParameterName from './ParameterName.svelte';
  import Select from '../form/Select.svelte';

  const dispatch = createEventDispatcher();

  type Variant = { key: string; label: string };

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;
  $: variants = formParameter.schema.variants as Variant[];
</script>

<div class="parameter-base-variant" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Select
    bind:value={formParameter.value}
    {disabled}
    invalid={formParameter.error !== null}
    on:change={() => dispatch('change', formParameter)}
  >
    {#each variants as variant}
      <option value={variant.key}>
        {variant.label}
      </option>
    {/each}
  </Select>
</div>

<ParameterBaseError {columns} {formParameter} />

<style>
  .parameter-base-variant {
    align-items: center;
    display: grid;
  }
</style>
