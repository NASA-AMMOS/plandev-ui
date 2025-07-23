<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
</script>

<div
  bind:this={ref}
  data-slot="sidebar-group"
  data-sidebar="group"
  class={cn('relative flex w-full min-w-0 flex-col p-2', className)}
>
  <slot />
</div>
