<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';
</script>

<button
  bind:this={ref}
  data-slot="sidebar-menu-action"
  data-sidebar="menu-action"
  class={cn(
    'text-[var(--sidebar-foreground)] ring-[var(--sidebar-ring)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] outline-hidden absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 transition-transform focus-visible:ring-2 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0',
    'after:absolute after:-inset-2 md:after:hidden',
    'group-data-[collapsible=icon]:hidden',
    className,
  )}
>
  <slot />
</button>
