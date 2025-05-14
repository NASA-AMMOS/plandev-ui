<svelte:options immutable={true} />

<script lang="ts">
  import ParameterName from './ParameterName.svelte';
  import type { FormParameter, ParameterType } from '../../types/parameter.js';
  import type { ActionArray } from '../../utilities/useActions.js';
  import { createEventDispatcher } from 'svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';
  import ParameterUnits from './ParameterUnits.svelte';
  import ParameterBaseRightAdornments from './ParameterBaseRightAdornments.svelte';
  import { userSequences } from '../../stores/sequencing';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';

  export let disabled: boolean = false;
  export let formParameter: FormParameter;
  export let hideRightAdornments: boolean = false;
  export let labelColumnWidth: number = 200;
  export let level: number = 0;
  export let levelPadding: number = 20;
  export let parameterType: ParameterType = 'activity';
  export let use: ActionArray = [];
  export let workspaceId: number | null;

  let dropdownOptions: DropdownOptions = [];
  let selectedDropdownOptions: SelectedDropdownOptionValue[] = [];

  const dispatch = createEventDispatcher<{
    change: FormParameter;
    reset: FormParameter;
  }>();

  $: columns = `calc(${labelColumnWidth}px - ${level * levelPadding}px) auto`;

  $: {
    dropdownOptions = $userSequences
      .filter(seq => workspaceId !== null && workspaceId === seq.workspace_id)
      .map(seq => ({
        display: seq.name,
        value: seq.id,
      }));

    selectedDropdownOptions = getSelectedDropdownOptionFromSequence(formParameter.value);
  }

  function getSelectedDropdownOptionFromSequence(sequencesNames: string[] | null): SelectedDropdownOptionValue[] {
    let selected: SelectedDropdownOptionValue[] = [];
    if (sequencesNames !== null) {
      sequencesNames.forEach(sequenceName => {
        const option = dropdownOptions.find(o => o.display === sequenceName);
        if (option !== undefined) {
          selected.push(option.value);
        }
      });
    }
    return selected;
  }

  function onChange(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    selectedDropdownOptions = event.detail;
    const sequences = selectedDropdownOptions.map(v => $userSequences.find(sequence => sequence.id === v));
    formParameter.value = sequences.map(s => s !== undefined && s.name);
    dispatch(`change`, formParameter);
  }
</script>

<div class="parameter-base-sequence" style="grid-template-columns: {columns}">
  <ParameterName {formParameter} />
  <SearchableDropdown
    bind:selectedOptionValues={selectedDropdownOptions}
    {disabled}
    allowMultiple={true}
    options={dropdownOptions}
    placeholder={disabled ? '' : 'Select list of sequences'}
    showPlaceholderOption={false}
    searchPlaceholder="Filter Sequences"
    on:change={onChange}
  />
  <div class="parameter-right">
    <ParameterUnits unit={formParameter.schema?.metadata?.unit?.value} />
    <ParameterBaseRightAdornments
      {disabled}
      hidden={hideRightAdornments}
      {formParameter}
      {parameterType}
      {use}
      on:reset={() => dispatch('reset', formParameter)}
    />
  </div>
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
</style>
