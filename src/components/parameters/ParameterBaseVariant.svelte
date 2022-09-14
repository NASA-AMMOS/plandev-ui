<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  const dispatch = createEventDispatcher();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;
  $: variants = (formParameter.schema as ValueSchemaVariant).variants;
</script>

<div class="parameter-base-variant" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <div class="parameter-base-variant-content">
    <select
      bind:value={formParameter.value}
      class="st-select w-100"
      class:error={formParameter.errors !== null}
      {disabled}
      on:change={() => dispatch('change', formParameter)}
    >
      {#each variants as variant}
        <option value={variant.key}>
          {variant.label}
        </option>
      {/each}
    </select>
    <ParameterBaseRightAdornments hidden={hideRightAdornments} slot="right" {formParameter} />
  </div>
</div>

<style>
  .parameter-base-variant {
    align-items: center;
    display: grid;
  }

  .parameter-base-variant-content {
    align-items: center;
    display: flex;
  }
</style>
