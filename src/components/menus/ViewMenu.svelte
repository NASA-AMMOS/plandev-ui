<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import ViewGridIcon from '@nasa-jpl/stellar/icons/view_grid_filled.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { user as userStore } from '../../stores/app';
  import { view, viewIsModified } from '../../stores/views';
  import { showSavedViewsModal } from '../../utilities/modal';
  import { Status } from '../../utilities/status';
  import PlanNavButton from '../plan/PlanNavButton.svelte';
  import MenuItem from './MenuItem.svelte';

  const defaultViewName = 'Default View';
  const dispatch = createEventDispatcher();

  let saveViewDisabled: boolean = true;

  $: saveViewDisabled = $view?.name === '' || $view?.owner !== $userStore?.id || !$viewIsModified;

  function saveAsView() {
    if ($view) {
      dispatch('createView', { definition: $view.definition, owner: $userStore?.id });
    }
  }

  function editView() {
    if ($view) {
      dispatch('editView', { definition: $view.definition, owner: $userStore?.id });
    }
  }

  function saveView() {
    if ($view && $view.owner === $userStore?.id && !saveViewDisabled) {
      dispatch('saveView', { definition: $view.definition, id: $view.id, name: $view.name });
    }
  }

  function resetView() {
    if ($view) {
      dispatch('resetView');
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="view-menu">
  <PlanNavButton status={$viewIsModified ? Status.Modified : null} title={$view?.name ?? defaultViewName} menuTitle="">
    <ViewGridIcon />
    <div class="view-menu st-typography-medium" slot="menu">
      <MenuItem disabled={saveViewDisabled} on:click={saveView}>Save</MenuItem>
      <MenuItem on:click={saveAsView}>Save as</MenuItem>
      <MenuItem disabled={!$viewIsModified} on:click={resetView}>Reset to default</MenuItem>
      <MenuItem on:click={showSavedViewsModal}>Browse saved views</MenuItem>
      {#if $view?.name && $view.name !== defaultViewName}
        <hr />
        <MenuItem on:click={editView}>Rename view</MenuItem>
      {/if}
    </div>
  </PlanNavButton>
</div>

<style>
  .view-menu {
    --aerie-menu-item-template-columns: auto;
    align-items: center;
    cursor: pointer;
    display: grid;
    height: inherit;
    justify-content: center;
    position: relative;
  }

  .view-menu hr {
    background-color: var(--st-gray-20);
    border: 0;
    height: 1px;
    margin: 0 4px;
  }

  .view-menu :global(.header),
  .view-menu :global(.nav-button .menu-body) {
    display: none;
  }
</style>
