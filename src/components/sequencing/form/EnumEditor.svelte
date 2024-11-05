<svelte:options immutable={true} />

<script lang="ts">
  import type { CommandDictionary, FswCommandArgumentEnum } from '@nasa-jpl/aerie-ampcs';
  import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
  import type { SelectedDropdownOptionValue } from '../../../types/dropdown';
  import { isVariableDeclaration, quoteEscape, unquoteUnescape } from '../../../utilities/codemirror/codemirror-utils';
  import SearchableDropdown from '../../ui/SearchableDropdown.svelte';

  const SEARCH_THRESHOLD = 100;
  const MAX_SEARCH_ITEMS = 1_000;

  export let argDef: FswCommandArgumentEnum | VariableDeclaration;
  export let commandDictionary: CommandDictionary | undefined = undefined;
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let enumValues: string[];
  let isValueInEnum: boolean = false;
  let value: string;

  $: value = unquoteUnescape(initVal);
  $: enumValues = getEnumValues(argDef);
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

  function getEnumValues(argDef: FswCommandArgumentEnum | VariableDeclaration): string[] {
    if (isVariableDeclaration(argDef)) {
      const varDef = argDef as VariableDeclaration;
      return (varDef.allowable_values ? varDef.allowable_values : []) as string[];
    }

    const enumDef = argDef as FswCommandArgumentEnum;
    return commandDictionary?.enumMap[enumDef.enum_name]?.values?.map(v => v.symbol) ?? enumDef.range ?? [];
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
