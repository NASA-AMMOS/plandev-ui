<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import type { ValueSchemaVariant } from '../../types/schema';
  import { useActions, type ActionArray } from '../../utilities/useActions';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';
  import ParameterUnits from './ParameterUnits.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

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
      use:useActions={use}
      on:change={() => dispatch('change', formParameter)}
    >
      {#each variants as variant}
        <option value={variant.key}>
          {variant.label}
        </option>
      {/each}
    </select>
    <div class="parameter-right">
      <ParameterUnits unit={formParameter.schema?.metadata?.unit?.value} />
      <ParameterBaseRightAdornments
        {disabled}
        hidden={hideRightAdornments}
        {formParameter}
        {parameterType}
        {use}
        on:reset={() => dispatch('reset', formParameter)}
      />
    </div>
  </div>
</div>

<style>
  .parameter-base-variant {
    align-items: center;
    display: grid;
  }

  .parameter-base-variant-content {
    align-items: center;
    display: grid;
    grid-template-columns: auto min-content;
    margin-right: 6px;
  }

  .parameter-right {
    margin-left: 5px;
    width: 100%;
  }
</style>
