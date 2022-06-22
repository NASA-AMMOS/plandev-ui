<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { convertDurationStringToUs, convertUsToDurationString } from '../../utilities/time';
  import Input from '../form/Input.svelte';
  import ParameterBaseError from './ParameterBaseError.svelte';
  import ParameterName from './ParameterName.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  let durationString: string = formParameter.value;
  let durationStringFormatError: string | null = null;

  const dispatch = createEventDispatcher();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  $: durationString = convertUsToDurationString(formParameter.value);
</script>

<div class="parameter-base-duration" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Input>
    <input
      bind:value={durationString}
      class="st-input w-100"
      class:error={formParameter.error !== null || durationStringFormatError !== null}
      {disabled}
      type="text"
      on:change={() => {
        try {
          dispatch('change', { ...formParameter, value: convertDurationStringToUs(durationString) });
          durationStringFormatError = null;
        } catch (error) {
          durationStringFormatError = error.message;
        }
      }}
    />
  </Input>
</div>

<ParameterBaseError
  {columns}
  formParameter={{
    ...formParameter,
    error: durationStringFormatError || formParameter.error,
  }}
/>

<style>
  .parameter-base-duration {
    align-items: center;
    display: grid;
  }
</style>
