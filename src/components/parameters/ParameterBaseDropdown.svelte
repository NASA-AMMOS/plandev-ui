<svelte:options immutable={true} />

<script lang="ts">
  import ParameterName from './ParameterName.svelte';
  import type { FormParameter } from '../../types/parameter.js';
  import type { ParameterType } from '../../types/parameter.js';
  import type { ActionArray } from '../../utilities/useActions.js';
  import { createEventDispatcher } from 'svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import { isActionValueSchemaWithOptions } from '../../utilities/actions';

  export const hideRightAdornments: boolean = false;

  export let allowMultiple: boolean = false;
  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let placeholder: string = '';
  export let searchPlaceholder: string = '';
  export let use: ActionArray = [];

  let columns: string = '';
  let dropdownOptions: DropdownOptions = [];
  let selectedDropdownOptions: SelectedDropdownOptionValue[] = [];

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  $: if (formParameter) {
    dropdownOptions = updateDropdownOptions();
    selectedDropdownOptions = updateDropdownSelection();
  }

  function updateDropdownOptions(): DropdownOptions {
    if (isActionValueSchemaWithOptions(formParameter.schema)) {
      return formParameter.schema.options.map(option => ({ display: option.display, value: option.value }));
    }
    return [];
  }

  function updateDropdownSelection(): SelectedDropdownOptionValue[] {
    formParameter.errors = null;
    let selected: SelectedDropdownOptionValue[] = [];
    let notFound: string[] = [];
    if (formParameter.value !== null) {
      const sequences: string[] = allowMultiple ? formParameter.value : [formParameter.value];
      sequences.forEach(sequenceName => {
        const option = dropdownOptions.find(o => o.display === sequenceName);
        if (option === undefined) {
          notFound.push(sequenceName);
        } else {
          selected.push(option.value);
        }
      });
    }

    if (dropdownOptions.length > 0 && notFound.length > 0) {
      formParameter.errors = [`'${notFound.join(`', '`)}' not found`];
    }
    return selected;
  }

  function onChange(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    selectedDropdownOptions = event.detail;
    dispatch(`change`, {
      ...formParameter,
      value: allowMultiple ? selectedDropdownOptions : selectedDropdownOptions[0],
    });
  }
</script>

<div class="parameter-base-sequence" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <SearchableDropdown
    bind:selectedOptionValues={selectedDropdownOptions}
    {allowMultiple}
    {disabled}
    options={dropdownOptions}
    placeholder={disabled ? '' : placeholder}
    {searchPlaceholder}
    on:change={onChange}
  ></SearchableDropdown>
</div>
<div class="parameter-right">
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
  .parameter-base-sequence {
    align-items: center;
    display: grid;
  }

  .parameter-base-sequence :global(.st-menu) {
    min-width: 250px;
    overflow: hidden;
  }

  .parameter-base-sequence :global(.selected-display) {
    background-color: var(--st-input-background-color);
    border: var(--st-input-border);
    color: var(--st-input-color);
  }

  .parameter-right {
    display: flex;
    gap: 2px;
    min-width: min-content;
    width: 100%;
  }
</style>
