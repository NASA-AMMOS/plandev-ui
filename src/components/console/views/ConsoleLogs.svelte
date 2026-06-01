<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { getContext, onMount, tick } from 'svelte';
  import type { BaseError, LogLevel, LogMessage } from '../../../types/errors';
  import { ConsoleContextKey, type ConsoleContext } from '../Console.svelte';
  import EmptyState from '../EmptyState.svelte';
  import ConsoleLog from './ConsoleLog.svelte';

  export let autoScroll: boolean = false;
  export let defaultExpanded: boolean = false;
  export let emptyStateMessage: string = 'No reported problems';
  export let noMatchingResultsMessage: string = 'No matches';
  export let logs: BaseError[] = [];
  export let logLevels: LogLevel[] | undefined = undefined;
  export let showLevel: boolean = true;
  export let showTimestamp: boolean = true;
  export let showType: boolean = true;
  export let value: string = '';

  const consoleContext = getContext<ConsoleContext>(ConsoleContextKey);
  const filterStore = consoleContext?.filter;
  const selectedTabStore = consoleContext?.selectedTab;

  let emptyStateTitle: string = '';
  let isScrolledToBottom = true;
  let scrollContainer: HTMLDivElement;
  let scrollTick = 0;
  let logLevelSet: Set<LogLevel> = new Set();
  let mounted = false;
  let visible: boolean = false;

  $: visible = $selectedTabStore === value;
  $: hasLogs = logs.length > 0;
  $: logLevelSet = new Set(logLevels || []);
  $: filteredLogs = !visible
    ? []
    : logs.filter(log => {
        if ($filterStore) {
          const matchesMessage = log.message && log.message.toLowerCase().indexOf($filterStore.toLowerCase()) > -1;
          const matchesType = log.type.toLowerCase().indexOf($filterStore.toLowerCase()) > -1;
          const matchesTrace = log.trace && log.trace.toLowerCase().indexOf($filterStore.toLowerCase()) > -1;
          let stringifiedErrorData = log.data ? JSON.stringify(log.data) : '';
          const matchesData =
            stringifiedErrorData && stringifiedErrorData.toLowerCase().indexOf($filterStore.toLowerCase()) > -1;
          if (!matchesMessage && !matchesType && !matchesTrace && !matchesData) {
            return false;
          }
        }

        if (logLevels) {
          // Filter by selected log levels when the log has a level property.
          // Items without a level (plain BaseError) always pass through.
          if (Object.hasOwn(log, 'level')) {
            return logLevelSet.has((log as LogMessage).level);
          } else {
            return true;
          }
        } else {
          return log;
        }
      });

  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: 0,
    estimateSize: () => 24,
    getScrollElement: () => scrollContainer,
    overscan: 8,
  });

  onMount(async () => {
    await tick();
    mounted = true;
  });

  // @tanstack/svelte-virtual emits same-reference writable.set on every notify; Svelte 4's
  // $$invalidate uses a strict-equality bailout, so auto-sub of `$virtualizer` never fires
  // the reactives below. Route the virtualizer's onChange through a primitive counter that
  // does pass that check, so the reactives re-fire and pull fresh values out of the
  // (in-place mutated) virtualizer instance.
  $: if (mounted) {
    $virtualizer.setOptions({
      count: filteredLogs.length,
      estimateSize: () => 24,
      getScrollElement: () => scrollContainer,
      onChange: () => scrollTick++,
      overscan: 8,
    });
  }

  // Track filteredLogs.length so vState re-computes when count changes (setOptions
  // doesn't fire notify when scrollElement is unchanged, so scrollTick alone wouldn't
  // catch count-only updates).
  $: vState =
    mounted && scrollContainer && filteredLogs.length >= 0 && scrollTick >= 0
      ? { items: $virtualizer.getVirtualItems(), totalSize: $virtualizer.getTotalSize() }
      : { items: [] as ReturnType<typeof $virtualizer.getVirtualItems>, totalSize: 0 };

  $: if (filteredLogs && scrollContainer) {
    scrollToBottomIfNeeded();
  }

  $: {
    if (!logs.length) {
      emptyStateTitle = emptyStateMessage;
    } else {
      if (!filteredLogs.length && $filterStore) {
        emptyStateTitle = noMatchingResultsMessage;
      } else {
        if (filteredLogs.length !== logs.length) {
          emptyStateTitle = `${noMatchingResultsMessage} (${logs.length - filteredLogs.length} hidden)`;
        } else {
          emptyStateTitle = emptyStateMessage;
        }
      }
    }
  }

  function scrollToBottomIfNeeded() {
    if (autoScroll && scrollContainer && filteredLogs.length > 0) {
      window.requestAnimationFrame(() => {
        if (isScrolledToBottom && scrollContainer) {
          $virtualizer.scrollToIndex(filteredLogs.length - 1, { align: 'end' });
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
  class="relative mt-0 h-full w-full overflow-x-hidden font-mono text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <!-- TODO also show counts in dropdown -->
  <div class="absolute inset-0 flex flex-col" class:invisible={!hasLogs || !filteredLogs.length}>
    {#if filteredLogs.length !== logs.length}
      <div class="mb-1 ml-4 italic text-muted-foreground">{logs.length - filteredLogs.length} hidden</div>
    {/if}
    <div class="min-h-0 w-full flex-1 overflow-auto py-2" bind:this={scrollContainer} on:scroll={onScroll}>
      <div style="height: {vState.totalSize}px; position: relative; width: 100%;">
        {#each vState.items as virtualRow (virtualRow.key)}
          <div
            data-index={virtualRow.index}
            use:$virtualizer.measureElement
            style="left: 0; position: absolute; top: 0; transform: translateY({virtualRow.start}px); width: 100%;"
          >
            {#if $$slots.message}
              <ConsoleLog {defaultExpanded} {showLevel} {showTimestamp} {showType} log={filteredLogs[virtualRow.index]}>
                <svelte:fragment slot="message" let:log={slotLog}>
                  <slot name="message" log={slotLog} />
                </svelte:fragment>
              </ConsoleLog>
            {:else}
              <ConsoleLog
                {defaultExpanded}
                {showLevel}
                {showTimestamp}
                {showType}
                log={filteredLogs[virtualRow.index]}
              />
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
  {#if !hasLogs || !filteredLogs.length}
    <div class="absolute inset-0 flex h-full">
      <EmptyState title={emptyStateTitle} />
    </div>
  {/if}
</Tabs.Content>
