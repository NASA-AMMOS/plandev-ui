<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { SelectedDropdownOptionValue } from '../../../../types/dropdown';
  import type { TagsChangeEvent } from '../../../../types/tags';
  import {
    type ActivityLayerDynamicFilter,
    type DynamicFilterDataType,
    ActivityLayerFilterField as ActivityLayerFilterFieldType,
    FilterOperator,
  } from '../../../../types/timeline';
  import { getTarget } from '../../../../utilities/generic';
  import { tooltip } from '../../../../utilities/tooltip';
  import SearchableDropdown from '../../../ui/SearchableDropdown.svelte';
  import TagsInput from '../../../ui/Tags/TagsInput.svelte';

  type Subfield = { name: string; type: DynamicFilterDataType };
  type SubfieldSchema = Subfield & { label: string; values?: string[] };
  type OperatorSchema<T = any> = Record<
    keyof typeof FilterOperator,
    { type: DynamicFilterDataType; values?: Array<T> }
  >;

  export let filter: ActivityLayerDynamicFilter<any>;
  export let schema: Partial<
    | Record<keyof typeof ActivityLayerFilterFieldType, Partial<OperatorSchema>>
    | { Parameter: { subfields: SubfieldSchema[] } }
  > = {};
  export let verb: string = 'Where';

  const dispatch = createEventDispatcher<{
    change: { filter: ActivityLayerDynamicFilter<any> };
    remove: void;
  }>();

  let dirtyFilter = structuredClone(filter);
  let currentField = dirtyFilter.field as keyof typeof ActivityLayerFilterFieldType;
  let currentOperator: keyof typeof FilterOperator | null = dirtyFilter.operator;
  let subfields: SubfieldSchema[] | null = null;
  let currentSubfieldLabel =
    dirtyFilter.field === 'Parameter' ? `${dirtyFilter.subfield?.name} (${dirtyFilter.subfield?.type})` : '';
  let currentType: DynamicFilterDataType = 'string';
  let currentValue = dirtyFilter.value;
  let operatorKeys: (keyof typeof FilterOperator)[] = [];
  let currentValuePossibilities: Array<any> = [];

  $: subfields = schema.Parameter?.subfields;

  $: if (currentField !== 'Parameter') {
    currentSubfieldLabel = '';
    operatorKeys = Object.keys(schema[currentField]) as (keyof typeof FilterOperator)[];
    currentType = (schema[currentField][currentOperator] || Object.values(schema[currentField])[0]).type;
    currentValuePossibilities = schema[currentField][currentOperator]
      ? schema[currentField][currentOperator].values
      : Object.values(schema[currentField])[0].values;
  }

  $: if (currentField === 'Parameter' && currentSubfieldLabel !== undefined && subfields) {
    const matchingSubfield = subfields.find(subfield => subfield.label === currentSubfieldLabel) || subfields[0];
    if (matchingSubfield) {
      // Map subfield type to filter type
      currentType = matchingSubfield.type;
      if (matchingSubfield.type === 'string') {
        operatorKeys = ['includes', 'does_not_include', 'equals', 'does_not_equal'];
      } else if (matchingSubfield.type === 'int' || matchingSubfield.type === 'real') {
        operatorKeys = ['equals', 'does_not_equal', 'is_greater_than', 'is_less_than', 'is_within', 'is_not_within'];
      } else if (matchingSubfield.type === 'boolean') {
        operatorKeys = ['equals', 'does_not_equal'];
      } else if (matchingSubfield.type === 'variant') {
        operatorKeys = ['equals', 'does_not_equal'];
        currentValuePossibilities = matchingSubfield.values || [];
      } else {
        // Choose first possible or.. none?
      }
    }
  }

  $: if (currentField && currentOperator && currentValue !== undefined) {
    const newFilter: ActivityLayerDynamicFilter<any> = {
      field: currentField,
      id: dirtyFilter.id,
      operator: currentOperator,
      value: currentValue,
    };
    if (currentSubfieldLabel) {
      const matchingSubfield = (subfields || []).find(subfield => subfield.label === currentSubfieldLabel);
      if (matchingSubfield) {
        newFilter.subfield = { name: matchingSubfield.name, type: matchingSubfield.type };
      }
    }
    // Make sure the filter is different before dispatching a change
    // since svelte reactivity will run this statement when subfields changes
    if (JSON.stringify(newFilter) !== JSON.stringify(filter)) {
      dispatch('change', { filter: newFilter });
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    let newValue = Array.isArray(currentValue) ? currentValue : [];
    if (type === 'remove') {
      currentValue = newValue.filter(tagId => tagId !== tag.id) as number[];
    } else if (type === 'select') {
      currentValue = newValue.concat(tag.id) as number[];
    }
  }

  function onFieldChange(event: Event) {
    const { value } = getTarget(event);
    if (value) {
      // Since we changed the field we should reset the value
      // TODO should we reset more bits than this?
      currentValue = '';
      currentField = value as keyof typeof ActivityLayerFilterFieldType;
    }
  }

  function onSelectParameter(event: CustomEvent<SelectedDropdownOptionValue>) {
    currentSubfieldLabel = event.detail?.toString() || '';
    currentValue = '';
  }

  function onOperatorChange(event: Event) {
    const { value } = getTarget(event);
    const operator = value as keyof typeof FilterOperator;
    if (operator === 'is_within' || operator === 'is_not_within') {
      currentValue = [];
    } else {
      currentValue = '';
    }
    currentOperator = operator;
  }

  function onRangeInputChange(event: Event, bound: 'min' | 'max' = 'min') {
    const { value } = getTarget(event);
    if (typeof value === 'number') {
      let newValue = Array.isArray(currentValue) ? currentValue.slice() : [0, 0];
      if (bound === 'min') {
        newValue[0] = value;
      } else {
        newValue[1] = value;
      }
      currentValue = newValue;
    }
  }
</script>

<div class="dynamic-filter">
  <div class="st-typography-body verb">{verb}</div>
  <select class="st-select" on:change={onFieldChange} value={currentField}>
    {#each Object.keys(schema) as key}
      <option value={key}>{key}</option>
    {/each}
  </select>
  {#if currentField === 'Parameter' && subfields}
    <div class="dynamic-filter-searchable-dropdown">
      <SearchableDropdown
        placeholder="Select Parameter"
        iconTooltip="Select Parameter"
        searchPlaceholder="Filter parameters"
        on:selectOption={onSelectParameter}
        selectedOptionValue={currentSubfieldLabel}
        options={subfields.map(subfield => ({ display: subfield.label, value: subfield.label }))}
      >
        <ChevronDownIcon slot="icon" />
      </SearchableDropdown>
    </div>
  {/if}
  <select class="st-select" value={currentOperator} on:change={onOperatorChange}>
    {#each operatorKeys as operator}
      <option value={operator}>{FilterOperator[operator]}</option>
    {/each}
  </select>
  <div class="dynamic-filter-value">
    {#if currentType === 'string'}
      <input class="st-input w-100" bind:value={currentValue} />
    {:else if currentOperator === 'is_within' || currentOperator === 'is_not_within'}
      {#if Array.isArray(currentValue)}
        <div class="range-input">
          <input class="st-input w-100" type="number" on:change={event => onRangeInputChange(event, 'min')} />
          <div class="st-typography-label">To</div>
          <input class="st-input w-100" type="number" on:change={event => onRangeInputChange(event, 'max')} />
        </div>
      {/if}
    {:else if currentType === 'int' || currentType === 'real'}
      <input class="st-input w-100" type="number" bind:value={currentValue} />
    {:else if currentType === 'boolean'}
      <select class="st-select w-100" bind:value={currentValue}>
        <option value={true}>True</option>
        <option value={false}>False</option>
      </select>
    {:else if currentType === 'variant'}
      <select class="st-select w-100" bind:value={currentValue}>
        {#each currentValuePossibilities.sort() as value}
          <option {value}>{value}</option>
        {/each}
      </select>
    {:else if currentType === 'tag'}
      {@const currentValueTags = (Array.isArray(currentValue) ? currentValue : []).map(t =>
        currentValuePossibilities.find(v => v.id === t),
      )}
      <!-- TODO not positioning correctly -->
      <div style:width="100%">
        <TagsInput
          options={currentValuePossibilities}
          selected={currentValueTags}
          on:change={onTagsInputChange}
          creatable={false}
        />
      </div>
    {/if}
  </div>
  <button
    on:click|stopPropagation={() => dispatch('remove')}
    class="st-button icon"
    use:tooltip={{ content: 'Remove Filter' }}
  >
    <CloseIcon />
  </button>
</div>

<style>
  .dynamic-filter {
    align-items: center;
    display: flex;
    gap: 8px;
    min-height: 26px;
  }

  .verb {
    min-width: 40px;
    width: 40px;
  }

  .dynamic-filter-searchable-dropdown {
    overflow: hidden;
  }

  .dynamic-filter-value {
    flex: 1;
    min-width: 40px;
  }

  .range-input {
    align-items: center;
    display: flex;
    gap: 4px;
  }
</style>
