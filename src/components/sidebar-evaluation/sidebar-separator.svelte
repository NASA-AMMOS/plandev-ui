<script lang="ts">
  import { Separator } from '@nasa-jpl/stellar-svelte';
  import { cn } from '../../utilities/generic';

  // Props
  export let className: string = '';
</script>

<Separator
  data-slot="sidebar-separator"
  data-sidebar="separator"
  class={cn('bg-sidebar-border mx-2 w-auto', className)}
/>
