<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  // Props
  export let ref: HTMLLIElement | null = null;
  export let className: string = '';
</script>

<li
  bind:this={ref}
  data-slot="sidebar-menu-item"
  data-sidebar="menu-item"
  class={cn('group/menu-item relative w-full', className)}
>
  <slot />
</li>
