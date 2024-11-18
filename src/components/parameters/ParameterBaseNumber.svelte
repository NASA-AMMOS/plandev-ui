<svelte:options immutable={true} />

<script lang="ts">
  import { debounce } from 'lodash-es';
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

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

  let debouncedOnChange = debounce(onChange, 350, {
    leading: true,
    trailing: true,
  });

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  function onChange() {
    dispatch('change', formParameter);
  }
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
      on:change={debouncedOnChange}
    />
    <div class="parameter-right" slot="right">
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
  </Input>
</div>

<style>
  .parameter-base-number {
    align-items: center;
    display: grid;
  }

  .parameter-right {
    display: flex;
    gap: 2px;
    min-width: min-content;
    width: 100%;
  }
</style>
