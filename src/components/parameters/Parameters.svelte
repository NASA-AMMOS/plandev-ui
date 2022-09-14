<svelte:options immutable={true} />

<script lang="ts">
  import { compare } from '../../utilities/generic';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterRec from './ParameterRec.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameters: FormParameter[] = [];
  export let levelPadding: number = 20;
  export let showName: boolean = true;

  let clientWidth: number;
  let level: number = 0;

  $: labelColumnWidth = clientWidth * 0.65;
  $: sortedFormParameters = formParameters.sort((a, b) => compare(a.order, b.order));
</script>

{#each sortedFormParameters as formParameter (formParameter.name)}
  <div bind:clientWidth class="parameter">
    {#if formParameter.schema.type === 'series' || formParameter.schema.type === 'struct'}
      <ParameterRec
        {disabled}
        {expanded}
        {formParameter}
        {labelColumnWidth}
        {level}
        {levelPadding}
        {showName}
        on:change
      />
    {:else}
      <ParameterBase {disabled} {formParameter} {labelColumnWidth} {level} {levelPadding} on:change />
    {/if}
  </div>
{/each}

<style>
  .parameter:not(:last-child) {
    margin-bottom: 1rem;
  }

  .parameter :global(.st-input.error) {
    background-color: inherit;
    color: inherit;
  }
</style>
