<svelte:options immutable={true} />

<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, ChevronRight } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import type { BaseError, LogMessage } from '../../../types/errors';
  import { isLogMessage } from '../../../utilities/errors';

  import { safeStringify } from '../../../utilities/text';
  import { formatMS } from '../../../utilities/time';

  export let log: BaseError;
  export let defaultExpanded: boolean = false;
  export let showLevel: boolean = true;
  export let showTimestamp: boolean = true;
  export let showLongTimestamp: boolean = true;
  export let showType: boolean = true;

  let expandable: boolean = false;
  let leftContents: HTMLDivElement;
  let open: boolean = defaultExpanded;
  let expansionPadding: number = 0;
  let level: string = '';
  let renderedMessage: string = '';
  let summaryEl: HTMLElement | undefined;

  $: expandable = log.data || log.trace || log.cause || log.service ? true : false;
  $: level = (log as LogMessage).level || '';
  // if we have no message but we *do* have data, and row is not expanded, render data as message so row isn't empty
  $: renderedMessage =
    !log.message.trim() && log.data && !(expandable && open) ? safeStringify(log.data) : (log.message ?? '');

  onMount(() => {
    // On mount, calculate the amount of padding needed for the expansion content
    if (leftContents) {
      expansionPadding = leftContents.clientWidth + 12; // Add 12px to account for gaps
    }
  });

  function formatLogShortTimestamp(timestamp: string): string {
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

  function formatLogLongTimestamp(timestamp: string): string {
    try {
      // Remove any trailing microseconds/nanoseconds after the Z
      // which are present on certain error types and not parseable by native JS Date.
      const cleanTimestamp = timestamp.replace(/Z\.\d+$/, 'Z');
      const date = new Date(cleanTimestamp);
      if (isNaN(date.getTime())) {
        return timestamp; // Return original if parsing fails
      }
      return date.toISOString();
    } catch {
      return timestamp; // Return original if any error occurs
    }
  }

  function handleSummaryCopy(e: ClipboardEvent) {
    // Flex layout splits each chunk (timestamp, [, level, ], message) onto its own line on copy.
    // Collapse whitespace so a selection within a single summary copies as one readable string.
    // Multi-row selections are handled by the list-level handler in ./consoleLogCopy.ts, which
    // walks <details>/<summary>/<pre> — keep that file in sync if you change this template's structure.
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !summaryEl) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!summaryEl.contains(range.startContainer) || !summaryEl.contains(range.endContainer)) {
      return;
    }
    const cleaned = selection.toString().replace(/\s+/g, ' ').trim();
    e.clipboardData?.setData('text/plain', cleaned);
    e.preventDefault();
  }
</script>

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
  <summary class="list-none" bind:this={summaryEl} on:copy={handleSummaryCopy}>
    <div
      class={cn(
        'flex gap-0.5 px-4 py-0.5 pl-1',
        open ? 'bg-neutral-200/50' : '',
        expandable ? 'cursor-pointer hover:bg-neutral-200/50' : '',
      )}
    >
      <div class="flex w-full items-start gap-2">
        <div class="flex flex-shrink-0 items-center gap-0.5" bind:this={leftContents}>
          {#if expandable}
            {#if open}
              <ChevronDown size={12} class="chevron-down flex-shrink-0" />
            {:else}
              <ChevronRight size={12} class="chevron-down flex-shrink-0" />
            {/if}
          {:else}
            <div class="h-[12px] w-[12px]" />
          {/if}
          <div class="flex gap-2">
            {#if showTimestamp}
              <span class="flex-shrink-0 text-muted-foreground">
                {formatLogShortTimestamp(log.timestamp)}
              </span>
            {/if}
            {#if showLevel && level}
              <span class="flex-shrink-0">
                [<span
                  class={cn(
                    'uppercase',
                    level === 'error' ? 'text-destructive' : level === 'warn' ? 'text-yellow-600' : 'text-blue-500',
                  )}>{level}</span>]
              </span>
            {/if}
            {#if showType}
              <span class="flex-shrink-0">
                [<span class={cn('uppercase text-destructive')}>{log.type}</span>]
              </span>
            {/if}
          </div>
        </div>
        <div class="flex min-w-0 items-baseline gap-1 overflow-hidden break-all">
          <slot name="message" {log} message={renderedMessage} {expandable} {open}>
            {renderedMessage}
          </slot>
          {#if isLogMessage(log) && typeof log.duration === 'number'}
            <div class="whitespace-nowrap italic text-muted-foreground">({formatMS(log.duration)})</div>
          {/if}
        </div>
      </div>
    </div>
  </summary>
  {#if expandable && open}
    <div class="bg-neutral-200/50 px-4 py-2" style={`padding-left: ${expansionPadding}px`}>
      {#if log.timestamp && showLongTimestamp}
        <div class="mb-3 flex min-w-0 items-baseline gap-1 overflow-hidden break-all">
          Timestamp: {formatLogLongTimestamp(log.timestamp)}
        </div>
      {/if}
      {#if log.data && safeStringify(log.data) !== '{}'}
        <pre class="m-0 whitespace-pre-wrap break-words">{safeStringify(log.data, 2)}</pre>
      {/if}
      {#if log.cause}
        <div class="flex min-w-0 items-baseline gap-1 overflow-hidden break-all">
          {log.cause}
        </div>
      {/if}
      {#if log.service}
        <div class="flex min-w-0 items-baseline gap-1 overflow-hidden break-all">
          Service: {log.service}
        </div>
      {/if}
      {#if log.trace}
        <pre class="m-0 whitespace-pre-wrap break-words">{log.trace}</pre>
      {/if}
    </div>
  {/if}
</details>

<style>
  details > summary::-webkit-details-marker,
  details > summary::marker {
    display: none;
  }
</style>
