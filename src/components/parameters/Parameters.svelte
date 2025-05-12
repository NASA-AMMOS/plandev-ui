<svelte:options immutable={true} />

<script lang="ts">
  import type { FormParameter, ParameterName, ParameterType } from '../../types/parameter';
  import { compare } from '../../utilities/generic';
  import type { ActionArray } from '../../utilities/useActions';
  import Highlight from '../ui/Highlight.svelte';
  import ParameterBase from './ParameterBase.svelte';
  import ParameterInfo from './ParameterInfo.svelte';
  import ParameterRec from './ParameterRec.svelte';

  export let disabled: boolean = false;
  export let expanded: boolean = false;
  export let formParameters: FormParameter[] = [];
  export let hideInfo: boolean = false;
  export let hideRightAdornments: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let parameterToFlash: ParameterName | null = null;
  export let use: ActionArray = [];

  let clientWidth: number;
  let level: number = 0;

  $: labelColumnWidth = clientWidth * 0.4;
  $: sortedFormParameters = formParameters.sort((a, b) => compare(a.order, b.order));
</script>

<div class="parameters-container">
  {#each sortedFormParameters as formParameter (formParameter.name)}
    <Highlight
      highlight={highlightKeysMap[formParameter.name]}
      flash={parameterToFlash === formParameter.name}
      on:didFlash
    >
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
        <div class="right-actions">
          {#if !hideInfo}
            <ParameterInfo {disabled} {formParameter} on:reset />
          {/if}
          <slot name="right-action" parameter={formParameter} />
        </div>
      </div>
    </Highlight>
  {/each}
</div>

<style>
  .parameter {
    column-gap: 4px;
    display: grid;
    grid-template-columns: auto min-content;
  }

  .parameter :global(.st-input) {
    text-overflow: ellipsis;
  }

  .parameter :global(.st-input.error) {
    background-color: inherit;
    color: inherit;
  }

  .parameters-container :global(> div.highlight) {
    border: 1px solid transparent;
    box-sizing: border-box;
    margin-bottom: -1px;
    margin-top: -1px;
    padding: 4px 0;
  }

  .parameters-container :global(> div.highlight:hover) {
    border-bottom: 1px solid var(--st-gray-20);
    border-top: 1px solid var(--st-gray-20);
  }

  .right-actions {
    display: flex;
    gap: 2px;
    transition: visibility 0.1s;
    visibility: hidden;
  }
  .parameters-container :global(> div.highlight:hover .right-actions) {
    visibility: visible;
  }
</style>
