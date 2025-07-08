<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import { selectActivity } from '../../../stores/activities';
  import type { BaseError } from '../../../types/errors';
  import { getActivityIdsFromError } from '../../../utilities/errors';
  import { extractQuotes } from '../../../utilities/generic';
  import EmptyState from '../../console/EmptyState.svelte';

  export let errors: BaseError[] = [];
  export let value: string;

  $: hasErrors = errors.length > 0;

  // Clean error message by removing redundant prefixes
  function cleanErrorMessage(message: string): string {
    return message.replace(/^(CAUGHT_ERROR|Error:\s+)+/i, '').trim();
  }

  function formatErrorTimestamp(timestamp: string): string {
    try {
      // Remove any trailing microseconds/nanoseconds after the Z
      // which are present on certain error types and not parseable by native JS Date.
      const cleanTimestamp = timestamp.replace(/Z\.\d+$/, 'Z');
      const date = new Date(cleanTimestamp);
      if (isNaN(date.getTime())) {
        return timestamp; // Return original if parsing fails
      }
      return date.toLocaleString('en-US', {
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        month: '2-digit',
        second: '2-digit',
        year: 'numeric',
      });
    } catch {
      return timestamp; // Return original if any error occurs
    }
  }

  function handleActivityClick(activityId: number) {
    selectActivity(activityId, null);
  }
</script>

<Tabs.Content
  {value}
  class="mt-0 h-full w-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  {#if hasErrors}
    <div class="grid h-full w-full grid-rows-[min-content_auto]">
      <div class="flex flex-col divide-y pt-2">
        {#each errors as error}
          <details class="group">
            <summary class="list-none">
              <div
                class="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 hover:bg-[var(--st-gray-10)]"
              >
                <div class="flex items-center">
                  <span
                    class="inline-flex w-fit items-center rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-950/80 ring-1 ring-inset ring-red-900/20"
                  >
                    {error.type}
                  </span>
                </div>
                {#if error.message}
                  {@const activityIds = getActivityIdsFromError(error)}
                  {@const { quotes, text } = extractQuotes(cleanErrorMessage(error.message))}
                  <div class="flex min-w-0 items-center gap-1 overflow-hidden px-2">
                    {#each text.split('{{QUOTE}}') as part, i (i)}
                      {#if part}
                        {@const isLast = i === text.split('{{QUOTE}}').length - 1}
                        {@const hasQuote = quotes[i] !== undefined}
                        <span
                          class={`whitespace-nowrap ${isLast && !hasQuote ? 'overflow-hidden text-ellipsis' : 'min-w-fit'}`}
                        >
                          {part}
                        </span>
                      {/if}
                      {#if quotes[i]}
                        <span
                          class="inline-flex shrink-0 items-center rounded bg-background px-1 text-gray-900 ring-1 ring-inset ring-gray-800/20"
                        >
                          {quotes[i]}
                        </span>
                      {/if}
                    {/each}
                    {#if activityIds.length > 0}
                      <div class="ml-2 flex shrink-0 gap-1">
                        {#each activityIds as activityId}
                          <button
                            class="inline-flex shrink-0 items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-950/80 ring-1 ring-inset ring-blue-900/20 hover:bg-blue-100"
                            on:click|stopPropagation={() => handleActivityClick(activityId)}
                          >
                            View Activity {activityId}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
                <span class="flex items-center justify-end text-xs text-[var(--st-gray-60)]">
                  {formatErrorTimestamp(error.timestamp)}</span
                >
              </div>
            </summary>
            {#if error.message || error.data || error.trace}
              <div class="bg-white px-4 py-2">
                <div class="mb-2 text-xs">
                  <div class="mt-1">
                    <div class="text-[var(--st-gray-60)]">{error.timestamp}</div>
                  </div>
                </div>
                {#if error.message}
                  <div class="mb-2 whitespace-pre-wrap text-xs">{error.message}</div>
                {/if}
                {#if error.data && JSON.stringify(error.data) !== '{}'}
                  <pre class="m-0 whitespace-pre-wrap rounded bg-background text-xs">{JSON.stringify(
                      error.data,
                      undefined,
                      2,
                    )}</pre>
                {/if}
                {#if error.trace}
                  <pre class="m-0 whitespace-pre-wrap rounded bg-background text-xs">{error.trace}</pre>
                {/if}
              </div>
            {/if}
          </details>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex h-full">
      <EmptyState />
    </div>
  {/if}
</Tabs.Content>

<style>
  details > summary::-webkit-details-marker,
  details > summary::marker {
    display: none;
  }

  details[open] > summary > div {
    @apply bg-accent;
  }
</style>
