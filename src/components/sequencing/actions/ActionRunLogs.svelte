<svelte:options immutable={true} />

<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import type { ParsedActionLog, ParsedActionLogLevel } from '../../../utilities/actions';
  import { safeStringify } from '../../../utilities/text';

  export let logs: ParsedActionLog[];
  export let maxHeightClass: string = 'max-h-[600px]';
  export let className: string = '';

  const levelTextClass: Record<ParsedActionLogLevel, string> = {
    debug: 'text-muted-foreground',
    error: 'text-destructive',
    info: 'text-blue-500',
    warn: 'text-yellow-600',
  };
</script>

<div
  data-testid="action-run-logs"
  class={cn('overflow-auto rounded bg-muted py-2 font-mono text-xs leading-5', maxHeightClass, className)}
>
  {#each logs as log}
    <div class="whitespace-pre-wrap break-words px-3">
      {#if log.timestamp}<span class="text-muted-foreground">{log.timestamp}</span>{' '}{/if}<span
        class={cn('uppercase', levelTextClass[log.level])}>{log.level.padEnd(5)}</span
      >{' '}<span>{log.message}</span>
      {#if log.data}
        <div class="whitespace-pre-wrap break-words pl-4 text-muted-foreground">{safeStringify(log.data, 2)}</div>
      {/if}
      {#if log.trace}
        <div class="whitespace-pre-wrap break-words pl-4 text-muted-foreground">{log.trace}</div>
      {/if}
    </div>
  {/each}
</div>
