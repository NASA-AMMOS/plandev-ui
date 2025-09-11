<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { SIDEBAR_INDENT_PER_LEVEL } from '../constants';

  // Props
  export let ref: HTMLUListElement | null = null;
  export let className: string = '';
  export let depth: number = 1;

  $: linePositionPx = 6 + depth * SIDEBAR_INDENT_PER_LEVEL + 10; // 8px base + depth offset + 10px chevron alignment
</script>

<ul
  bind:this={ref}
  data-slot="sidebar-menu-sub"
  data-sidebar="menu-sub"
  class={cn('relative flex min-w-0 flex-col', 'group-data-[collapsible=icon]:hidden', className)}
  style="--nesting-depth: {depth}"
>
  <!-- Vertical hierarchy line -->
  <div class="absolute bottom-0 left-0 top-0 w-px bg-[var(--sidebar-border)]" style="margin-left: {linePositionPx}px" />
  <slot />
</ul>
