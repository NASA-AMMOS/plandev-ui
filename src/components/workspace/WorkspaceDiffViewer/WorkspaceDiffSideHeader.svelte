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
    <div class="flex flex-col gap-1">
      {#if message}
        <div class="max-h-[3.5rem] overflow-y-auto">{message}</div>
      {/if}
      {#if editBy || editedAt}
        <div class=" text-nowrap text-muted-foreground">
          {#if editBy && editedAt}
            <span>Edited By: {getUserDisplayNameFromIdentity(editBy || '')}</span>
            {#if editedAt}
              <span>at {getShortISOForDate(new Date(editedAt || ''))}</span>
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
