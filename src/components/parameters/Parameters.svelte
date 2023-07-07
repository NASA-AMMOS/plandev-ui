<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter, ParameterType } from '../../types/parameter';
  import { compare } from '../../utilities/generic';
  import type { ActionArray } from '../../utilities/useActions';
  import Highlight from '../ui/Highlight.svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterRec from './ParameterRec.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameters: FormParameter[] = [];
  export let hideRightAdornments: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let showName: boolean = true;
  export let use: ActionArray = [];

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
          {hideRightAdornments}
          {labelColumnWidth}
          {level}
          {levelPadding}
          {parameterType}
          {showName}
          on:change
          on:reset
          {use}
        />
      {:else}
        <ParameterBase
          {disabled}
          {formParameter}
          {hideRightAdornments}
          {labelColumnWidth}
          {level}
          {levelPadding}
          {parameterType}
          on:change
          on:reset
          {use}
        />
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
