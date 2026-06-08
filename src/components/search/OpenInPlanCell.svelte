<svelte:options immutable={true} />

<script lang="ts">
  import { SquareArrowOutUpRight } from 'lucide-svelte';

  export let onClick: () => void = () => {};

  function handleClick(event: MouseEvent) {
    event.stopPropagation();
    onClick();
  }
</script>

<button
  type="button"
  aria-label="Open in plan"
  class="flex h-full w-full items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
  on:click={handleClick}
>
  <SquareArrowOutUpRight size={14} />
</button>
