<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import ViewGridBottomPanelEmpty from '@nasa-jpl/stellar/icons/view_grid_bottom_panel_empty.svg?component';
  import ViewGridBottomPanelFilled from '@nasa-jpl/stellar/icons/view_grid_bottom_panel_filled.svg?component';
  import ViewGridIcon from '@nasa-jpl/stellar/icons/view_grid_filled.svg?component';
  import ViewGridLeftPanelEmpty from '@nasa-jpl/stellar/icons/view_grid_left_panel_empty.svg?component';
  import ViewGridLeftPanelFilled from '@nasa-jpl/stellar/icons/view_grid_left_panel_filled.svg?component';
  import ViewGridLeftPanelSplitEmpty from '@nasa-jpl/stellar/icons/view_grid_left_panel_split_empty.svg?component';
  import ViewGridLeftPanelSplitFilled from '@nasa-jpl/stellar/icons/view_grid_left_panel_split_filled.svg?component';
  import ViewGridRightPanelEmpty from '@nasa-jpl/stellar/icons/view_grid_right_panel_empty.svg?component';
  import ViewGridRightPanelFilled from '@nasa-jpl/stellar/icons/view_grid_right_panel_filled.svg?component';
  import ViewGridRightPanelSplitEmpty from '@nasa-jpl/stellar/icons/view_grid_right_panel_split_empty.svg?component';
  import ViewGridRightPanelSplitFilled from '@nasa-jpl/stellar/icons/view_grid_right_panel_split_filled.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { user as userStore } from '../../stores/app';
  import { view, viewIsModified } from '../../stores/views';
  import type { ViewToggleType } from '../../types/view';
  import { showSavedViewsModal } from '../../utilities/modal';
  import { Status } from '../../utilities/status';
  import PlanNavButton from '../plan/PlanNavButton.svelte';
  import ToggleableIcon from '../ui/ToggleableIcon.svelte';
  import MenuItem from './MenuItem.svelte';

  const defaultViewName = 'Default View';
  const dispatch = createEventDispatcher();

  let leftPanelIsOn: boolean = false;
  let leftSplitPanelIsOn: boolean = false;
  let bottomPanelIsOn: boolean = false;
  let rightPanelIsOn: boolean = false;
  let rightSplitPanelIsOn: boolean = false;
  let saveViewDisabled: boolean = true;

  $: saveViewDisabled = $view?.name === '' || $view?.owner !== $userStore?.id || !$viewIsModified;
  $: if ($view.definition.plan.grid) {
    leftPanelIsOn = !$view.definition.plan.grid.leftHidden && !$view.definition.plan.grid.leftSplit;
    leftSplitPanelIsOn = !$view.definition.plan.grid.leftHidden && $view.definition.plan.grid.leftSplit;
    bottomPanelIsOn = $view.definition.plan.grid.middleSplit;
    rightPanelIsOn = !$view.definition.plan.grid.rightHidden && !$view.definition.plan.grid.rightSplit;
    rightSplitPanelIsOn = !$view.definition.plan.grid.rightHidden && $view.definition.plan.grid.rightSplit;
  }

  function editView() {
    if ($view) {
      dispatch('editView', { definition: $view.definition, owner: $userStore?.id });
    }
  }

  function saveAsView() {
    if ($view) {
      dispatch('createView', { definition: $view.definition, owner: $userStore?.id });
    }
  }

  function resetView() {
    if ($view) {
      dispatch('resetView');
    }
  }

  function saveView() {
    if ($view && $view.owner === $userStore?.id && !saveViewDisabled) {
      dispatch('saveView', { definition: $view.definition, id: $view.id, name: $view.name });
    }
  }

  function toggleView(type: ViewToggleType, state: boolean) {
    dispatch('toggleView', { state, type });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="view-menu st-typography-medium">
  <PlanNavButton status={$viewIsModified ? Status.Modified : null} title={$view?.name ?? defaultViewName} menuTitle="">
    <ViewGridIcon />
    <div class="view-menu st-typography-medium" slot="menu">
      <div class="toggles">
        <MenuItem on:click={() => toggleView('left', !leftPanelIsOn)}>
          <ToggleableIcon isOn={leftPanelIsOn}>
            <ViewGridLeftPanelFilled />
            <ViewGridLeftPanelEmpty slot="offIcon" />
          </ToggleableIcon>
        </MenuItem>
        <MenuItem on:click={() => toggleView('left-split', !leftSplitPanelIsOn)}>
          <ToggleableIcon isOn={leftSplitPanelIsOn}>
            <ViewGridLeftPanelSplitFilled />
            <ViewGridLeftPanelSplitEmpty slot="offIcon" />
          </ToggleableIcon>
        </MenuItem>
        <div class="toggle-divider">|</div>
        <MenuItem on:click={() => toggleView('bottom', !bottomPanelIsOn)}>
          <ToggleableIcon isOn={bottomPanelIsOn}>
            <ViewGridBottomPanelFilled />
            <ViewGridBottomPanelEmpty slot="offIcon" />
          </ToggleableIcon>
        </MenuItem>
        <div class="toggle-divider">|</div>
        <MenuItem on:click={() => toggleView('right-split', !rightSplitPanelIsOn)}>
          <ToggleableIcon isOn={rightSplitPanelIsOn}>
            <ViewGridRightPanelSplitFilled />
            <ViewGridRightPanelSplitEmpty slot="offIcon" />
          </ToggleableIcon>
        </MenuItem>
        <MenuItem on:click={() => toggleView('right', !rightPanelIsOn)}>
          <ToggleableIcon isOn={rightPanelIsOn}>
            <ViewGridRightPanelFilled />
            <ViewGridRightPanelEmpty slot="offIcon" />
          </ToggleableIcon>
        </MenuItem>
      </div>
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

  .toggles {
    --aerie-menu-item-padding: 0px;
    align-items: center;
    display: grid;
    grid-template-columns: repeat(7, min-content);
    justify-content: space-between;
    margin: 8px 8px 0;
  }

  .toggle-divider {
    opacity: 0.6;
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
