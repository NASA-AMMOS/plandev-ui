<div class="st-typography-label loading">
  {#if $$slots.default}
    <slot />
  {:else}
    Loading...
  {/if}
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    user-select: none;
    width: 100%;
  }
</style>
