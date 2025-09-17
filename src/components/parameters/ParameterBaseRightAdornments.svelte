<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import type { ActionArray } from '../../utilities/useActions';
  import InputErrorBadge from './InputErrorBadge.svelte';
  import ValueSourceBadge from './ValueSourceBadge.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let additionalErrors: string[] = [];
  export let hidden: boolean = false;
  export let hideValueSource: boolean = false;
  export let hideError: boolean = false;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];

  let errors: string[] = [];

  $: if (formParameter.errors || additionalErrors) {
    errors = additionalErrors.concat(
      Array.isArray(formParameter.errors) ? formParameter.errors.concat(additionalErrors) : [],
    );
  }
</script>

<div class="parameter-base-right-adornment" {hidden}>
  {#if errors.length > 0 && !hideError}
    <InputErrorBadge {errors} />
  {/if}
  {#if !hideValueSource}
    <ValueSourceBadge {disabled} source={formParameter.valueSource} {parameterType} {use} on:reset />
  {/if}
</div>

<style>
  .parameter-base-right-adornment:not([hidden]) {
    column-gap: 1px;
    display: flex;
  }
</style>
