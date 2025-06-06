<script lang="ts">
  import { cn } from '../../../../utilities/generic';

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
    'outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-xs text-[var(--sidebar-foreground)] ring-[var(--sidebar-ring)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] focus-visible:ring-2 active:bg-[var(--sidebar-accent)] active:text-[var(--sidebar-accent-foreground)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-[var(--sidebar-accent)] data-[active=true]:text-[var(--sidebar-accent-foreground)] [&>span:last-child]:truncate',
    className,
  )}
>
  <slot />
</button>
