<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';
</script>

<button
  bind:this={ref}
  data-slot="sidebar-group-action"
  data-sidebar="group-action"
  class={cn(
    'outline-hidden absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-[var(--sidebar-foreground)] ring-[var(--sidebar-ring)] transition-transform hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] focus-visible:ring-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
    // Increases the hit area of the button on mobile.
    'after:absolute after:-inset-2 md:after:hidden',
    'group-data-[collapsible=icon]:hidden',
    className,
  )}
>
  <slot />
</button>
