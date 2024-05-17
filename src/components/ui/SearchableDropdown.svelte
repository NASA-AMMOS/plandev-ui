<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  // eslint-disable-next-line
  interface $$Events extends ComponentEvents<SvelteComponent> {
    hideMenu: CustomEvent;
    openMenu: CustomEvent;
    selectOption: CustomEvent<SelectedDropdownOptionValue>;
  }

  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { SvelteComponent, createEventDispatcher, type ComponentEvents } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import type { DropdownOption, DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Menu from '../menus/Menu.svelte';
  import MenuHeader from '../menus/MenuHeader.svelte';
  import MenuItem from '../menus/MenuItem.svelte';

  interface PlaceholderOption extends Omit<DropdownOption, 'value'> {
    value: null;
  }
  type DisplayOption = DropdownOption | PlaceholderOption;
  type DisplayOptions = DisplayOption[];

  export let disabled: boolean = false;
  export let error: string | undefined = undefined;
  export let hasUpdatePermission: boolean = true;
  export let options: DropdownOptions = [];
  export let maxItems: number | undefined = undefined;
  export let maxListHeight: string = '300px';
  export let name: string | undefined = undefined;
  export let updatePermissionError: string = 'You do not have permission to update this';
  export let placeholder: string = '';
  export let planReadOnly: boolean = false;
  export let selectedOptionValue: SelectedDropdownOptionValue | undefined = undefined;
  export let showPlaceholderOption: boolean = true;
  export let searchPlaceholder: string = 'Search Items';
  export let settingsIconTooltip: string = 'Set Selection';
  export let settingsIconTooltipPlacement: string = 'top';

  export function hideMenu() {
    if (presetMenu) {
      dispatch('hideMenu');
      presetMenu.hide();
    }
  }
  export function openMenu() {
    if (!disabled && hasUpdatePermission && presetMenu) {
      dispatch('openMenu');
      presetMenu.show();
    }
  }

  const dispatch = createEventDispatcher<{
    hideMenu: void;
    openMenu: void;
    selectOption: SelectedDropdownOptionValue;
  }>();

  let displayedOptions: DisplayOptions = [];
  let presetMenu: Menu | undefined;
  let searchFilter: string = '';
  let selectedOption: DropdownOption | undefined;

  $: selectedOption = options.find(option => option.value === selectedOptionValue);
  $: {
    displayedOptions = !searchFilter
      ? [
          ...(showPlaceholderOption && placeholder
            ? [
                {
                  display: placeholder,
                  value: null,
                } as PlaceholderOption,
              ]
            : []),
          ...options,
        ]
      : options.filter(option => {
          return new RegExp(searchFilter, 'i').test(option.display);
        });
    if (maxItems !== undefined) {
      displayedOptions = displayedOptions.slice(0, maxItems);
    }
  }
  $: if (disabled) {
    hideMenu();
  }

  function onCloseMenu() {
    searchFilter = '';
  }

  function onSearchPresets(event: Event) {
    const { value } = getTarget(event);

    searchFilter = `${value}`;
  }
  function onSelectOption(option: DisplayOption, event: MouseEvent) {
    event.stopPropagation();
    if (!disabled) {
      dispatch('selectOption', option.value as SelectedDropdownOptionValue);
    }
    hideMenu();
  }
</script>

<div class="searchable-dropdown-container">
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
  <div
    class="selected-display st-input w-100"
    class:error
    class:disabled
    {name}
    on:click|stopPropagation={openMenu}
    role="textbox"
    aria-label={selectedOption?.display ?? placeholder}
    use:permissionHandler={{
      hasPermission: hasUpdatePermission && !planReadOnly,
      permissionError: planReadOnly ? PlanStatusMessages.READ_ONLY : updatePermissionError,
    }}
    use:tooltip={{ content: error, placement: 'top' }}
  >
    <span class="selected-display-value" class:error>{selectedOption?.display ?? placeholder}</span>
    <button
      use:tooltip={{
        content: settingsIconTooltip,
        disabled: !hasUpdatePermission && planReadOnly,
        placement: settingsIconTooltipPlacement,
      }}
      class="icon st-button settings-icon"
      on:click|stopPropagation={openMenu}
    >
      <SettingsIcon />
    </button>
  </div>
  <Menu bind:this={presetMenu} hideAfterClick={false} placement="bottom-end" type="input" on:hide={onCloseMenu}>
    {#if $$slots['dropdown-header']}
      <MenuHeader>
        <slot name="dropdown-header" />
      </MenuHeader>
    {/if}
    <div class="dropdown-items-container">
      <div class="dropdown-search">
        <Input>
          <div class="search-icon" slot="left"><SearchIcon /></div>
          <input
            class="st-input w-100"
            placeholder={searchPlaceholder}
            value={searchFilter}
            on:input={onSearchPresets}
          />
        </Input>
      </div>
      <div class="dropdown-items" style={`max-height:${maxListHeight}`}>
        {#each displayedOptions as displayedOption}
          <MenuItem
            selected={(selectedOption?.value ?? null) === displayedOption.value}
            disabled={(selectedOption?.value ?? null) === displayedOption.value}
            use={[
              [
                permissionHandler,
                {
                  hasPermission: displayedOption.hasSelectPermission ?? true,
                  permissionError: 'You do not have permission to select this',
                },
              ],
            ]}
            on:click={event => {
              onSelectOption(displayedOption, event.detail);
            }}
          >
            <span class="st-typography-body">{displayedOption.display}</span>
          </MenuItem>
        {/each}
      </div>
    </div>
  </Menu>
</div>

<style>
  .searchable-dropdown-container {
    --aerie-menu-item-template-columns: 1fr;
    align-items: center;
    display: grid;
    position: relative;
  }

  .selected-display {
    color: inherit;
    column-gap: 6px;
    display: grid;
    grid-template-columns: auto 16px;
    position: relative;
  }

  .st-input {
    background-color: var(--aerie-dropdown-background-color, var(--st-white));
  }

  .st-input.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .st-input.error {
    background-color: var(--st-input-error-background-color);
  }

  .selected-display-value {
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-display .st-button.icon {
    color: var(--st-gray-50);
    min-width: inherit;
  }

  .settings-icon {
    align-items: center;
    cursor: pointer;
    display: flex;
    height: 1rem;
  }

  .dropdown-items-container {
    cursor: pointer;
  }

  .dropdown-items-container .dropdown-search {
    display: flex;
    margin: 6px;
  }

  .dropdown-items-container .dropdown-search .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  .dropdown-items {
    overflow-y: auto;
  }
</style>
