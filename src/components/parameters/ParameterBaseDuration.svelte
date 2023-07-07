<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { convertDurationStringToUs, convertUsToDurationString } from '../../utilities/time';
  import { useActions, type ActionArray } from '../../utilities/useActions';
  import Input from '../form/Input.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideValueSource: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

  let durationStringFormatError: string | null = null;

  const dispatch = createEventDispatcher();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  $: durationString = convertUsToDurationString(formParameter.value, true);

  function onChange() {
    try {
      dispatch('change', { ...formParameter, value: convertDurationStringToUs(durationString) });
      durationStringFormatError = null;
    } catch (error) {
      durationStringFormatError = (error as Error).message;
    }
  }
</script>

<div class="parameter-base-duration" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Input>
    <input
      bind:value={durationString}
      class="st-input w-100"
      class:error={formParameter.errors !== null || durationStringFormatError !== null}
      {disabled}
      type="text"
      use:useActions={use}
      on:change={onChange}
    />

    <ParameterBaseRightAdornments
      slot="right"
      {formParameter}
      additionalErrors={durationStringFormatError ? [durationStringFormatError] : []}
      {hideValueSource}
      {parameterType}
      {use}
      on:reset={() => dispatch('reset', formParameter)}
    />
  </Input>
</div>

<style>
  .parameter-base-duration {
    align-items: center;
    display: grid;
  }
</style>
