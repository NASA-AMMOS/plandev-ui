<svelte:options immutable={true} />

<script lang="ts">
  import { selectActivity } from '../../../stores/activities';
  import type { BaseError } from '../../../types/errors';
  import { getActivityIdsFromError } from '../../../utilities/errors';

  export let log: BaseError;

  let activityIds: number[] = [];

  $: activityIds = getActivityIdsFromError(log);

  function handleActivityClick(event: MouseEvent, activityId: number) {
    event.stopPropagation();
    selectActivity(activityId, null);
  }
</script>

{#if activityIds.length === 1 && log.message}
  {@const activityId = activityIds[0]}
  {@const activityMatch = log.message.match(/^(.*?)(Activity Directive \d+)(.*)$/)}
  {#if activityMatch}
    {activityMatch[1]}
    <button
      class="cursor-pointer text-blue-700 underline decoration-blue-400/50 underline-offset-2 hover:text-blue-900 hover:decoration-blue-600"
      on:click={e => handleActivityClick(e, activityId)}
    >
      {activityMatch[2]}
    </button>
    {activityMatch[3]}
  {:else}
    {log.message}
    <button
      class="cursor-pointer text-blue-700 underline decoration-blue-400/50 underline-offset-2 hover:text-blue-900 hover:decoration-blue-600"
      on:click={e => handleActivityClick(e, activityId)}
    >
      Activity {activityId}
    </button>
  {/if}
{:else if activityIds.length > 1 && log.message}
  {log.message}
  {#each activityIds as activityId, i}
    {#if i > 0}<span class="text-muted-foreground">,</span>{/if}
    <button
      class="cursor-pointer text-blue-700 underline decoration-blue-400/50 underline-offset-2 hover:text-blue-900 hover:decoration-blue-600"
      on:click={e => handleActivityClick(e, activityId)}
    >
      Activity {activityId}
    </button>
  {/each}
{:else}
  {log.message ?? ''}
{/if}
