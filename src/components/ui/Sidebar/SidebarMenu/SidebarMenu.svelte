<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLUListElement | null = null;
  export let className: string = '';
</script>

<ul
  bind:this={ref}
  data-slot="sidebar-menu"
  data-sidebar="menu"
  class={cn('flex w-full min-w-0 flex-col gap-1', className)}
>
  <slot />
</ul>
