<svelte:options immutable={true} />

<script lang="ts">
  import type { ActionValueSchema } from '@nasa-jpl/plandev-actions';
  import type { ArgumentsMap } from '../../../types/parameter';
  import { formatRunParameters } from '../../../utilities/actions';

  export let parameters: ArgumentsMap;
  export let parameterSchema: Record<string, ActionValueSchema> | undefined;

  $: formattedParameters = formatRunParameters(parameters, parameterSchema);
</script>

<!-- One parameter per line, as in the plan page's activity arguments cell -->
<div class="parameters-container">
  {#each formattedParameters as { key, value }}
    <div><strong>{key}:</strong> {value}</div>
  {/each}
</div>

<style>
  .parameters-container {
    line-height: 1.4;
    /* Centers a single line in the grid's default row height */
    padding: 7px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
