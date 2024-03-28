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
  import { Status } from '../../enums/status';
  import { view, viewIsModified } from '../../stores/views';
  import type { User } from '../../types/app';
  import type { View, ViewToggleType } from '../../types/view';
  import { showSavedViewsModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { downloadView } from '../../utilities/view';
  import PlanNavButton from '../plan/PlanNavButton.svelte';
  import ToggleableIcon from '../ui/ToggleableIcon.svelte';
  import MenuItem from './MenuItem.svelte';

  export let hasCreatePermission: boolean = false;
  export let hasUpdatePermission: boolean = false;
  export let user: User | null;

  const defaultViewName = 'Default View';
  const dispatch = createEventDispatcher<{
    createView: Pick<View, 'definition' | 'owner'>;
    editView: View;
    resetView: void;
    saveView: Pick<View, 'definition' | 'id' | 'name' | 'owner'>;
    toggleView: { state: boolean; type: ViewToggleType };
    uploadView: void;
  }>();

  let leftPanelIsOn: boolean = false;
  let leftSplitPanelIsOn: boolean = false;
  let bottomPanelIsOn: boolean = false;
  let rightPanelIsOn: boolean = false;
  let rightSplitPanelIsOn: boolean = false;
  let saveViewDisabled: boolean = true;

  $: saveViewDisabled = $view?.name === '' || $view?.owner !== user?.id || !$viewIsModified;
  $: if ($view?.definition.plan.grid) {
    leftPanelIsOn = !$view.definition.plan.grid.leftHidden && !$view.definition.plan.grid.leftSplit;
    leftSplitPanelIsOn = !$view.definition.plan.grid.leftHidden && $view.definition.plan.grid.leftSplit;
    bottomPanelIsOn = $view.definition.plan.grid.middleSplit;
    rightPanelIsOn = !$view.definition.plan.grid.rightHidden && !$view.definition.plan.grid.rightSplit;
    rightSplitPanelIsOn = !$view.definition.plan.grid.rightHidden && $view.definition.plan.grid.rightSplit;
  }

  function editView() {
    if ($view && user) {
      dispatch('editView', $view);
    }
  }

  function saveAsView() {
    if ($view && user) {
      dispatch('createView', { definition: $view.definition, owner: user.id });
    }
  }

  function resetView() {
    if ($view) {
      dispatch('resetView');
    }
  }

  function saveView() {
    if ($view && user && $view.owner === user.id && !saveViewDisabled) {
      dispatch('saveView', { definition: $view.definition, id: $view.id, name: $view.name, owner: $view.owner });
    }
  }

  function toggleView(type: ViewToggleType, state: boolean) {
    dispatch('toggleView', { state, type });
  }

  function uploadView() {
    dispatch('uploadView');
  }
</script>

<div class="view-menu-button st-typography-medium">
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
      <MenuItem
        disabled={saveViewDisabled}
        on:click={saveView}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdatePermission,
              permissionError: 'You do not have permission to update this view',
            },
          ],
        ]}
      >
        Save
      </MenuItem>
      <MenuItem
        on:click={saveAsView}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasCreatePermission,
              permissionError: 'You do not have permission to create a new view',
            },
          ],
        ]}
      >
        Save as
      </MenuItem>
      <MenuItem disabled={!$viewIsModified} on:click={resetView}>
        Reset to {$view?.name && $view.name !== defaultViewName ? 'last saved' : 'default'}
      </MenuItem>
      <MenuItem
        on:click={uploadView}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasCreatePermission,
              permissionError: 'You do not have permission to create a new view',
            },
          ],
        ]}
      >
        Upload view file
      </MenuItem>
      <MenuItem
        on:click={() => {
          if ($view) {
            downloadView($view);
          }
        }}
      >
        Download view
      </MenuItem>
      <MenuItem on:click={() => showSavedViewsModal(user)}>Browse saved views</MenuItem>
      {#if $view?.name && $view.name !== defaultViewName}
        <hr />
        <MenuItem
          on:click={editView}
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdatePermission,
                permissionError: 'You do not have permission to update this view',
              },
            ],
          ]}
        >
          Rename view
        </MenuItem>
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

  .view-menu-button :global(.header),
  .view-menu-button :global(.nav-button .menu-body) {
    display: none;
  }
</style>
