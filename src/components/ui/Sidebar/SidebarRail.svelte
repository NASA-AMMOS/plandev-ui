<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { useSidebar } from './context';

  // Props
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';

  const sidebar = useSidebar();

  function handleClick() {
    sidebar.toggle();
  }
</script>

<button
  bind:this={ref}
  data-slot="sidebar-rail"
  data-sidebar="rail"
  aria-label="Toggle Sidebar"
  tabindex="-1"
  on:click={handleClick}
  title="Toggle Sidebar"
  class={cn(
    'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:transition-all after:duration-200 hover:after:bg-[var(--sidebar-border)] focus-visible:after:bg-[var(--sidebar-border)] sm:flex',
    '[[data-side=left]_&]:right-0 [[data-side=right]_&]:left-0',
    '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
    '[[data-side=left][data-state=expanded]_&]:cursor-w-resize [[data-side=right][data-state=expanded]_&]:cursor-e-resize',
    'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-[var(--sidebar)]',
    '[[data-side=left][data-collapsible=offcanvas]_&]:group-data-[state=collapsed]:right-2',
    '[[data-side=right][data-collapsible=offcanvas]_&]:group-data-[state=collapsed]:left-2',
    className,
  )}
>
  <slot />
</button>
