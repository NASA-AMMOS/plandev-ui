<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary, FswCommandArgumentEnum } from '@nasa-jpl/aerie-ampcs';
  import type { SelectedDropdownOptionValue } from '../../../types/dropdown';
  import { quoteEscape, unquoteUnescape } from '../../../utilities/codemirror/codemirror-utils';
  import SearchableDropdown from '../../ui/SearchableDropdown.svelte';

  const SEARCH_THRESHOLD = 100;
  const MAX_SEARCH_ITEMS = 1_000;

  export let argDef: FswCommandArgumentEnum;
  export let commandDictionary: CommandDictionary;
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let enumValues: string[];
  let isValueInEnum: boolean = false;
  let value: string;

  $: value = unquoteUnescape(initVal);
  $: enumValues = commandDictionary.enumMap[argDef.enum_name]?.values?.map(v => v.symbol) ?? argDef.range ?? [];
  $: isValueInEnum = !!enumValues.find(ev => ev === value);
  $: {
    setInEditor(quoteEscape(value));
  }
  $: options = enumValues.map(ev => ({
    display: ev,
    value: ev,
  }));
  $: selectedOptionValue = value;

  function onSelectReferenceModel(event: CustomEvent<SelectedDropdownOptionValue>) {
    const { detail: enumVal } = event;
    if (typeof enumVal === 'string') {
      setInEditor(quoteEscape(enumVal));
    }
  }
</script>

<div>
  {#if enumValues.length > SEARCH_THRESHOLD}
    <SearchableDropdown
      {options}
      maxItems={MAX_SEARCH_ITEMS}
      on:selectOption={onSelectReferenceModel}
      {selectedOptionValue}
      placeholder={value}
      searchPlaceholder="Filter values"
    />
  {:else}
    <select class="st-select w-100" required bind:value>
      {#if !isValueInEnum}
        <option>{value}</option>
      {/if}
      {#each enumValues as ev}
        <option>{ev}</option>
      {/each}
    </select>
  {/if}
</div>
