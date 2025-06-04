<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
  export let showIcon: boolean = false;
</script>

<div
  bind:this={ref}
  data-slot="sidebar-menu-skeleton"
  data-sidebar="menu-skeleton"
  class={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
>
  {#if showIcon}
    <div class="bg-sidebar-accent size-4 rounded-sm" data-sidebar="menu-skeleton-icon" />
  {/if}
  <div class="bg-sidebar-accent h-4 max-w-[--skeleton-width] flex-1 rounded-sm" data-sidebar="menu-skeleton-text" />
</div>
