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
  export let loading: boolean = false;
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
      if (menuOpen) {
        hideMenu();
      } else {
        dispatch('openMenu');
        menuRef.show();
      }
    }
  }
  export function toggleMenu() {
    if (menuOpen) {
      hideMenu();
    } else {
      openMenu();
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
  let measureCanvasContext: CanvasRenderingContext2D | null = null;
  let measureRef: HTMLSpanElement | undefined;

  function getMeasureContext(): CanvasRenderingContext2D | null {
    if (typeof document === 'undefined') {
      return null;
    }
    if (!measureCanvasContext) {
      const canvas = document.createElement('canvas');
      measureCanvasContext = canvas.getContext('2d');
    }
    return measureCanvasContext;
  }

  function measureMaxOptionWidth(opts: DropdownOptions): number {
    const ctx = getMeasureContext();
    if (!ctx || !measureRef) {
      return 0;
    }
    // Read the actual rendered font from a span that mirrors the option's CSS class —
    // canvas needs the font in its own string format. One DOM read per measurement pass,
    // not per option.
    const cs = getComputedStyle(measureRef);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    let max = 0;
    for (const opt of opts) {
      const w = ctx.measureText(opt.display.toString()).width;
      if (w > max) {
        max = w;
      }
    }
    return max;
  }

  // Measure the widest option text and add room for the row chrome:
  //   px-3 (left) + icon 24 + gap 4 + px-3 (right) + scrollbar ~16 + small canvas-vs-browser buffer ~4
  // = 72px. Re-runs when `options` changes or once `measureRef` is bound on mount.
  $: maxWidth = measureRef ? Math.max(50, Math.ceil(measureMaxOptionWidth(options)) + 72) : 50;

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
  <!-- Hidden ref used to read the option text's computed font for canvas measurement; never visible.
       Mirrors the classes the real option text inherits (MenuItem applies text-[13px] font-medium). -->
  <span
    bind:this={measureRef}
    class="dropdown-item-text text-[13px] font-medium"
    aria-hidden="true"
    style="pointer-events: none; position: absolute; visibility: hidden;"
  ></span>
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
  <div
    class="selected-display st-input st-select w-full"
    class:error
    class:disabled
    {name}
    on:click|stopPropagation={toggleMenu}
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
    <span class="selected-display-value" class:error class:loading-placeholder={loading}>
      {loading ? 'Loading…' : label}
    </span>
    <button type="button" class="icon st-button icon-right" aria-label={name} on:click|stopPropagation={toggleMenu}>
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
              class="st-input w-full"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={searchFilter}
              on:input={onSearchPresets}
            />
          </Input>
        </div>
        <RowVirtualizerFixed
          items={displayedOptions}
          overscan={100}
          estimatedItemHeight={36}
          maxHeight={maxListHeight}
          minWidth="{maxWidth}px"
          selectedIndex={selectedOptions.length
            ? displayedOptions.findIndex(o => o.value === selectedOptions[0].value)
            : undefined}
          let:item
          let:index
        >
          {@const displayedOption = item}
          {@const selected =
            !!selectedOptions.find(o => o.value === displayedOption.value) ||
            (!!showPlaceholderOption && selectedOptions.length === 0 && index === 0 && !displayedOption.value)}
          <MenuItem
            className="min-h-9 py-2"
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
    white-space: nowrap;
  }

  .selected-display-value.loading-placeholder {
    color: var(--st-gray-50);
  }
</style>
