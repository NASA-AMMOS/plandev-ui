<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { session } from '$app/stores';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';
  import { viewEditorPanel, viewManagerPanel } from '../../stores/panels';
  import { updateView, view } from '../../stores/views';

  export let viewMenu: Menu;

  const dispatch = createEventDispatcher();

  function saveView() {
    if ($view?.meta?.owner === $session.user.id) {
      updateView($view);
    }
  }

  $: saveViewDisabled = $view?.meta?.owner !== $session.user.id;
</script>

<Menu bind:this={viewMenu}>
  <MenuItem on:click={() => viewEditorPanel.show()}>
    <i class="bi bi-pencil" />
    Edit View
  </MenuItem>
  <MenuItem on:click={() => viewManagerPanel.show()}>
    <i class="bi bi-box-arrow-right" />
    Manage Views
  </MenuItem>
  <MenuItem on:click={() => dispatch('saveAsView')}>
    <i class="bi bi-save" />
    Save As View
  </MenuItem>
  <MenuItem disabled={saveViewDisabled} on:click={saveView}>
    <i class="bi bi-save-fill" />
    Save View
  </MenuItem>
</Menu>
