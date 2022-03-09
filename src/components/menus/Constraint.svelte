<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Menu from './Menu.svelte';

  export let menu: Menu | null = null;

  const dispatch = createEventDispatcher();

  export function hide() {
    if (menu) {
      menu.hide();
    }
  }

  export function toggle() {
    if (menu) {
      menu.toggle();
    }
  }

  function onMenuItemClick(type: string) {
    if (menu) {
      dispatch(type);
      menu.hide();
    }
  }
</script>

<Menu bind:this={menu} right="0px" top="30px">
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
