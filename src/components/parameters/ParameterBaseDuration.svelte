<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter } from '../../types';
  import InputText from '../form/InputText.svelte';
  import Spinner from '../ui/Spinner.svelte';
  import ParameterBaseError from './ParameterBaseError.svelte';
  import ParameterName from './ParameterName.svelte';

  const dispatch = createEventDispatcher();

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;
</script>

<div class="parameter-base-duration" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <InputText
    bind:value={formParameter.value}
    {disabled}
    invalid={formParameter.error !== null}
    type="number"
    on:change={() => dispatch('change', formParameter)}
  >
    <span slot="suffix">
      <Spinner visible={formParameter.loading} />
    </span>
  </InputText>
</div>

<ParameterBaseError {columns} {formParameter} />

<style>
  .parameter-base-duration {
    align-items: center;
    display: grid;
  }
</style>
