<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import type { ActionArray } from '../../utilities/useActions';
  import { tooltip } from '../../utilities/tooltip';
  import InputErrorBadge from './InputErrorBadge.svelte';
  import ValueSourceBadge from './ValueSourceBadge.svelte';
  import CopyIcon from 'bootstrap-icons/icons/copy.svg?component';
  import { setClipboardContent } from '../../utilities/clipboard';

  export let disabled: boolean = false;
  export let canCopy: boolean = false;
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

{#if canCopy}
  <button
    type="button"
    class="copy-parameter-value"
    use:tooltip={{ content: 'Copy Value' }}
    on:click={() => {
      setClipboardContent(formParameter.value);
    }}
  >
    <CopyIcon />
  </button>
{/if}
<div class="parameter-base-right-adornment" {hidden}>
  {#if errors.length > 0 && !hideError}
    <InputErrorBadge {errors} />
  {/if}
  {#if !hideValueSource}
    <ValueSourceBadge {disabled} source={formParameter.valueSource} {parameterType} {use} on:reset />
  {/if}
</div>

<style>
  .copy-parameter-value {
    height: 16px;
    margin: 0 4px;
    visibility: hidden;
    width: 16px;
  }

  .parameter-base-right-adornment:not([hidden]) {
    column-gap: 1px;
    display: contents;
  }
</style>
