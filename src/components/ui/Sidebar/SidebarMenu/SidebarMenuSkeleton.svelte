<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
  export let showIcon: boolean = false;
</script>

<div
  bind:this={ref}
  data-slot="sidebar-menu-skeleton"
  data-sidebar="menu-skeleton"
  class={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
>
  {#if showIcon}
    <div class="h-4 w-4 rounded-sm bg-[var(--sidebar-accent)]" data-sidebar="menu-skeleton-icon" />
  {/if}
  <div
    class="h-4 max-w-[var(--skeleton-width)] flex-1 rounded-sm bg-[var(--sidebar-accent)]"
    data-sidebar="menu-skeleton-text"
  />
</div>
