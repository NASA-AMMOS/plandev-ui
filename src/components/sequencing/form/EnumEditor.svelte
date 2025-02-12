<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary, FswCommandArgumentEnum } from '@nasa-jpl/aerie-ampcs';
  import type { SelectedDropdownOptionValue } from '../../../types/dropdown';
  import SearchableDropdown from '../../ui/SearchableDropdown.svelte';

  const SEARCH_THRESHOLD = 100;

  export let argDef: FswCommandArgumentEnum;
  export let commandDictionary: CommandDictionary | null = null;
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let enumValues: string[];
  let isValueInEnum: boolean = false;
  let value: string;

  $: value = initVal;
  $: enumValues = argDef.range ?? commandDictionary?.enumMap[argDef.enum_name]?.values?.map(v => v.symbol) ?? [];
  $: isValueInEnum = !!enumValues.find(ev => ev === value);
  $: setInEditor(value);
  $: options = enumValues.map(ev => ({
    display: ev,
    value: ev,
  }));
  $: selectedOptionValues = [value];

  function onSelectReferenceModel(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    const { detail: values } = event;
    if (typeof values[0] === 'string') {
      setInEditor(values[0]);
    }
  }
</script>

<div>
  {#if enumValues.length > SEARCH_THRESHOLD}
    <SearchableDropdown
      {options}
      on:change={onSelectReferenceModel}
      {selectedOptionValues}
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
