<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';
  export let isActive: boolean = false;
</script>

<button
  bind:this={ref}
  data-slot="sidebar-menu-sub-button"
  data-sidebar="menu-sub-button"
  data-active={isActive}
  class={cn(
    'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-xs focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate',
    className,
  )}
>
  <slot />
</button>
