<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import { getContext } from 'svelte';
  import type { BaseError, LogLevel } from '../../../types/errors';
  import { ConsoleContextKey, type ConsoleContext } from '../Console.svelte';
  import EmptyState from '../EmptyState.svelte';
  import ConsoleLog from './ConsoleLog.svelte';

  export let autoScroll: boolean = false;
  export let emptyStateMessage: string = 'No reported problems';
  export let logs: BaseError[] = [];
  export let logLevels: LogLevel[] | undefined = undefined;
  export let showLevel: boolean = true;
  export let showTimestamp: boolean = true;
  export let showType: boolean = true;
  export let value: string = '';

  const consoleContext = getContext<ConsoleContext>(ConsoleContextKey);
  const filterStore = consoleContext?.filter;
  const selectedTabStore = consoleContext?.selectedTab;

  let isScrolledToBottom = true;
  let scrollContainer: HTMLDivElement;
  let logLevelSet: Set<LogLevel> = new Set();
  let visible: boolean = false;

  $: visible = $selectedTabStore === value;
  $: hasLogs = logs.length > 0;
  $: logLevelSet = new Set(logLevels || []);
  $: filteredLogs = !visible
    ? []
    : logs.filter(log => {
        if (log.message && log.message.toLowerCase().indexOf($filterStore.toLowerCase()) < 0) {
          return false;
        }

        if (logLevels) {
          if (!log.level) {
            return false;
          }
          return logLevelSet.has(log.level);
        } else {
          return log;
        }
      });
  $: if (filteredLogs && scrollContainer) {
    scrollToBottomIfNeeded();
  }

  function scrollToBottomIfNeeded() {
    if (autoScroll && scrollContainer) {
      window.requestAnimationFrame(() => {
        if (isScrolledToBottom && scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });
    }
  }

  function onScroll() {
    // Check if user is near the bottom of the scroll container
    const scrollPosition = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;
    const totalHeight = scrollContainer.scrollHeight;

    // Add a small tolerance (e.g., 1 pixel) to account for rounding errors
    isScrolledToBottom = totalHeight - containerHeight <= scrollPosition + 1;
  }
</script>

<Tabs.Content
  {value}
  class="mt-0 h-full w-full overflow-x-hidden font-mono text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <!-- TODO also show counts in dropdown -->
  {#if hasLogs && filteredLogs.length}
    <div class="flex h-full w-full">
      <div class="flex w-full flex-col overflow-auto py-2" bind:this={scrollContainer} on:scroll={onScroll}>
        {#if filteredLogs.length !== logs.length}
          <div class="mb-1 ml-4 italic text-muted-foreground">{logs.length - filteredLogs.length} hidden</div>
        {/if}
        {#each filteredLogs as log}
          <ConsoleLog {showLevel} {showTimestamp} {showType} {log} />
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex h-full">
      <EmptyState title={logs.length && !filteredLogs.length ? 'No matches' : emptyStateMessage} />
    </div>
  {/if}
</Tabs.Content>
