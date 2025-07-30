<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { useSidebar } from './context.js';

  // Props
  export let ref: HTMLDivElement | null = null;
  export let side: 'left' | 'right' = 'left';
  export let variant: 'sidebar' | 'floating' | 'inset' = 'sidebar';
  export let collapsible: 'offcanvas' | 'icon' | 'none' = 'offcanvas';
  export let className: string = '';

  const sidebar = useSidebar();

  // Get the stores from the sidebar instance
  const sidebarState = sidebar.state;
</script>

{#if collapsible === 'none'}
  <div
    class={cn(
      'flex h-full w-[var(--sidebar-width)] flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]',
      className,
    )}
    role="complementary"
    bind:this={ref}
  >
    <slot />
  </div>
{:else}
  <!-- Desktop only implementation -->
  <div
    bind:this={ref}
    role="complementary"
    class="text-sidebar-foreground group peer block w-full"
    data-state={$sidebarState}
    data-collapsible={$sidebarState === 'collapsed' ? collapsible : ''}
    data-variant={variant}
    data-side={side}
    data-slot="sidebar"
  >
    <!-- This is what handles the sidebar gap on desktop -->
    <div
      data-slot="sidebar-gap"
      class={cn(
        'relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear',
        'group-data-[collapsible=offcanvas]:w-0',
        'group-data-[side=right]:rotate-180',
        variant === 'floating' || variant === 'inset'
          ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]'
          : 'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]',
      )}
    />
    <div
      data-slot="sidebar-container"
      class={cn(
        'hidden w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex',
        'bottom-0 top-[var(--nav-header-height)]',
        side === 'left'
          ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
          : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
        // Adjust the padding for floating and inset variants.
        variant === 'floating' || variant === 'inset'
          ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem+2px)]'
          : 'group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l',
        className,
      )}
    >
      <div
        data-sidebar="sidebar"
        data-slot="sidebar-inner"
        class="flex h-full w-full flex-col bg-[var(--sidebar)] group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-[var(--sidebar-border)] group-data-[variant=floating]:shadow-sm"
      >
        <slot />
      </div>
    </div>
  </div>
{/if}
