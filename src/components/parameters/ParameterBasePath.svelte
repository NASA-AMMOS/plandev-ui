<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter } from '../../types';
  import Input from '../form/Input.svelte';
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
    <Input>
      <input
        bind:value={formParameter.value}
        class="st-input w-100"
        class:error={formParameter.error !== null}
        disabled
        type="text"
      />
      <i class="bi bi-lock-fill" slot="right" />
    </Input>
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
