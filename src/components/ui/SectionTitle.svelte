<svelte:options immutable={true} />

<script lang="ts">
  export let overflow: 'visible' | 'hidden' = 'visible';
</script>

<div
  class="items-center flex rounded gap-1 h-6 justify-center leading-6 pl-0 py-4 pr-2 whitespace-nowrap text-[13px] font-medium text-foreground"
  style:overflow
>
  {#if $$slots.icon}
    <div class="items-center flex shrink-0 justify-center">
      <slot name="icon" />
    </div>
  {/if}
  <div class="overflow-hidden text-ellipsis">
    <slot />
  </div>
</div>
