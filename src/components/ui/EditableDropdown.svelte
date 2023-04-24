<svelte:options immutable={true} />

<script lang="ts">
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import SaveIcon from '@nasa-jpl/stellar/icons/save.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import { upperFirst } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import type { DropdownOption, DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import { getTarget } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import SearchableDropdown from './SearchableDropdown.svelte';

  export let canSaveOver: boolean = false;
  export let disabled: boolean = false;
  export let error: string | undefined = undefined;
  export let options: DropdownOptions = [];
  export let optionLabel: string = 'Option';
  export let placeholder: string = '';
  export let selectedOptionValue: SelectedDropdownOptionValue | undefined = undefined;
  export let showPlaceholderOption: boolean = true;
  export let searchPlaceholder: string = `Search ${upperFirst(optionLabel)}s`;
  export let settingsIconTooltip: string = `Set ${upperFirst(optionLabel)}`;
  export let settingsIconTooltipPlacement: string = 'top';

  const dispatch = createEventDispatcher();

  let isOptionNameChanged: boolean = false;
  let isOptionNameDuped: boolean = false;
  let optionName: string = '';
  let requireUniqueDisplayNames: boolean = true;
  let searchableDropdown: SearchableDropdown;
  let selectedOption: DropdownOption | undefined;

  $: selectedOption = options.find(option => option.value === selectedOptionValue);
  $: isOptionNameChanged = !!optionName && optionName !== selectedOption?.display;
  $: isOptionNameDuped = !isOptionNameChanged
    ? false
    : options.reduce((previousValue: boolean, dropdownOption: DropdownOption) => {
        return previousValue || dropdownOption.display === optionName;
      }, false);

  function getSaveNewTooltip(inputText: string) {
    if (requireUniqueDisplayNames) {
      if (!inputText || !isOptionNameChanged) {
        return `Enter a unique name for the new ${optionLabel.toLowerCase()}`;
      }

      if (isOptionNameDuped) {
        return `You must enter a unique ${optionLabel.toLowerCase()} name`;
      }
    } else if (!inputText) {
      return `Enter a name for the new ${optionLabel.toLowerCase()}`;
    }

    return `Save as new ${optionLabel.toLowerCase()}`;
  }

  function getSaveTooltip(inputText: string) {
    if (requireUniqueDisplayNames && isOptionNameDuped && inputText !== selectedOption?.display) {
      return `You must enter a unique ${optionLabel.toLowerCase()} name`;
    }

    return 'Save changes';
  }

  function onDeleteOption() {
    if (selectedOption) {
      dispatch('deleteOption', selectedOption.value);
      searchableDropdown.hideMenu();
    }
  }

  function onOpenMenu() {
    optionName = selectedOption?.display ?? '';
  }

  function onSaveNewOption() {
    if (optionName && isOptionNameChanged && !isOptionNameDuped) {
      dispatch('saveNewOption', optionName);
      searchableDropdown.hideMenu();
    }
  }

  function onSaveOption() {
    if (optionName && selectedOption && !isOptionNameDuped) {
      dispatch('saveOption', {
        display: optionName,
        value: selectedOption.value,
      } as DropdownOption);
      searchableDropdown.hideMenu();
    }
  }

  function onUpdateOptionName(event: Event) {
    const { value } = getTarget(event);
    optionName = `${value}`;
  }
</script>

<SearchableDropdown
  bind:this={searchableDropdown}
  {disabled}
  {error}
  {options}
  {placeholder}
  {searchPlaceholder}
  {selectedOptionValue}
  {settingsIconTooltip}
  {settingsIconTooltipPlacement}
  {showPlaceholderOption}
  on:openMenu={onOpenMenu}
  on:selectOption
>
  <svelte:fragment slot="dropdown-header">
    <div class="dropdown-header">
      <input
        class="st-input w-100"
        placeholder={`Enter ${optionLabel.toLowerCase()} name`}
        value={optionName}
        on:input={onUpdateOptionName}
      />
      <button
        use:tooltip={{
          content: getSaveNewTooltip(optionName),
          placement: 'top',
        }}
        class="icon st-button"
        class:disabled={!optionName || !isOptionNameChanged || isOptionNameDuped}
        on:click|stopPropagation={onSaveNewOption}
      >
        <PlusIcon />
      </button>
      <button
        use:tooltip={{ content: getSaveTooltip(optionName), placement: 'top' }}
        class="icon st-button"
        class:disabled={isOptionNameDuped}
        disabled={!(!!selectedOption && (isOptionNameChanged || canSaveOver))}
        on:click|stopPropagation={onSaveOption}
      >
        <SaveIcon />
      </button>
      <button
        use:tooltip={{ content: `Delete ${optionLabel.toLowerCase()}`, placement: 'top' }}
        class="icon st-button"
        disabled={!selectedOption || isOptionNameChanged}
        on:click|stopPropagation={onDeleteOption}
      >
        <TrashIcon />
      </button>
    </div>
  </svelte:fragment>
</SearchableDropdown>

<style>
  .st-button.disabled {
    cursor: not-allowed;
    opacity: var(--st-button-disabled-opacity);
  }

  .dropdown-header {
    column-gap: 6px;
    display: grid;
    grid-template-columns: auto repeat(3, 16px);
  }
</style>
