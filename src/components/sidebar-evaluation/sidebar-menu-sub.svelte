<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLUListElement | null = null;
  export let className: string = '';
</script>

<ul
  bind:this={ref}
  data-slot="sidebar-menu-sub"
  data-sidebar="menu-sub"
  class={cn(
    'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
    'group-data-[collapsible=icon]:hidden',
    className,
  )}
>
  <slot />
</ul>
