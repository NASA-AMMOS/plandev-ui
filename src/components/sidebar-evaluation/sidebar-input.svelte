<script lang="ts">
  import { cn } from '../../utilities/generic';

  // Props
  export let ref: HTMLInputElement | null = null;
  export let className: string = '';
  export let value: string = '';
</script>

<input
  bind:this={ref}
  bind:value
  data-slot="sidebar-input"
  data-sidebar="input"
  class={cn(
    'border-sidebar-border bg-sidebar ring-sidebar-ring placeholder:text-sidebar-foreground/50 focus-visible:ring-sidebar-ring focus-visible:outline-hidden h-8 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2',
    className,
  )}
/>
