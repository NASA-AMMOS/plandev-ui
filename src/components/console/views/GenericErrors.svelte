<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import type { BaseError } from '../../../types/errors';

  export let errors: BaseError[] = [];
  // Use const for props that aren't bound or updated in component
  export const title = 'Errors';
  export const isClearable = true;
  export let value: string;

  $: console.log(errors);

  // Function to extract quoted text from a message
  function extractQuotes(message: string): { quotes: string[]; text: string } {
    const quoteRegex = /'([^']+)'|"([^"]+)"/g;
    const quotes: string[] = [];
    let match;

    // Find all quoted strings
    while ((match = quoteRegex.exec(message)) !== null) {
      quotes.push(match[1] || match[2]);
    }

    // Replace quotes with placeholders for displaying
    const text = message.replace(quoteRegex, '{{QUOTE}}');

    return { quotes, text };
  }

  // Function to clean error message by removing redundant prefixes
  function cleanErrorMessage(message: string): string {
    return message.replace(/^(CAUGHT_ERROR|Error:\s+)+/i, '').trim();
  }

  // Function to format timestamp consistently
  function formatTimestamp(timestamp: string): string {
    try {
      // Remove any trailing microseconds/nanoseconds after the Z
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

  // Keeping createEventDispatcher for future clear functionality implementation
  // const dispatch = createEventDispatcher<{ clearMessages: void }>();

  // This function is kept for future implementation of clear functionality
  // function onClearErrors() {
  //   dispatch('clearMessages');
  // }
</script>

<Tabs.Content {value} class="h-full w-full">
  <div class="grid h-full w-full grid-rows-[min-content_auto] px-2">
    <div class="flex flex-col divide-y divide-[var(--st-gray-20)]">
      <!-- Header -->
      <!-- <div
        class="grid grid-cols-[100px_1fr_180px] items-center gap-4 px-1 py-2 text-xs font-medium text-[var(--st-gray-60)]"
      >
        <div>Type</div>
        <div>Message</div>
        <div>Timestamp</div>
      </div> -->
      {#each errors as error}
        <details class="group">
          <summary class="list-none">
            <div
              class="grid cursor-pointer grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-2 px-1 py-2 hover:bg-[var(--st-gray-10)]"
            >
              <div class="flex items-center">
                <span
                  class="inline-flex w-fit items-center rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-950/80 ring-1 ring-inset ring-red-900/20"
                >
                  {error.type}
                </span>
              </div>
              {#if error.message}
                {@const { quotes, text } = extractQuotes(cleanErrorMessage(error.message))}
                <div class="flex min-w-0 items-center gap-1 overflow-hidden px-2">
                  {#each text.split('{{QUOTE}}') as part, i (i)}
                    {#if part}
                      {@const isLast = i === text.split('{{QUOTE}}').length - 1}
                      {@const hasQuote = quotes[i] !== undefined}
                      <span class={`overflow-hidden whitespace-nowrap ${isLast && !hasQuote ? 'text-ellipsis' : ''}`}
                        >{part}</span
                      >
                    {/if}
                    {#if quotes[i]}
                      <span
                        class="inline-flex shrink-0 items-center rounded bg-background px-1 text-gray-900 ring-1 ring-inset ring-gray-800/20"
                      >
                        {quotes[i]}
                      </span>
                    {/if}
                  {/each}
                </div>
              {/if}
              <span class="flex items-center justify-end text-xs text-[var(--st-gray-60)]"
                >{formatTimestamp(error.timestamp)}</span
              >
            </div>
          </summary>
          {#if error.message || error.data || error.trace}
            <div class="bg-[var(--st-primary-background-color)] px-4 py-2">
              <div class="mb-2 text-xs">
                <span class="font-medium">Timestamp:</span>
                <div class="mt-1">
                  <div>{formatTimestamp(error.timestamp)}</div>
                  <div class="text-[var(--st-gray-60)]">{error.timestamp}</div>
                </div>
              </div>
              {#if error.message}
                <div class="mb-2 whitespace-pre-wrap text-xs">{error.message}</div>
              {/if}
              {#if error.data && JSON.stringify(error.data) !== '{}'}
                <pre class="m-0 whitespace-pre-wrap rounded bg-background p-2 text-xs">{JSON.stringify(
                    error.data,
                    undefined,
                    2,
                  )}</pre>
              {/if}
              {#if error.trace}
                <pre class="m-0 mt-2 whitespace-pre-wrap rounded bg-background p-2 text-xs">{error.trace}</pre>
              {/if}
            </div>
          {/if}
        </details>
      {/each}
    </div>
  </div>
</Tabs.Content>

<style>
  details > summary::-webkit-details-marker,
  details > summary::marker {
    display: none;
  }

  details[open] > summary > div {
    background-color: var(--st-gray-10);
  }
</style>
