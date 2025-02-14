<svelte:options accessors={true} />

<script lang="ts">
  // eslint-disable-next-line
  interface $$Events extends ComponentEvents<SvelteComponent> {
    hideMenu: CustomEvent;
    openMenu: CustomEvent;
    selectOption: CustomEvent<SelectedDropdownOptionValue>;
  }

  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { SvelteComponent, createEventDispatcher, type ComponentEvents } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import type { DropdownOption, DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import { classNames, getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Menu from '../menus/Menu.svelte';
  import MenuHeader from '../menus/MenuHeader.svelte';
  import MenuItem from '../menus/MenuItem.svelte';
  import RowVirtualizerFixed from '../RowVirtualizerFixed.svelte';

  interface PlaceholderOption extends Omit<DropdownOption, 'value'> {
    value: null;
  }
  type DisplayOption = DropdownOption | PlaceholderOption;
  type DisplayOptions = DisplayOption[];

  export let allowMultiple: boolean = false;
  export let className: string = '';
  export let disabled: boolean = false;
  export let error: string | undefined = undefined;
  export let hasUpdatePermission: boolean = true;
  export let options: DropdownOptions = [];
  export let maxListHeight: string = '300px';
  export let name: string | undefined = undefined;
  export let updatePermissionError: string = 'You do not have permission to update this';
  export let placeholder: string = '';
  export let planReadOnly: boolean = false;
  export let selectedOptionLabel: string = '';
  export let selectedOptionValues: SelectedDropdownOptionValue[] = [];
  export let showPlaceholderOption: boolean = true;
  export let searchPlaceholder: string = 'Search Items';
  export let selectTooltip: string = '';
  export let selectTooltipPlacement: string = 'top';

  export function hideMenu() {
    if (menuRef) {
      dispatch('hideMenu');
      menuRef.hide();
    }
  }
  export function openMenu() {
    if (!disabled && hasUpdatePermission && menuRef) {
      dispatch('openMenu');
      menuRef.show();
    }
  }

  const dispatch = createEventDispatcher<{
    change: SelectedDropdownOptionValue[];
    hideMenu: void;
    openMenu: void;
  }>();

  let filteredOptions: DisplayOptions = [];
  let displayedOptions: DisplayOptions = [];
  let label: string = '';
  let menuRef: Menu | undefined;
  let menuOpen: boolean = false;
  let searchFilter: string = '';
  let selectedOptions: DropdownOptions = [];
  let maxWidth: number = 0;

  $: {
    selectedOptions = [];
    let maxOptionChars = 0;
    options.forEach(option => {
      if (selectedOptionValues.find(value => value === option.value)) {
        selectedOptions.push(option);
      }
      const optionCharacterLength = option.display.toString().length;
      maxOptionChars = Math.max(maxOptionChars, optionCharacterLength);
    });
    // avg char length + 48 padding for the rest of the menu
    maxWidth = Math.max(50, maxOptionChars * 8 + 48);
  }

  $: selectedOptions = options.filter(option => {
    return !!selectedOptionValues.find(value => value === option.value);
  });

  $: {
    filteredOptions = !searchFilter
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
    displayedOptions = filteredOptions;
  }
  $: if (disabled) {
    hideMenu();
  }
  $: rootClasses = classNames('searchable-dropdown-container', {
    [className]: !!className,
  });

  $: {
    if (selectedOptions.length < 1) {
      label = placeholder;
    } else if (selectedOptionLabel) {
      label = selectedOptionLabel;
    } else if (selectedOptions.length === 1) {
      label = selectedOptions[0].display;
    } else {
      label = selectedOptions.map(selectedOption => selectedOption.display).join(', ');
    }
  }

  function onCloseMenu() {
    searchFilter = '';
    menuOpen = false;
  }

  function onSearchPresets(event: Event) {
    const { value } = getTarget(event);
    searchFilter = `${value}`;
  }

  function onSelectOption(option: DisplayOption, event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
    if (!disabled) {
      let newValues = [];
      if (allowMultiple) {
        const isSelected = selectedOptionValues.find(value => value === option.value);
        if (isSelected) {
          newValues = selectedOptionValues.filter(value => value !== option.value);
        } else {
          newValues = [...selectedOptionValues, option.value];
        }
      } else {
        newValues = [option.value];
      }
      dispatch('change', newValues);
    }
    if (!allowMultiple) {
      hideMenu();
    }
  }
</script>

<div class={rootClasses}>
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
  <div
    class="selected-display st-select w-100"
    class:error
    class:disabled
    {name}
    on:click|stopPropagation={openMenu}
    role="combobox"
    aria-controls="menu"
    aria-expanded={menuOpen}
    aria-label={label}
    use:permissionHandler={{
      hasPermission: hasUpdatePermission && !planReadOnly,
      permissionError: planReadOnly ? PlanStatusMessages.READ_ONLY : updatePermissionError,
    }}
    use:tooltip={{ content: error || selectTooltip, placement: selectTooltipPlacement }}
  >
    <span class="selected-display-value" class:error>{label}</span>
    <button class="icon st-button icon-right" on:click|stopPropagation={openMenu}>
      {#if $$slots.icon}
        <slot name="icon" />
      {:else}
        <SettingsIcon />
      {/if}
    </button>
  </div>
  <div id="menu">
    <Menu
      bind:this={menuRef}
      hideAfterClick={false}
      placement="bottom-end"
      type="input"
      on:hide={onCloseMenu}
      on:show={() => (menuOpen = true)}
    >
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
        <RowVirtualizerFixed
          count={displayedOptions.length}
          overscan={100}
          maxHeight={maxListHeight}
          minWidth="{maxWidth}px"
          selectedIndex={selectedOptions.length
            ? displayedOptions.findIndex(o => o.value === selectedOptions[0].value)
            : undefined}
          let:index
        >
          {@const displayedOption = displayedOptions[index]}
          {@const selected =
            !!selectedOptions.find(o => o.value === displayedOption.value) ||
            (!!showPlaceholderOption && selectedOptions.length === 0 && index === 0)}
          <MenuItem
            {selected}
            use={[
              [
                permissionHandler,
                {
                  hasPermission: displayedOption.hasSelectPermission ?? true,
                  permissionError: 'You do not have permission to select this',
                },
              ],
            ]}
            on:click={event => onSelectOption(displayedOption, event.detail)}
          >
            <div class="dropdown-item">
              <div class="dropdown-item-icon">
                {#if selected}
                  <CheckIcon />
                {/if}
              </div>

              <span class="dropdown-item-text st-typography-body">{displayedOption.display}</span>
            </div>
          </MenuItem>
        </RowVirtualizerFixed>
        {#if displayedOptions.length < 1}
          <MenuItem selectable={false}>
            <div class="dropdown-item">
              <div class="dropdown-item-icon" />
              <span class="dropdown-item-text st-typography-label">No results found</span>
            </div>
          </MenuItem>
        {/if}
      </div>
    </Menu>
  </div>
</div>

<style>
  .searchable-dropdown-container {
    --aerie-menu-item-template-columns: 1fr;
    align-items: center;
    display: grid;
    position: relative;
  }

  .selected-display {
    align-items: center;
    color: inherit;
    column-gap: 6px;
    display: grid;
    grid-template-columns: auto 16px;
    padding: 0px 4px;
    position: relative;
  }

  .dropdown-search :global(.st-input) {
    background-color: var(--aerie-dropdown-background-color, var(--st-white));
  }

  .st-select.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .st-select.error {
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

  .icon-right {
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

  .dropdown-item {
    display: flex;
    flex-direction: row;
    gap: 4px;
    overflow: hidden;
  }

  .dropdown-item-icon {
    display: flex;
    flex-shrink: 0;
    width: 24px;
  }

  .dropdown-item-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
