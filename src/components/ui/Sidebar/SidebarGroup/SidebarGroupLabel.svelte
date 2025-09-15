<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
</script>

<div
  bind:this={ref}
  data-slot="sidebar-group-label"
  data-sidebar="group-label"
  class={cn(
    'outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-[var(--sidebar-foreground)] opacity-70 ring-[var(--sidebar-ring)] transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
    'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
    className,
  )}
>
  <slot />
</div>
