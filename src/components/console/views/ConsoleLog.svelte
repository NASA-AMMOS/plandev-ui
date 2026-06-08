<svelte:options immutable={true} />

<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, ChevronRight } from 'lucide-svelte';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { BaseError, LogMessage } from '../../../types/errors';
  import { isLogMessage } from '../../../utilities/errors';

  import { safeStringify } from '../../../utilities/text';
  import { formatMS } from '../../../utilities/time';

  export let log: BaseError;
  export let index: number = -1;
  export let defaultExpanded: boolean = false;
  export let showLevel: boolean = true;
  export let showTimestamp: boolean = true;
  export let showLongTimestamp: boolean = true;
  export let showType: boolean = true;

  const dispatch = createEventDispatcher<{
    toggle: { index: number; open: boolean; size: number };
  }>();

  let detailsEl: HTMLDetailsElement;
  let expandable: boolean = false;
  let isTruncated: boolean = false;
  let leftContents: HTMLDivElement;
  let open: boolean = defaultExpanded;
  let expansionPadding: number = 0;
  let level: string = '';
  let renderedMessage: string = '';

  $: expandable = !!(log.data || log.trace || log.cause || log.service || isTruncated);
  $: level = (log as LogMessage).level || '';
  // If the message is empty but we have data, fall back to a stringified preview so
  // the closed row isn't blank. When expanded, the expansion area already shows the
  // full data block — don't duplicate it inline.
  $: renderedMessage =
    !log.message.trim() && log.data && !(expandable && open) ? safeStringify(log.data) : (log.message ?? '');

  // Size measurement happens at toggle time only (and once on mount when the row
  // re-enters the virtualizer already open).
  async function dispatchSize() {
    if (index < 0) {
      return;
    }
    await tick();
    if (!detailsEl) {
      return;
    }
    dispatch('toggle', { index, open, size: detailsEl.getBoundingClientRect().height });
  }

  async function onToggle() {
    if (open && leftContents && !expansionPadding) {
      expansionPadding = leftContents.clientWidth + 12;
    }
    await dispatchSize();
  }

  // ResizeObserver tells us whether the message overflows its truncated container.
  // Browser batches the reads, so this is cheap across all mounted rows.
  function observeOverflow(node: HTMLElement) {
    const update = () => {
      isTruncated = node.scrollWidth > node.clientWidth;
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }

  onMount(() => {
    // Browser only fires `toggle` on state changes, not on initial render with
    // open=true — so push the open size manually when remounting an open row.
    if (open) {
      dispatchSize();
    }
  });

  function formatTimestamp(timestamp: string, mode: 'short' | 'long'): string {
    try {
      // Strip trailing microseconds/nanoseconds (e.g. "Z.123456") which some error
      // types include and `new Date()` can't parse.
      const date = new Date(timestamp.replace(/Z\.\d+$/, 'Z'));
      if (isNaN(date.getTime())) {
        return timestamp;
      }
      return mode === 'short' ? date.toLocaleString('en-US', { timeStyle: 'medium' }) : date.toISOString();
    } catch {
      return timestamp;
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<details
  bind:this={detailsEl}
  class="group"
  bind:open
  on:toggle={onToggle}
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
              <span class="flex flex-shrink-0 text-muted-foreground">
                {formatTimestamp(log.timestamp, 'short')}
              </span>
            {/if}
            {#if showLevel && level}
              <span class="flex">
                [<span
                  class={cn(
                    'flex flex-shrink-0 uppercase',
                    level === 'error' ? 'text-destructive' : level === 'warn' ? 'text-yellow-600' : 'text-blue-500',
                  )}
                >
                  {level}
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
        <div class="flex min-w-0 items-baseline gap-1 overflow-hidden">
          <div class="min-w-0 flex-1 truncate" use:observeOverflow>
            <slot name="message" {log} message={renderedMessage} {expandable} {open}>
              {renderedMessage}
            </slot>
          </div>
          {#if isLogMessage(log) && typeof log.duration === 'number'}
            <div class="whitespace-nowrap italic text-muted-foreground">({formatMS(log.duration)})</div>
          {/if}
        </div>
      </div>
    </div>
  </summary>
  {#if expandable && open}
    <div class="bg-neutral-200/50 px-4 py-2" style={`padding-left: ${expansionPadding}px`}>
      {#if isTruncated && log.message}
        <div class="mb-3 whitespace-pre-wrap break-all">{log.message}</div>
      {/if}
      {#if log.timestamp && showLongTimestamp}
        <div class="mb-3 flex min-w-0 items-baseline gap-1 overflow-hidden break-all">
          Timestamp: {formatTimestamp(log.timestamp, 'long')}
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
