<svelte:options immutable={true} />

<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { getShortISOForDate } from '../../../utilities/time';
  import { getUserDisplayNameFromIdentity } from '../../../utilities/workspaces';

  /** Subtext under the "Mine" header, e.g. who last edited it and when. */
  export let editBy: string | null = null;
  export let editedAt: string | null = null;
  /** Header over the "Mine" pane; defaults to the save-conflict wording. */
  export let label: string | null = null;
  /** Message to display in the "Mine" pane. */
  export let message: string | null = null;
  /** Additional classes for the container. */
  export let className: string = '';
</script>

<div class={cn('px-3 py-1.5', className)}>
  <div class="grid h-full grid-rows-[min-content_min-content] content-between gap-1">
    <div class="grid grid-cols-[1fr_auto] items-center gap-2">
      <span class="overflow-hidden text-ellipsis" title={label}>
        {label}
      </span>
      <slot name="header-slot" />
    </div>
    <div>
      {#if message}
        <div class="text-xs">{message}</div>
      {/if}
      {#if editBy || editedAt}
        <div class="flex w-full gap-1 text-nowrap text-xs text-muted-foreground">
          {#if editBy && editedAt}
            <span
              >{getUserDisplayNameFromIdentity(editBy)} edited at {getShortISOForDate(new Date(editedAt || ''))}</span
            >
          {:else if editBy}
            <span>Edited by: {getUserDisplayNameFromIdentity(editBy || '')}</span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
