<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter } from '../../types';
  import InputText from '../form/InputText.svelte';
  import ParameterBaseError from './ParameterBaseError.svelte';
  import ParameterName from './ParameterName.svelte';

  const dispatch = createEventDispatcher();

  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  function onChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files.length) {
      const file = input.files.item(0);
      formParameter.file = file;
      formParameter.value = file.name;
      dispatch('change', formParameter);
    }
  }
</script>

<div class="parameter-base-path" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <div class="file-input">
    <InputText
      bind:value={formParameter.value}
      disabled
      invalid={formParameter.error !== null}
    >
      <span slot="suffix">
        <i class="bi bi-lock-fill" />
      </span>
    </InputText>
    <input type="file" on:change={onChange} />
  </div>
</div>

<ParameterBaseError {columns} {formParameter} />

<style>
  .file-input {
    display: grid;
    gap: 5px;
  }

  .parameter-base-path {
    align-items: center;
    display: grid;
  }
</style>
