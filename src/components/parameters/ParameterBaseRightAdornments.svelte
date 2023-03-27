<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter } from '../../types/parameter';
  import InputErrorBadge from './InputErrorBadge.svelte';
  import ValueSourceBadge from './ValueSourceBadge.svelte';

  export let formParameter: FormParameter;
  export let additionalErrors: string[] = [];
  export let hidden: boolean = false;
  export let hideValueSource: boolean = false;
  export let hideError: boolean = false;

  let errors: string[] = [];

  $: if (formParameter.errors || additionalErrors) {
    errors = additionalErrors.concat(
      Array.isArray(formParameter.errors) ? formParameter.errors.concat(additionalErrors) : [],
    );
  }
</script>

<div class="parameter-base-right-adornment" {hidden}>
  {#if !hideValueSource}
    <ValueSourceBadge source={formParameter.valueSource} on:reset />
  {/if}
  {#if errors.length > 0 && !hideError}
    <InputErrorBadge {errors} />
  {/if}
</div>

<style>
  .parameter-base-right-adornment:not([hidden]) {
    display: flex;
  }
</style>
