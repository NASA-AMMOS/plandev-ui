<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLInputElement | null = null;
  export let className: string = '';
  export let value: string = '';
</script>

<input
  bind:this={ref}
  bind:value
  data-slot="sidebar-input"
  data-sidebar="input"
  class={cn(
    'focus-visible:outline-hidden h-8 w-full rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar)] px-3 py-2 text-sm ring-[var(--sidebar-ring)] placeholder:text-[var(--sidebar-foreground)] placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]',
    className,
  )}
/>
