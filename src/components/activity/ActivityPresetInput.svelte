<svelte:options immutable={true} accessors={true} />

<script lang="ts">
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import SaveIcon from '@nasa-jpl/stellar/icons/save.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { gqlSubscribable } from '../../stores/subscribable';
  import type { ActivityDirective, ActivityPreset } from '../../types/activity';
  import type { GqlSubscribable } from '../../types/subscribable';
  import { getTarget } from '../../utilities/generic';
  import gql from '../../utilities/gql';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Menu from '../menus/Menu.svelte';
  import MenuHeader from '../menus/MenuHeader.svelte';
  import MenuItem from '../menus/MenuItem.svelte';
  import Highlight from '../ui/Highlight.svelte';

  export let activityDirective: ActivityDirective;
  export let disabled: boolean = false;
  export let hasChanges: boolean = false;
  export let highlightKeysMap: Record<string, boolean> = {};
  export let modelId: number;

  export let activityPresets: GqlSubscribable<ActivityPreset[]> = gqlSubscribable<ActivityPreset[]>(
    gql.SUB_ACTIVITY_PRESETS,
    { activityTypeName: activityDirective.type, modelId },
    [],
  );

  const dispatch = createEventDispatcher();

  let displayedActivityPresets: ActivityPreset[];
  let isPresetNameChanged: boolean = false;
  let isPresetNameDuped: boolean = false;
  let presetMenu: Menu;
  let presetName: string = '';
  let searchFilter: string = '';

  $: activityPresets.setVariables({ activityTypeName: activityDirective.type, modelId });
  $: displayedActivityPresets = $activityPresets.filter((activityPreset: ActivityPreset) => {
    return new RegExp(searchFilter, 'i').test(activityPreset.name);
  });
  $: isPresetNameChanged = !!presetName && presetName !== activityDirective.applied_preset?.presets_applied?.name;
  $: isPresetNameDuped = !isPresetNameChanged
    ? false
    : $activityPresets.reduce((previousValue: boolean, activityPreset: ActivityPreset) => {
        return previousValue || activityPreset.name === presetName;
      }, false);

  function getSaveNewTooltip(inputText: string) {
    if (!inputText || !isPresetNameChanged) {
      return 'Enter a unique name for the new preset';
    }

    if (isPresetNameDuped) {
      return 'You must enter a unique preset name';
    }

    return 'Save as new preset';
  }

  function getSaveTooltip(inputText: string) {
    if (isPresetNameDuped && inputText !== activityDirective.applied_preset?.presets_applied?.name) {
      return 'You must enter a unique preset name';
    }

    return 'Save changes';
  }

  function onDeletePreset() {
    if (activityDirective.applied_preset) {
      dispatch('deletePreset', activityDirective.applied_preset.preset_id);
      presetMenu.hide();
    }
  }

  function onOpenMenu() {
    if (!disabled) {
      presetName = activityDirective.applied_preset?.presets_applied.name ?? '';
      presetMenu.show();
    }
  }

  function onSearchPresets(event: Event) {
    const { value } = getTarget(event);

    searchFilter = `${value}`;
  }

  function onSaveNewPreset() {
    if (presetName && isPresetNameChanged && !isPresetNameDuped) {
      dispatch('saveNewPreset', {
        name: presetName,
      });
      presetMenu.hide();
    }
  }

  function onSavePreset() {
    if (presetName && activityDirective?.applied_preset && !isPresetNameDuped) {
      dispatch('savePreset', {
        name: presetName,
      });
      presetMenu.hide();
    }
  }

  function onUpdatePresetName(event: Event) {
    const { value } = getTarget(event);
    presetName = `${value}`;
  }

  function setAssociatedActivityPreset(activityPresetId: number | null, event: CustomEvent<MouseEvent>) {
    event.stopPropagation();
    dispatch('applyPreset', activityPresetId);
    presetMenu.hide();
  }
</script>

