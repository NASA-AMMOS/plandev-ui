<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLLIElement | null = null;
  export let className: string = '';
</script>

<li
  bind:this={ref}
  data-slot="sidebar-menu-item"
  data-sidebar="menu-item"
  class={cn('group/menu-item relative', className)}
>
  <slot />
</li>
