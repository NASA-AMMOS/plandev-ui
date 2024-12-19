<script lang="ts">
  export let title: string = '';
  export let showBorder: boolean = true;
</script>

<div class="header" class:menu-border-bottom={showBorder}>
  {#if title || $$slots.left}
    <div class="left">
      {#if title}
        <div class="title st-typography-small-caps">
          {title}
        </div>
      {/if}
      <slot name="left" />
    </div>
  {/if}
  <slot />
</div>

<style>
  .header {
    align-items: center;
    color: var(--st-gray-40);
    cursor: auto;
    display: flex;
    justify-content: space-between;
    padding: 8px;
  }

  .left {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .title {
    color: var(--st-gray-40);
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
  }

  .menu-border-bottom {
    border-bottom: 1px solid var(--st-gray-20);
  }
</style>
