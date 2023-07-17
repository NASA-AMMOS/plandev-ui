<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { useActions, type ActionArray } from '../../utilities/useActions';
  import Input from '../form/Input.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';

  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  function onChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files.item(0);
      if (file !== null) {
        formParameter.file = file;
        formParameter.value = file.name;
        dispatch('change', formParameter);
      }
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
        class:error={formParameter.errors !== null}
        disabled
        use:useActions={use}
        type="text"
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
    <input type="file" on:change={onChange} use:useActions={use} />
  </div>
</div>

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
