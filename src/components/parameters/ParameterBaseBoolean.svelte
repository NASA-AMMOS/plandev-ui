<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter } from '../../types/parameter';
  import Input from '../form/Input.svelte';
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
</script>

<div class="parameter-base-boolean" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <Input>
    <input
      bind:checked={formParameter.value}
      {disabled}
      type="checkbox"
      on:change={() => dispatch('change', formParameter)}
    />
    <ParameterBaseRightAdornments hidden={hideRightAdornments} slot="right" {formParameter} />
  </Input>
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
</style>
