<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import type { BaseError, LogLevel } from '../../../types/errors';
  import EmptyState from '../EmptyState.svelte';
  import ConsoleLog from './ConsoleLog.svelte';

  export let emptyStateMessage: string = 'No reported problems';
  export let logs: BaseError[] = [];
  export let logLevels: LogLevel[] | undefined = undefined;
  export let showLevel: boolean = true;
  export let showTimestamp: boolean = true;
  export let showType: boolean = true;
  export let value: string = '';

  let logLevelSet: Set<LogLevel> = new Set();

  $: hasLogs = logs.length > 0;
  $: logLevelSet = new Set(logLevels || []);
  $: filteredLogs = logs.filter(log => {
    if (logLevels) {
      if (!log.level) {
        return false;
      }
      return logLevelSet.has(log.level);
    } else {
      return log;
    }
  });
</script>

<Tabs.Content
  {value}
  class="mt-0 h-full w-full overflow-x-hidden font-mono text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  {#if hasLogs}
    <div class="flex h-full w-full">
      <div class="flex w-full flex-col pt-2">
        {#each filteredLogs as log}
          <ConsoleLog {showLevel} {showTimestamp} {showType} {log} />
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex h-full">
      <EmptyState title={emptyStateMessage} />
    </div>
  {/if}
</Tabs.Content>
