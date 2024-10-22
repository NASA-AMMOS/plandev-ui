<svelte:options immutable={true} />

<script lang="ts">
  export let overflow: 'visible' | 'hidden' = 'visible';
</script>

<div class="section-title st-typography-medium" style:overflow>
  {#if $$slots.icon}
    <div class="section-title-icon">
      <slot name="icon" />
    </div>
  {/if}
  <div class="section-title-truncated">
    <slot />
  </div>
</div>

<style>
  .section-title {
    align-items: center;
    border-radius: 4px;
    display: flex;
    font-size: 13px;
    gap: 5px;
    height: 24px;
    justify-content: center;
    line-height: 24px;
    padding: 4px 8px 4px 0px;
    white-space: nowrap;
  }

  .section-title-icon {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
  }

  .section-title-truncated {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
