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
  const closedRowHeight = 20;
  const overscan = 30;

  let emptyStateTitle: string = '';
  let isScrolledToBottom = true;
  let scrollContainer: HTMLDivElement;
  let scrollTick = 0;
  let logLevelSet: Set<LogLevel> = new Set();
  let mounted = false;
  let openIndices: Set<number> = new Set();
  let prevFilterKey: string | null = null;
  let visible: boolean = false;
  let virtualizerState: { items: ReturnType<typeof $virtualizer.getVirtualItems>; totalSize: number } = {
    items: [],
    totalSize: 0,
  };

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

        // Plain BaseErrors (no level) always pass; LogMessages must match the selected levels.
        if (!logLevels) {
          return true;
        }
        if (!Object.hasOwn(log, 'level')) {
          return true;
        }
        return logLevelSet.has((log as LogMessage).level);
      });

  const baseVirtualizerOptions = {
    estimateSize: () => closedRowHeight,
    getScrollElement: () => scrollContainer,
    overscan,
  };
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    ...baseVirtualizerOptions,
    count: 0,
  });

  onMount(async () => {
    await tick();
    mounted = true;
  });

  // The pre-setOptions getVirtualItems() flushes any pending measurements against
  // the *current* count. Without it, a shrink (filter narrows) leaves stale entries
  // in TanStack's measurementsCache and the total scroll height stays inflated.
  $: if (mounted) {
    $virtualizer.getVirtualItems();
    $virtualizer.setOptions({
      ...baseVirtualizerOptions,
      count: filteredLogs.length,
      onChange: () => scrollTick++,
    });
  }

  $: virtualizerState =
    mounted && scrollContainer && filteredLogs.length >= 0 && scrollTick >= 0
      ? { items: $virtualizer.getVirtualItems(), totalSize: $virtualizer.getTotalSize() }
      : { items: [] as ReturnType<typeof $virtualizer.getVirtualItems>, totalSize: 0 };

  $: if (scrollContainer && filteredLogs.length >= 0) {
    scrollToBottomIfNeeded();
  }

  // Filter/level changes remap every index → log, so drop open tracking and
  // clear cached measurements (open rows would otherwise bleed sizes into new logs).
  $: {
    const filterKey = `${$filterStore ?? ''}|${(logLevels ?? []).join(',')}`;
    if (prevFilterKey !== null && filterKey !== prevFilterKey) {
      if (mounted) {
        $virtualizer.measure();
      }
      openIndices = new Set();
    }
    prevFilterKey = filterKey;
  }

  $: emptyStateTitle = computeEmptyStateTitle(
    logs.length,
    filteredLogs.length,
    !!$filterStore,
    emptyStateMessage,
    noMatchingResultsMessage,
  );

  function computeEmptyStateTitle(
    total: number,
    filtered: number,
    hasSearch: boolean,
    emptyMsg: string,
    noMatchMsg: string,
  ): string {
    if (total === 0) {
      return emptyMsg;
    }
    if (filtered === 0 && hasSearch) {
      return noMatchMsg;
    }
    if (filtered !== total) {
      return `${noMatchMsg} (${total - filtered} hidden)`;
    }
    return emptyMsg;
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

  function onRowToggle(e: CustomEvent<{ index: number; open: boolean; size: number }>) {
    const { index, open, size } = e.detail;
    if (open) {
      openIndices.add(index);
    } else {
      openIndices.delete(index);
    }
    openIndices = new Set(openIndices);
    $virtualizer.resizeItem(index, size);
  }

  function onScroll() {
    const scrollPosition = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;
    const totalHeight = scrollContainer.scrollHeight;
    // 1px tolerance for rounding.
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
      <div class="my-1 border-b pb-1 pl-4 italic text-muted-foreground">{logs.length - filteredLogs.length} hidden</div>
    {/if}
    <div
      class="min-h-0 w-full flex-1 overflow-auto py-2"
      data-testid="console-logs-list"
      bind:this={scrollContainer}
      on:scroll={onScroll}
    >
      <div style="height: {virtualizerState.totalSize}px; position: relative; width: 100%;">
        {#each virtualizerState.items as virtualRow (virtualRow.key)}
          {@const log = filteredLogs[virtualRow.index]}
          {#if log}
            {@const rowProps = {
              defaultExpanded: defaultExpanded || openIndices.has(virtualRow.index),
              index: virtualRow.index,
              log,
              showLevel,
              showTimestamp,
              showType,
            }}
            <div
              data-index={virtualRow.index}
              style="left: 0; position: absolute; top: 0; transform: translateY({virtualRow.start}px); width: 100%;"
            >
              {#if $$slots.message}
                <ConsoleLog {...rowProps} on:toggle={onRowToggle}>
                  <svelte:fragment slot="message" let:log={slotLog}>
                    <slot name="message" log={slotLog} />
                  </svelte:fragment>
                </ConsoleLog>
              {:else}
                <ConsoleLog {...rowProps} on:toggle={onRowToggle} />
              {/if}
            </div>
          {/if}
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