<Highlight highlight={highlightKeysMap.activity_preset}>
  <div class="activity-preset-input-container">
    <div class="preset-input-container st-input w-100">
      <label class="label" use:tooltip={{ content: 'Choose activity preset', placement: 'top' }} for="activity_preset">
        Preset
      </label>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="preset-input st-input w-100" class:disabled on:click|stopPropagation={onOpenMenu} role="textbox">
        <span class="preset-value st-input">{activityDirective.applied_preset?.presets_applied.name ?? 'None '}</span>
        <button
          use:tooltip={{ content: 'Set Preset', placement: 'top' }}
          class="icon st-button settings-icon"
          on:click|stopPropagation={onOpenMenu}
        >
          <SettingsIcon />
        </button>
      </div>
      <Menu bind:this={presetMenu} hideAfterClick={false} placement="bottom-end" type="input">
        <MenuHeader>
          <div class="preset-header">
            <input
              class="st-input w-100"
              placeholder="Enter preset name"
              value={presetName}
              on:input={onUpdatePresetName}
            />
            <button
              use:tooltip={{
                content: getSaveNewTooltip(presetName),
                placement: 'top',
              }}
              class="icon st-button"
              class:disabled={!presetName || !isPresetNameChanged || isPresetNameDuped}
              on:click|stopPropagation={onSaveNewPreset}
            >
              <PlusIcon />
            </button>
            <button
              use:tooltip={{ content: getSaveTooltip(presetName), placement: 'top' }}
              class="icon st-button"
              class:disabled={isPresetNameDuped}
              disabled={!(!!activityDirective.applied_preset && (isPresetNameChanged || hasChanges))}
              on:click|stopPropagation={onSavePreset}
            >
              <SaveIcon />
            </button>
            <button
              use:tooltip={{ content: 'Delete preset', placement: 'top' }}
              class="icon st-button"
              disabled={!activityDirective?.applied_preset}
              on:click|stopPropagation={onDeletePreset}
            >
              <TrashIcon />
            </button>
          </div>
        </MenuHeader>
        <div class="preset-items">
          <div class="preset-search">
            <Input>
              <div class="search-icon" slot="left"><SearchIcon /></div>
              <input
                class="st-input w-100"
                placeholder="Search presets"
                value={searchFilter}
                on:input={onSearchPresets}
              />
            </Input>
          </div>
          <MenuItem
            selected={!activityDirective.applied_preset}
            on:click={event => setAssociatedActivityPreset(null, event.detail)}
          >
            <span class="st-typography-body">None</span>
          </MenuItem>
          {#each displayedActivityPresets as activityPreset}
            <MenuItem
              selected={activityPreset.id === activityDirective.applied_preset?.preset_id}
              on:click={event => {
                setAssociatedActivityPreset(activityPreset.id, event.detail);
              }}
            >
              <span class="st-typography-body">{activityPreset.name}</span>
            </MenuItem>
          {/each}
        </div>
      </Menu>
    </div>
  </div>
</Highlight>

<style>
  .activity-preset-input-container {
    --aerie-menu-item-template-columns: 1fr;
    align-items: center;
    display: grid;
  }

  .preset-input-container {
    display: grid;
    grid-template-rows: repeat(2, min-content);
    position: relative;
    row-gap: 4px;
  }

  .preset-input {
    color: inherit;
    column-gap: 6px;
    display: grid;
    grid-template-columns: auto 16px;
    position: relative;
  }

  .preset-input.st-input {
    background: var(--st-white);
    padding-bottom: 0;
    padding-top: 0;
  }

  .preset-value.st-input {
    background: none;
    border: 0;
    overflow: hidden;
    padding-left: 0;
    padding-right: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preset-input.st-input.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .preset-input .st-button.icon {
    color: var(--st-gray-50);
    min-width: inherit;
  }

  .st-button.disabled {
    cursor: not-allowed;
    opacity: var(--st-button-disabled-opacity);
  }

  .settings-icon {
    align-items: center;
    cursor: pointer;
    display: flex;
  }

  .preset-header {
    column-gap: 6px;
    display: grid;
    grid-template-columns: auto repeat(3, 16px);
  }

  .preset-items {
    cursor: pointer;
  }

  .preset-items .preset-search {
    display: flex;
    margin: 6px;
  }

  .preset-items .preset-search .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }
</style>
