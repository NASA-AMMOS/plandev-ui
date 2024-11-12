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
  // let currentSubfield = dirtyFilter.subfield;
  let currentSubfieldLabel =
    dirtyFilter.field === 'Parameter' ? `${dirtyFilter.subfield?.name} (${dirtyFilter.subfield?.type})` : '';
  let currentType: DynamicFilterDataType = 'string';
  let currentValue = dirtyFilter.value;
  let operatorKeys: (keyof typeof FilterOperator)[] = [];
  let currentValuePossibilities: Array<any> = [];

  $: if (currentField === 'Parameter' && subfields) {
    // let subfield = currentSubfield;
    // let label = '';
    // if (!currentSubfieldLabel) {
    //   label = `${dirtyFilter.subfield?.name} (${dirtyFilter.subfield?.type})`;
    // } else if (currentSubfield) {
    //   label = `${currentSubfield?.name} (${currentSubfield?.type})`;
    // }
    // const subfield = subfields.find(subfield => subfield.label === label);
    // if (subfield) {
    //   // currentSubfield = subfield;
    //   currentSubfieldLabel = subfield.label;
    //   currentType = subfield.type;
    // }
  } else {
    // currentSubfield = undefined;
    currentSubfieldLabel = '';
    operatorKeys = Object.keys(schema[currentField]) as (keyof typeof FilterOperator)[];
    currentType = (schema[currentField][currentOperator] || Object.values(schema[currentField])[0]).type;
    currentValuePossibilities = schema[currentField][currentOperator]
      ? schema[currentField][currentOperator].values
      : Object.values(schema[currentField])[0].values;
    currentValue = '';
  }

  $: if (currentField === 'Parameter' && currentSubfieldLabel !== undefined && subfields) {
    const matchingSubfield = subfields.find(subfield => subfield.label === currentSubfieldLabel) || subfields[0];
    if (matchingSubfield) {
      // Map subfield type to filter type
      currentType = matchingSubfield.type;
      if (matchingSubfield.type === 'string') {
        operatorKeys = ['includes', 'does_not_include', 'equals', 'does_not_equal'];
      } else if (matchingSubfield.type === 'int' || matchingSubfield.type === 'real') {
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

  // function getSubfieldID(subfield: Subfield) {
  //   return `${subfield.name}____${subfield.type}`;
  // }
</script>

<div class="dynamic-filter">
  <div class="st-typography-body verb">{verb}</div>
  <select class="st-select" bind:value={currentField}>
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
    <TagsInput
      options={currentValuePossibilities}
      selected={currentValueTags}
      on:change={onTagsInputChange}
      creatable={false}
    />
  {/if}
  <button on:click|stopPropagation={() => dispatch('remove')} class="st-button icon">
    <CloseIcon />
  </button>
</div>

<style>
  .dynamic-filter {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .verb {
    min-width: 40px;
    width: 40px;
  }
</style>
