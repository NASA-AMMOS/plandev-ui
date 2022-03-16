<svelte:options accessors={true} />

<script lang="ts">
  import { session } from '$app/stores';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';
  import type Modal from '../modals/Modal.svelte';
  import SaveAsViewModal from '../modals/SaveAsViewModal.svelte';
  import { viewEditorPanel, viewManagerPanel } from '../../stores/panels';
  import { createView, updateView, view } from '../../stores/views';

  export let viewMenu: Menu;

  let saveAsViewModal: Modal;

  $: saveViewDisabled = $view?.meta?.owner !== $session.user.id;

  function saveAsView(event: CustomEvent<string>) {
    const { detail: name } = event;
    const newView = { ...$view, name };
    createView(newView);
  }

  function saveView() {
    if ($view?.meta?.owner === $session.user.id) {
      updateView($view);
    }
  }
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
  <MenuItem on:click={() => saveAsViewModal.show()}>
    <i class="bi bi-save" />
    Save As View
  </MenuItem>
  <MenuItem disabled={saveViewDisabled} on:click={saveView}>
    <i class="bi bi-save-fill" />
    Save View
  </MenuItem>
</Menu>

<SaveAsViewModal bind:modal={saveAsViewModal} on:saveAsView={saveAsView} />
