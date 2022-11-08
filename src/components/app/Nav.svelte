<script lang="ts">
  import AppMenu from '../../components/menus/AppMenu.svelte';
</script>

<div class="nav">
  <div class="left">
    <AppMenu />
    <div class="divider" />
    <div class="title st-typography-medium">
      <slot name="title" />
    </div>
    <slot name="left" />
  </div>
  <div class="right">
    <slot name="right" />
  </div>
</div>

<style>
  :root {
    --nav-header-height: 48px;
  }
  .nav {
    align-items: center;
    background: var(--st-primary);
    color: var(--st-primary-background-color);
    display: flex;
    height: var(--nav-header-height);
    padding: 1rem;
    z-index: 2;
  }

  .divider {
    background: var(--st-white);
    height: 16px;
    opacity: 0.2;
    width: 1px;
  }

  .title {
    align-items: center;
    color: var(--st-gray-20);
    font-size: 14px;
  }

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
  }

  .right {
    align-items: center;
    display: inline-flex;
  }
</style>
