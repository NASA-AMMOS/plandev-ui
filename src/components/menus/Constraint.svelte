<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Menu from './Menu.svelte';

  const dispatch = createEventDispatcher();

  export let menu: Menu | null = null;

  function onMenuItemClick(type: string) {
    if (menu) {
      dispatch(type);
      menu.hide();
    }
  }
</script>

<Menu bind:this={menu} top="29px">
  <div class="menu-item" on:click={() => onMenuItemClick('constraintCreate')}>
    <i class="bi bi-plus-circle" />
    Create Constraint
  </div>
  <div class="menu-item" on:click={() => onMenuItemClick('constraintList')}>
    <i class="bi bi-list" />
    Constraint List
  </div>
  <div
    class="menu-item"
    on:click={() => onMenuItemClick('constraintViolations')}
  >
    <i class="bi bi-exclamation-triangle" />
    Violations
  </div>
</Menu>
