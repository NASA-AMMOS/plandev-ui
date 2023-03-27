<script lang="ts">
  export let title: string = '';
  export let showBorder: boolean = true;
</script>

<div class="header" class:menu-border-bottom={showBorder}>
  <div class="title st-typography-small-caps">
    {title}
    <slot />
  </div>
</div>

<style>
  .header {
    align-items: center;
    color: var(--st-gray-40);
    cursor: auto;
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    padding: 8px;
  }

  .title {
    color: var(--st-gray-40);
    font-size: 11px;
    font-weight: 700;
  }

  .menu-border-bottom {
    border-bottom: 1px solid var(--st-gray-20);
  }
</style>
