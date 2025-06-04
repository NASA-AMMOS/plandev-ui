<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLElement | null = null;
  export let className: string = '';
</script>

<div
  bind:this={ref}
  data-slot="sidebar-group-label"
  data-sidebar="group-label"
  class={cn(
    'text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opa] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
    'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
    className,
  )}
>
  <slot />
</div>
