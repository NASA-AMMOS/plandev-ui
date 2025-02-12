<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import {
    ActivityLayerFilterField,
    ActivityLayerFilterField as ActivityLayerFilterFieldType,
    FilterOperator,
  } from '../../../../enums/timeline';
  import type { SelectedDropdownOptionValue } from '../../../../types/dropdown';
  import type { TagsChangeEvent } from '../../../../types/tags';
  import {
    type ActivityLayerDynamicFilter,
    type ActivityLayerFilterSubfieldSchema,
    type DynamicFilterDataType,
  } from '../../../../types/timeline';
  import { getTarget } from '../../../../utilities/generic';
  import { tooltip } from '../../../../utilities/tooltip';
  import Input from '../../../form/Input.svelte';
  import ParameterUnits from '../../../parameters/ParameterUnits.svelte';
  import SearchableDropdown from '../../../ui/SearchableDropdown.svelte';
  import TagsInput from '../../../ui/Tags/TagsInput.svelte';

  type OperatorSchema<T = any> = Record<
    keyof typeof FilterOperator,
    { type: DynamicFilterDataType; values?: Array<T> }
  >;

  export let filter: ActivityLayerDynamicFilter<any>;
  export let schema: Partial<Record<keyof typeof ActivityLayerFilterFieldType, Partial<OperatorSchema>>> & {
    Parameter?: { subfields: ActivityLayerFilterSubfieldSchema[] };
  } = {};
  export let verb: string = 'Where';

  const dispatch = createEventDispatcher<{
    change: { filter: ActivityLayerDynamicFilter<any> };
    remove: void;
  }>();

  let dirtyFilter: ActivityLayerDynamicFilter<any> = structuredClone(filter);
  let currentField: keyof typeof ActivityLayerFilterFieldType =
    dirtyFilter.field as keyof typeof ActivityLayerFilterFieldType;
  let currentOperator: keyof typeof FilterOperator | null = dirtyFilter.operator;
  let subfields: ActivityLayerFilterSubfieldSchema[] | undefined = undefined;
  let currentSubfieldLabel =
    dirtyFilter.field === 'Parameter' ? `${dirtyFilter.subfield?.name} (${dirtyFilter.subfield?.type})` : '';
  let currentType: DynamicFilterDataType = 'string';
  let currentValue = dirtyFilter.value;
  let currentValueAsStringOrNumber: string | number = '';
  let operatorKeys: (keyof typeof FilterOperator)[] = [];
  let currentUnit: string = '';
  let currentValuePossibilities: Array<any> = [];

  $: dirtyFilter = structuredClone(filter);
  $: subfields = schema.Parameter?.subfields;

  $: if (currentField !== 'Parameter') {
    currentSubfieldLabel = '';
    currentUnit = '';
    const schemaField = schema[currentField];
    if (schemaField) {
      operatorKeys = Object.keys(schemaField) as (keyof typeof FilterOperator)[];

      const firstSchemaField = Object.values(schemaField)[0];
      currentType = firstSchemaField.type;
      currentValuePossibilities = firstSchemaField.values || [];
      if (currentOperator) {
        const schemaOperator = schemaField[currentOperator];
        if (schemaOperator !== undefined) {
          currentType = schemaOperator.type;
          currentValuePossibilities = schemaOperator.values || [];
        }
      }
    }
  }

  $: if (currentField === 'Parameter' && currentSubfieldLabel !== undefined && subfields) {
    const matchingSubfield = subfields.find(subfield => subfield.label === currentSubfieldLabel);
    if (matchingSubfield) {
      // Map subfield type to filter type
      currentType = matchingSubfield.type;
      currentUnit = matchingSubfield.unit || '';
      if (matchingSubfield.type === 'string' || matchingSubfield.type === 'path') {
        operatorKeys = ['includes', 'does_not_include', 'equals', 'does_not_equal'];
      } else if (matchingSubfield.type === 'int' || matchingSubfield.type === 'real') {
        operatorKeys = ['equals', 'does_not_equal', 'is_greater_than', 'is_less_than', 'is_within', 'is_not_within'];
      } else if (matchingSubfield.type === 'duration') {
        operatorKeys = ['equals', 'does_not_equal', 'is_greater_than', 'is_less_than', 'is_within', 'is_not_within'];
      } else if (matchingSubfield.type === 'boolean') {
        operatorKeys = ['equals'];
      } else if (matchingSubfield.type === 'variant') {
        operatorKeys = ['equals', 'does_not_equal'];
        currentValuePossibilities = matchingSubfield.values || [];
      } else {
        operatorKeys = [];
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

  $: currentValueAsStringOrNumber = currentValue as string | number;

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    const newValue = Array.isArray(currentValue) ? currentValue : [];
    if (type === 'remove') {
      currentValue = (newValue as number[]).filter(tagId => tagId !== tag.id) as number[];
    } else if (type === 'select') {
      currentValue = (newValue as number[]).concat(tag.id) as number[];
    }
  }

  function onFieldChange(event: Event) {
    const { value } = getTarget(event);
    if (value) {
      // Since we changed the field we should reset the value
      currentValue = getDefaultCurrentValue();
      currentField = value as keyof typeof ActivityLayerFilterFieldType;
    }
  }

  function onSelectParameter(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    currentSubfieldLabel = event.detail.length ? event.detail[0]?.toString() ?? '' : '';
    currentValue = getDefaultCurrentValue();
    currentOperator = null;
  }

  function onSelectValue(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    currentValue = event.detail.length ? event.detail[0]?.toString() ?? '' : '';
  }

  function onOperatorChange(event: Event) {
    const { value } = getTarget(event);
    const operator = value as keyof typeof FilterOperator;
    currentOperator = operator;
    currentValue = getDefaultCurrentValue();
  }

  function onRangeInputChange(event: Event, bound: 'min' | 'max' = 'min') {
    const { value } = getTarget(event);
    if (typeof value === 'number') {
      const newValue = Array.isArray(currentValue) ? currentValue.slice() : [0, 0];
      if (bound === 'min') {
        newValue[0] = value;
      } else {
        newValue[1] = value;
      }
      currentValue = newValue;
    }
  }

  function asActivityLayerFilterField(s: string): keyof typeof ActivityLayerFilterField {
    return s as keyof typeof ActivityLayerFilterField;
  }

  function getDefaultCurrentValue() {
    if (currentOperator === 'is_within' || currentOperator === 'is_not_within') {
      return [];
    }
    return '';
  }
</script>

<div class="dynamic-filter" role="listitem">
  {#if verb}
    <div class="st-typography-body verb">{verb}</div>
  {/if}
  <select aria-label="field" class="st-select" on:change={onFieldChange} value={currentField}>
    {#each Object.keys(schema) as key}
      <option value={key}>{ActivityLayerFilterField[asActivityLayerFilterField(key)]}</option>
    {/each}
  </select>
  {#if currentField === 'Parameter' && subfields}
    <SearchableDropdown
      className="dynamic-filter-searchable-dropdown-hide-overflow"
      placeholder="Select Parameter"
      selectTooltip="Select Parameter"
      searchPlaceholder="Filter parameters"
      on:change={onSelectParameter}
      selectedOptionValues={[currentSubfieldLabel]}
      options={subfields.map(subfield => ({ display: subfield.label, value: subfield.label }))}
    >
      <ChevronDownIcon slot="icon" />
    </SearchableDropdown>
  {/if}
  <select aria-label="operator" class="st-select" value={currentOperator} on:change={onOperatorChange}>
    {#each operatorKeys as operator}
      <option value={operator}>{FilterOperator[operator]}</option>
    {/each}
  </select>
  <div class="dynamic-filter-value">
    {#if currentType === 'string' || currentType === 'path'}
      <input
        name="filter-value"
        aria-label="value"
        class="st-input w-100"
        bind:value={currentValue}
        autocomplete="off"
      />
    {:else if currentOperator === 'is_within' || currentOperator === 'is_not_within'}
      {#if Array.isArray(currentValue)}
        <div class="range-input">
          <Input class="dynamic-filter-input">
            <input
              value={currentValue[0]}
              name="filter-value-min"
              aria-label="value-min"
              class="st-input w-100"
              type="number"
              on:input={event => onRangeInputChange(event, 'min')}
              autocomplete="off"
            />
            <div class="parameter-right" slot="right">
              <ParameterUnits unit={currentUnit} />
            </div>
          </Input>
          <div class="st-typography-label">To</div>
          <Input class="dynamic-filter-input">
            <input
              value={currentValue[1]}
              name="filter-value-max"
              aria-label="value-max"
              class="st-input w-100"
              type="number"
              on:input={event => onRangeInputChange(event, 'max')}
              autocomplete="off"
            />
            <div class="parameter-right" slot="right">
              <ParameterUnits unit={currentUnit} />
            </div>
          </Input>
        </div>
      {/if}
    {:else if currentType === 'int' || currentType === 'real'}
      <Input class="dynamic-filter-input">
        <input
          name="filter-value"
          aria-label="value"
          bind:value={currentValue}
          class="st-input w-100"
          type="number"
          autocomplete="off"
        />
        <div class="parameter-right" slot="right">
          <ParameterUnits unit={currentUnit} />
        </div>
      </Input>
    {:else if currentType === 'duration'}
      <Input class="dynamic-filter-input">
        <input
          name="filter-value"
          aria-label="value"
          bind:value={currentValue}
          class="st-input w-100"
          type="number"
          autocomplete="off"
        />
        <div class="parameter-right" slot="right">
          <ParameterUnits unit="ms" />
        </div>
      </Input>
    {:else if currentType === 'boolean'}
      <select name="filter-value" aria-label="value" class="st-select w-100" bind:value={currentValue}>
        <option value={true}>True</option>
        <option value={false}>False</option>
      </select>
    {:else if currentType === 'variant'}
      <SearchableDropdown
        className="dynamic-filter-searchable-dropdown-hide-overflow"
        placeholder="Select Variant"
        selectTooltip="Select Variant"
        searchPlaceholder="Filter Variants"
        on:change={onSelectValue}
        selectedOptionValues={[currentValueAsStringOrNumber]}
        options={currentValuePossibilities.sort().map(value => ({ display: value, value }))}
      >
        <ChevronDownIcon slot="icon" />
      </SearchableDropdown>
    {:else if currentType === 'tag'}
      {@const currentValueTags = (Array.isArray(currentValue) ? currentValue : []).map(t =>
        currentValuePossibilities.find(v => v.id === t),
      )}
      <div style:width="100%">
        <TagsInput
          name="filter-value"
          options={currentValuePossibilities}
          selected={currentValueTags}
          on:change={onTagsInputChange}
          creatable={false}
        />
      </div>
    {/if}
  </div>
  <button
    aria-label="Remove filter"
    on:click|stopPropagation={() => dispatch('remove')}
    class="st-button icon"
    use:tooltip={{ content: 'Remove Filter' }}
    style="min-width: min-content"
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

  :global(.dynamic-filter-searchable-dropdown-hide-overflow) {
    min-width: 64px;
    overflow: hidden;
  }

  .dynamic-filter-value {
    flex: 1;
  }

  .range-input {
    align-items: center;
    display: flex;
    gap: 4px;
  }

  :global(.dynamic-filter-input.input.input-stacked) {
    display: grid;
    min-width: 64px;
  }
</style>
