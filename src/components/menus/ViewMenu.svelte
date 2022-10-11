<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import PlusIcon from 'bootstrap-icons/icons/plus.svg?component';
  import SaveIcon from 'bootstrap-icons/icons/save.svg?component';
  import { user as userStore } from '../../stores/app';
  import { view } from '../../stores/views';
  import effects from '../../utilities/effects';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  let saveViewDisabled: boolean = true;
  let viewMenu: Menu;

  $: saveViewDisabled = $view?.name === '' || $view?.owner !== $userStore?.id;

  function createView() {
    if ($view) {
      effects.createView($userStore?.id, $view.definition);
    }
  }

  function saveView() {
    if ($view && $view.owner === $userStore?.id && !saveViewDisabled) {
      effects.updateView($view.id, { definition: $view.definition, name: $view.name });
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="view-menu st-typography-body" on:click|stopPropagation={() => viewMenu.toggle()}>
  <ChevronDownIcon />

  <Menu bind:this={viewMenu} offset={[-93, -5]}>
    <MenuItem on:click={createView}>
      <PlusIcon />
      Create View
    </MenuItem>
    <MenuItem disabled={saveViewDisabled} on:click={saveView}>
      <SaveIcon />
      Save View
    </MenuItem>
  </Menu>
</div>

<style>
  .view-menu {
    align-items: center;
    color: white;
    cursor: pointer;
    display: flex;
    height: inherit;
    justify-content: center;
    position: relative;
  }
</style>
