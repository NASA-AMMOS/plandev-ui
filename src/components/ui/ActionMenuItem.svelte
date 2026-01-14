<svelte:options immutable={true} />

<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';

  export let className: string = '';
  export let name: string;
  export let description: string | null | undefined = undefined;
</script>

<div class={cn('flex flex-col gap-0.5 overflow-hidden whitespace-nowrap', className, description ? 'py-0.5' : '')}>
  <div class="overflow-hidden text-ellipsis">
    {name}
  </div>
  {#if description}
    <div class="overflow-hidden text-ellipsis whitespace-normal text-muted-foreground">
      {description}
    </div>
  {/if}
</div>
