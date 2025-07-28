<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { SIDEBAR_INDENT_PER_LEVEL } from '../constants';

  // Props
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';
  export let isActive: boolean = false;
  export let depth: number = 1;

  $: indentPx = 8 + depth * SIDEBAR_INDENT_PER_LEVEL; // 8px matches top-level button padding
</script>

<button
  bind:this={ref}
  data-slot="sidebar-menu-sub-button"
  data-sidebar="menu-sub-button"
  data-active={isActive}
  class={cn(
    'outline-hidden grid h-7 w-full min-w-0 items-center gap-1 overflow-hidden text-left text-sm text-[var(--sidebar-foreground)] ring-[var(--sidebar-ring)]',
    'hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
    'focus-visible:ring-2',
    'active:text-[var(--sidebar-accent-foreground)]',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-[var(--sidebar-accent)]',
    'data-[active=true]:bg-[var(--sidebar-primary)] data-[active=true]:text-[var(--sidebar-accent-foreground)] [&>span:last-child]:truncate',
    className,
  )}
  role="menuitem"
  style="grid-template-columns: auto auto minmax(0, 1fr); padding-left: {indentPx}px;"
  on:click
  on:contextmenu
>
  <slot />
</button>
