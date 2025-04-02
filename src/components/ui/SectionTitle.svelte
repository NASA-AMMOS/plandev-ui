<svelte:options immutable={true} />

<script lang="ts">
  export let overflow: 'visible' | 'hidden' = 'visible';
</script>

<div
  class="flex h-6 items-center justify-center gap-1 whitespace-nowrap rounded py-4 pl-0 pr-2 text-[13px] font-medium leading-6 text-foreground"
  style:overflow
>
  {#if $$slots.icon}
    <div class="flex shrink-0 items-center justify-center opacity-30">
      <slot name="icon" />
    </div>
  {/if}
  <div class="overflow-hidden text-ellipsis">
    <slot />
  </div>
</div>
