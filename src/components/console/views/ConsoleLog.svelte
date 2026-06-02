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
  let leftContents: HTMLDivElement;
  let open: boolean = defaultExpanded;
  let expansionPadding: number = 0;
  let level: string = '';
  let renderedMessage: string = '';

  $: expandable = log.data || log.trace || log.cause || log.service ? true : false;
  $: level = (log as LogMessage).level || '';
  // if we have no message but we *do* have data, and row is not expanded, render data as message so row isn't empty
  $: renderedMessage =
    !log.message.trim() && log.data && !(expandable && open) ? safeStringify(log.data) : (log.message ?? '');

  // All layout measurement is deferred to toggle time. Per-row measurement on mount
  // (via `use:measureElement` or onMount reads) was the dominant cost during scroll —
  // each row mount forced a sync layout, scaling with overscan and scroll velocity.
  // On toggle we read once, then push the new size into the virtualizer imperatively
  // via `resizeItem` (handled by the parent through the dispatched event).
  async function dispatchSize() {
    if (index < 0) {
      return;
    }
    await tick();
    if (!detailsEl) {
      return;
    }
    const size = detailsEl.getBoundingClientRect().height;
    dispatch('toggle', { index, open, size });
  }

  async function onToggle() {
    if (open && leftContents && !expansionPadding) {
      expansionPadding = leftContents.clientWidth + 12;
    }
    await dispatchSize();
  }

  // When a row mounts already open (e.g. it was open before the virtualizer
  // recycled it out of view), the browser does not fire a `toggle` event, so
  // we push the real size to the virtualizer once on mount. Collapsed rows
  // skip this — they match the estimate, so no measurement is needed.
  onMount(() => {
    if (open) {
      dispatchSize();
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
                {formatLogShortTimestamp(log.timestamp)}
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
