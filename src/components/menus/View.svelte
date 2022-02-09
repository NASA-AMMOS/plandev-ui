<svelte:options accessors={true} />

<script lang="ts">
  import { session as appSession } from '$app/stores';
  import { createEventDispatcher } from 'svelte';
  import Menu from './Menu.svelte';

  export let currentView: View;
  export let menu: Menu | null = null;

  const dispatch = createEventDispatcher();

  function onMenuItemClick(type: string) {
    if (menu) {
      dispatch(type);
      menu.hide();
    }
  }

  function onSaveView() {
    if (currentView?.meta?.owner === $appSession.user.id) {
      onMenuItemClick('saveView');
    }
  }
</script>

<Menu bind:this={menu} top="29px">
  <div class="menu-item" on:click={() => onMenuItemClick('editView')}>
    <i class="bi bi-pencil" />
    Edit View
  </div>
  <div class="menu-item" on:click={() => onMenuItemClick('manageViews')}>
    <i class="bi bi-box-arrow-right" />
    Manage Views
  </div>
  <div class="menu-item" on:click={() => onMenuItemClick('saveAsView')}>
    <i class="bi bi-save" />
    Save As View
  </div>
  <div
    class="menu-item"
    class:disabled={currentView?.meta?.owner !== $appSession.user.id}
    on:click={onSaveView}
  >
    <i class="bi bi-save-fill" />
    Save View
  </div>
</Menu>
