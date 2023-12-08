<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { useActions, type ActionArray } from '../../utilities/useActions';
  import Input from '../form/Input.svelte';
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
</script>

<div class="parameter-base-boolean" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Input>
    <input
      bind:checked={formParameter.value}
      {disabled}
      type="checkbox"
      on:change={() => dispatch('change', formParameter)}
      use:useActions={use}
    />
    <div class="parameter-right" slot="right">
      <ParameterUnits unit={formParameter.schema?.metadata?.unit?.value} />
      <ParameterBaseRightAdornments
        {disabled}
        hidden={hideRightAdornments}
        {formParameter}
        {parameterType}
        on:reset={() => dispatch('reset', formParameter)}
        {use}
      />
    </div>
  </Input>
  <div />
</div>

<style>
  input {
    margin: 0;
    width: max-content;
  }

  .parameter-base-boolean {
    align-items: center;
    display: grid;
    padding: 4px 0px;
  }

  .parameter-right {
    width: 100%;
  }
</style>
