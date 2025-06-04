<script lang="ts">
  import { cn } from '../../utilities/generic';
  import { useSidebar } from './context';

  // Props
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';

  const sidebar = useSidebar();

  function handleClick() {
    sidebar.toggle();
  }
</script>

<button
  bind:this={ref}
  data-slot="sidebar-trigger"
  data-sidebar="trigger"
  type="button"
  on:click={handleClick}
  class={cn(
    'ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-7 w-7 rounded-md p-0 transition-colors focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
    className,
  )}
>
  <slot />
</button>
