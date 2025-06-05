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
    'ring-[var(--sidebar-ring)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] h-7 w-7 rounded-md p-0 transition-colors focus-visible:ring-2 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0',
    className,
  )}
>
  <slot />
</button>
