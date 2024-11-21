<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { TagsChangeEvent } from '../../../../types/tags';
  import {
    type ActivityLayerDynamicFilter,
    type DynamicFilterDataType,
    ActivityLayerFilterField as ActivityLayerFilterFieldType,
    FilterOperator,
  } from '../../../../types/timeline';
  import { getTarget } from '../../../../utilities/generic';
  import { tooltip } from '../../../../utilities/tooltip';
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
  let subfields: SubfieldSchema[] | null = schema.Parameter?.subfields || null;
  let currentSubfieldLabel =
    dirtyFilter.field === 'Parameter' ? `${dirtyFilter.subfield?.name} (${dirtyFilter.subfield?.type})` : '';
  let currentType: DynamicFilterDataType = 'string';
  let currentValue = dirtyFilter.value;
  let operatorKeys: (keyof typeof FilterOperator)[] = [];
  let currentValuePossibilities: Array<any> = [];

  $: if (currentField !== 'Parameter') {
    currentSubfieldLabel = '';
    operatorKeys = Object.keys(schema[currentField]) as (keyof typeof FilterOperator)[];
    currentType = (schema[currentField][currentOperator] || Object.values(schema[currentField])[0]).type;
    // TODO filter to only the types included
    // TODO value possibilities should be the union of all of the variants in case foo.A and bar.A have diff variants of the same type
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
        operatorKeys = ['equals', 'does_not_equal', 'greater_than', 'less_than'];
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
    dispatch('change', { filter: newFilter });
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
</script>

<div class="dynamic-filter">
  <div class="st-typography-body verb">{verb}</div>
  <select class="st-select" on:change={onFieldChange} value={currentField}>
    {#each Object.keys(schema) as key}
      <option value={key}>{key}</option>
    {/each}
  </select>
  {#if currentField === 'Parameter' && subfields}
    <select class="st-select" bind:value={currentSubfieldLabel}>
      {#each subfields as subfield}
        <option value={subfield.label}>{subfield.label}</option>
      {/each}
    </select>
  {/if}
  <select class="st-select" bind:value={currentOperator}>
    {#each operatorKeys as operator}
      <option value={operator}>{FilterOperator[operator]}</option>
    {/each}
  </select>
  {#if currentType === 'string'}
    <input class="st-input w-100" bind:value={currentValue} />
  {:else if currentType === 'int' || currentType === 'real'}
    <input class="st-input w-100" type="number" bind:value={currentValue} />
  {:else if currentType === 'boolean'}
    <select class="st-select w-100" bind:value={currentValue}>
      <option value={true}>True</option>
      <option value={false}>False</option>
    </select>
  {:else if currentType === 'variant'}
    <select class="st-select w-100" bind:value={currentValue}>
      {#each currentValuePossibilities as value}
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
</style>
