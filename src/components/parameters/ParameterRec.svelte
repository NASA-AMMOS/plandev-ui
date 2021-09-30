<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter } from '../../types';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;

  let component: any;

  $: loadComponent(formParameter);

  async function loadComponent(formParameter: FormParameter) {
    if (formParameter.schema.type === 'series') {
      component = (await import('./ParameterRecSeries.svelte')).default;
    } else if (formParameter.schema.type === 'struct') {
      component = (await import('./ParameterRecStruct.svelte')).default;
    }
  }
</script>

<svelte:component
  this={component}
  {disabled}
  {formParameter}
  {labelColumnWidth}
  {level}
  {levelPadding}
  on:change
/>
