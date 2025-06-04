<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
</script>

<main
  bind:this={ref}
  data-slot="sidebar-inset"
  data-sidebar="inset"
  class={cn(
    'relative flex min-h-svh flex-1 flex-col bg-background',
    'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow',
    className,
  )}
>
  <slot />
</main>
