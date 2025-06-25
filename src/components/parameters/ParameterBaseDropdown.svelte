<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import type { FormParameter, ParameterType } from '../../types/parameter.js';
  import { isParameterWithOptions } from '../../utilities/parameters';
  import type { ActionArray } from '../../utilities/useActions.js';
  import Input from '../form/Input.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import ParameterName from './ParameterName.svelte';

  export const hideRightAdornments: boolean = false;

  export let allowMultiple: boolean = false;
  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'action';
  export let use: ActionArray = [];

  let columns: string = '';
  let dropdownOptions: DropdownOptions = [];
  let selectedDropdownOptions: SelectedDropdownOptionValue[] = [];
  let placeholder: string;
  let searchPlaceholder: string;

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  $: if (!disabled && isParameterWithOptions(formParameter.schema)) {
    dropdownOptions = formParameter.schema.options.map(option => ({ display: option.display, value: option.value }));
    placeholder = allowMultiple
      ? `Select list of ${formParameter.schema.label}s`
      : `Select ${formParameter.schema.label}`;
    searchPlaceholder = `Filter ${formParameter.schema.label}s`;
    selectedDropdownOptions = updateSelectedValueFromOptions(formParameter.value);
  }

  function updateSelectedValueFromOptions(value: any): SelectedDropdownOptionValue[] {
    if (value !== null) {
      if (allowMultiple && Array.isArray(value)) {
        const options: string[] = [];
        value.forEach(v => {
          const found = dropdownOptions.find(o => o.display === v);
          options.push(found === undefined ? v.toString() : found.value.toString());
        });
        return options;
      } else {
        const option = dropdownOptions.find(o => o.display === value);
        return option === undefined ? [value] : [option.value.toString()];
      }
    }
    return [];
  }

  function onChange(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    selectedDropdownOptions = event.detail;
    dispatch(`change`, {
      ...formParameter,
      value: allowMultiple ? selectedDropdownOptions : selectedDropdownOptions[0],
    });
  }
</script>

<div class="parameter-base-dropdown" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <!--  TODO: If disabled, use an input to avoid SearchableDropdown need to map the value to existing options, this way it can report accurately the value that it was used. Is this the endgame decision? -->
  {#if disabled}
    <Input>
      <input
        value={Array.isArray(formParameter.value) ? formParameter.value.join(', ') : formParameter.value}
        class="st-input w-full"
        class:error={formParameter.errors !== null}
        aria-label={formParameter.name}
        {disabled}
        type="text"
      />
    </Input>
  {:else}
    <SearchableDropdown
      bind:selectedOptionValues={selectedDropdownOptions}
      {allowMultiple}
      showPlaceholderOption={false}
      options={dropdownOptions}
      {placeholder}
      {searchPlaceholder}
      on:change={onChange}
    />
  {/if}
</div>

<div class="parameter-right items-center">
  <ParameterBaseRightAdornments
    {disabled}
    {formParameter}
    hidden={false}
    hideValueSource={true}
    {parameterType}
    {use}
  />
</div>

<style>
  .parameter-base-dropdown {
    align-items: center;
    display: grid;
  }

  .parameter-right {
    display: flex;
    gap: 2px;
    min-width: min-content;
    width: 100%;
  }
</style>
