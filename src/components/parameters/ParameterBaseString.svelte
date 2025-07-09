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
  export let type: 'text' | 'password' = 'text';

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  function handleChange(): void {
    dispatch('change', formParameter);
  }
</script>

<div class="parameter-base-string" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Input>
    <!-- Type can only be text or password so it's safe to overwrite the type and don't coerce the value. -->
    <input
      bind:value={formParameter.value}
      class="st-input w-full"
      class:error={formParameter.errors !== null}
      aria-label={formParameter.name}
      {disabled}
      {...{ type }}
      use:useActions={use}
      on:change={handleChange}
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
  .parameter-base-string {
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
