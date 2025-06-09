<script lang="ts">
  import { cn, Separator } from '@nasa-jpl/stellar-svelte';

  // Props
  export let className: string = '';
</script>

<Separator
  data-slot="sidebar-separator"
  data-sidebar="separator"
  class={cn('mx-2 w-auto bg-[var(--sidebar-border)]', className)}
/>
