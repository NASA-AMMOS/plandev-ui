<svelte:options immutable={true} />

<script lang="ts">
  import { Button, cn } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, ChevronRight } from 'lucide-svelte';
  import { getContext } from 'svelte';
  import { selectActivity } from '../../../stores/activities';
  import type { BaseError } from '../../../types/errors';
  import { getActivityIdsFromError } from '../../../utilities/errors';
  import { ConsoleContextKey, type ConsoleContext } from '../Console.svelte';

  export let log: BaseError;
  export let showLevel: boolean = true;
  export let showTimestamp: boolean = true;
  export let showType: boolean = true;

  // Get state from context
  const consoleContext = getContext<ConsoleContext>(ConsoleContextKey);
  const filterStore = consoleContext?.filter;

  let cleanedMessage: string = '';
  let expandable: boolean = false;
  let expansionPadding: number = 0;
  let matchesFilter: boolean = true;
  let filter: string = '';
  let open: boolean = false;

  $: expandable = log.data || log.trace ? true : false;
  $: cleanedMessage = cleanLogMessage(log.message);
  $: filter = $filterStore;
  $: matchesFilter = cleanedMessage ? cleanedMessage.toLowerCase().indexOf(filter.toLowerCase()) > -1 : true;

  // Clean log message by removing redundant prefixes
  function cleanLogMessage(message: string): string {
    return message.replace(/^(CAUGHT_ERROR|Error:\s+)+/i, '').trim();
  }

  function formatLogTimestamp(timestamp: string): string {
    try {
      // Remove any trailing microseconds/nanoseconds after the Z
      // which are present on certain error types and not parseable by native JS Date.
      const cleanTimestamp = timestamp.replace(/Z\.\d+$/, 'Z');
      const date = new Date(cleanTimestamp);
      if (isNaN(date.getTime())) {
        return timestamp; // Return original if parsing fails
      }
      return date.toLocaleString('en-US', {
        timeStyle: 'medium',
      });
    } catch {
      return timestamp; // Return original if any error occurs
    }
  }

  function handleActivityClick(activityId: number) {
    selectActivity(activityId, null);
  }
</script>

{#if matchesFilter}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <details
    class="group"
    bind:open
    on:keypress={e => {
      // prevent expansion when no content is available
      if (!expandable) {
        e.preventDefault();
      }
    }}
    on:click={e => {
      // prevent expansion when no content is available
      if (!expandable) {
        e.preventDefault();
      }
    }}
  >
    <summary class="list-none">
      <div
        class={cn(
          'flex gap-0.5 px-4 py-0.5 pl-1',
          open ? 'bg-neutral-200/50' : '',
          expandable ? 'cursor-pointer hover:bg-neutral-200/50' : '',
        )}
      >
        <div class="flex items-baseline gap-2">
          <div class="flex flex-shrink-0 items-baseline gap-0.5" bind:clientWidth={expansionPadding}>
            {#if expandable}
              {#if open}
                <ChevronDown size={10} class="chevron-down flex-shrink-0" />
              {:else}
                <ChevronRight size={10} class="chevron-down flex-shrink-0" />
              {/if}
            {:else}
              <div class="h-[10px] w-[10px]" />
            {/if}
            <div class="flex gap-2">
              {#if showTimestamp}
                <span class="flex flex-shrink-0 text-muted-foreground">
                  {formatLogTimestamp(log.timestamp)}
                </span>
              {/if}
              {#if showLevel && log.level}
                <span class="flex">
                  [<span
                    class={cn(
                      'flex flex-shrink-0 uppercase',
                      log.level === 'error'
                        ? 'text-destructive'
                        : log.level === 'warn'
                          ? 'text-yellow-600'
                          : 'text-blue-500',
                    )}
                  >
                    {log.level}
                  </span>]
                </span>
              {/if}
              {#if showType}
                <span class="flex">
                  [<span class={cn('flex flex-shrink-0 uppercase text-destructive')}>
                    {log.type}
                  </span>]
                </span>
              {/if}
            </div>
          </div>
          {#if log.message}
            {@const activityIds = getActivityIdsFromError(log)}
            <div class="flex min-w-0 items-baseline gap-1 overflow-hidden break-all">
              {cleanedMessage}
              {#if activityIds.length > 0}
                <div class="ml-2 flex shrink-0 gap-1">
                  {#each activityIds as activityId}
                    <Button
                      size="xs"
                      class="inline-flex shrink-0 items-center rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-950/80 ring-1 ring-inset ring-blue-900/20 hover:bg-blue-100"
                      on:click={e => {
                        e.stopPropagation();
                        handleActivityClick(activityId);
                      }}
                    >
                      View Activity {activityId}
                    </Button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </summary>
    {#if expandable}
      <div class="bg-neutral-200/50 px-4 py-2" style={`padding-left: ${expansionPadding + 12}px`}>
        <!-- Add 12px to account for gaps -->
        {#if log.data && JSON.stringify(log.data) !== '{}'}
          <pre class="m-0 whitespace-pre-wrap break-words">{JSON.stringify(log.data, undefined, 2)}</pre>
        {/if}
        {#if log.trace}
          <pre class="m-0 whitespace-pre-wrap break-words">{log.trace}</pre>
        {/if}
      </div>
    {/if}
  </details>
{/if}

<style>
  details > summary::-webkit-details-marker,
  details > summary::marker {
    display: none;
  }
</style>
