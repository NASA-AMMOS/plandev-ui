<svelte:options immutable={true} />

<script lang="ts">
  import ParameterBaseBoolean from './ParameterBaseBoolean.svelte';
  import ParameterBaseDuration from './ParameterBaseDuration.svelte';
  import ParameterBaseNumber from './ParameterBaseNumber.svelte';
  import ParameterBasePath from './ParameterBasePath.svelte';
  import ParameterBaseString from './ParameterBaseString.svelte';
  import ParameterBaseVariant from './ParameterBaseVariant.svelte';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
</script>

{#if formParameter.schema.type === 'boolean'}
  <ParameterBaseBoolean {disabled} {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{:else if formParameter.schema.type === 'duration'}
  <ParameterBaseDuration {disabled} {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{:else if formParameter.schema.type === 'int'}
  <ParameterBaseNumber {disabled} {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{:else if formParameter.schema.type === 'path'}
  <ParameterBasePath {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{:else if formParameter.schema.type === 'real'}
  <ParameterBaseNumber {disabled} {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{:else if formParameter.schema.type === 'string'}
  <ParameterBaseString {disabled} {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{:else if formParameter.schema.type === 'variant'}
  <ParameterBaseVariant {disabled} {labelColumnWidth} {level} {levelPadding} {formParameter} on:change />
{/if}
