<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { useActions, type ActionArray } from '../../utilities/useActions';
  import Input from '../form/Input.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';

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
</script>

<div class="parameter-base-number" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Input>
    <input
      bind:value={formParameter.value}
      class="st-input w-100"
      class:error={formParameter.errors !== null}
      {disabled}
      type="number"
      use:useActions={use}
      on:change={() => dispatch('change', formParameter)}
    />
    <ParameterBaseRightAdornments
      hidden={hideRightAdornments}
      slot="right"
      {formParameter}
      {parameterType}
      {use}
      on:reset={() => dispatch('reset', formParameter)}
    />
  </Input>
</div>

<style>
  .parameter-base-number {
    align-items: center;
    display: grid;
  }
</style>
