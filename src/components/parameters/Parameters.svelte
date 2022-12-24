<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter } from '../../types/parameter';
  import { compare } from '../../utilities/generic';
  import Highlight from '../ui/Highlight.svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterRec from './ParameterRec.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameters: FormParameter[] = [];
  export let highlightKeysMap: Record<string, boolean> = {};
  export let levelPadding: number = 20;
  export let showName: boolean = true;

  let clientWidth: number;
  let level: number = 0;

  $: labelColumnWidth = clientWidth * 0.65;
  $: sortedFormParameters = formParameters.sort((a, b) => compare(a.order, b.order));
</script>

{#each sortedFormParameters as formParameter (formParameter.name)}
  <Highlight highlight={highlightKeysMap[formParameter.name]}>
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
  </Highlight>
{/each}

<style>
  .parameter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0px;
  }

  .parameter :global(.st-input.error) {
    background-color: inherit;
    color: inherit;
  }
</style>
