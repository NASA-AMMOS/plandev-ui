<svelte:options immutable={true} />

<script lang="ts">
  import ParameterBase from './ParameterBase.svelte';
  import ParameterRec from './ParameterRec.svelte';
  import type { FormParameter } from '../../types';
  import { compare } from '../../utilities/generic';

  export let disabled: boolean = false;
  export let formParameters: FormParameter[] = [];

  let clientWidth: number;
  let level: number = 0;
  let levelPadding: number = 20;

  $: labelColumnWidth = clientWidth * 0.65;
  $: sortedFormParameters = formParameters.sort((a, b) =>
    compare(a.name, b.name),
  );
</script>

{#each sortedFormParameters as formParameter (formParameter.name)}
  <div bind:clientWidth class="parameter">
    {#if formParameter.schema.type === 'series' || formParameter.schema.type === 'struct'}
      <ParameterRec
        {disabled}
        {formParameter}
        {labelColumnWidth}
        {level}
        {levelPadding}
        on:change
      />
    {:else}
      <ParameterBase
        {disabled}
        {formParameter}
        {labelColumnWidth}
        {level}
        {levelPadding}
        on:change
      />
    {/if}
  </div>
{/each}

<style>
  .parameter:not(:last-child) {
    margin-bottom: 1rem;
  }
</style>
