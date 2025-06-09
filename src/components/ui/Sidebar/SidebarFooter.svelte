<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
</script>

<div bind:this={ref} data-slot="sidebar-footer" data-sidebar="footer" class={cn('flex flex-col gap-2 p-2', className)}>
  <slot />
</div>
