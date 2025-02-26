<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import { isArray } from 'lodash-es';
  import { getTarget } from '../../../utilities/generic';
  import type { CommandInfoMapper } from '../../../utilities/sequence-editor/command-info-mapper';
  import {
    isFswCommandArgumentFloat,
    isFswCommandArgumentInteger,
    isFswCommandArgumentRepeat,
    isFswCommandArgumentUnsigned,
    isFswCommandArgumentVarString,
  } from '../../../utilities/sequence-editor/sequence-utils';
  import Collapse from '../../Collapse.svelte';

  export let argDef: FswCommandArgument;
  export let commandInfoMapper: CommandInfoMapper;
  export let setInEditor: (val: string) => void;
  export let argumentValueCategory: 'Literal' | 'Symbol';

  let title: string = '';
  let typeInfo: string = '';
  let formattedRange: string = '';
  let isSymbolAllowed: boolean = true;

  $: typeInfo = compactType(argDef);
  $: title = getArgTitle(argDef, typeInfo);
  $: formattedRange = formatRange(argDef);
  $: isSymbolAllowed = !isFswCommandArgumentRepeat(argDef);

  function compactType(argumentDefinition: FswCommandArgument): string {
    if (isFswCommandArgumentUnsigned(argumentDefinition)) {
      return `U${argumentDefinition.bit_length}`;
    } else if (isFswCommandArgumentInteger(argumentDefinition)) {
      return `I${argumentDefinition.bit_length}`;
    } else if (isFswCommandArgumentFloat(argumentDefinition)) {
      return `F${argumentDefinition.bit_length}`;
    } else if (isFswCommandArgumentVarString(argumentDefinition)) {
      return `String`;
    }

    return '';
  }

  function formatRange(argumentDefinition: FswCommandArgument): string {
    if ('range' in argumentDefinition && argumentDefinition.range !== null && !isArray(argumentDefinition.range)) {
      return `[${argumentDefinition.range.min} – ${argumentDefinition.range.max}]`;
    }
    return '';
  }

  function getArgTitle(argumentDefinition: FswCommandArgument, typeString: string): string {
    if (
      isFswCommandArgumentRepeat(argumentDefinition) &&
      typeof argumentDefinition.repeat?.max === 'number' &&
      typeof argumentDefinition.repeat?.min === 'number'
    ) {
      return `${argumentDefinition.name} - [${argumentDefinition.repeat?.min}, ${argumentDefinition.repeat?.max}] sets`;
    }

    const bracketedTypeInfo = typeString ? ` [${typeString}]` : '';
    const base = `${argumentDefinition.name}${bracketedTypeInfo} ${formatRange(argumentDefinition)}`;

    if ('units' in argumentDefinition) {
      return `${base} – (${argumentDefinition.units})`;
    }

    return base;
  }

  function onValueTypeChange(event: Event) {
    const { value } = getTarget(event);
    if (value === 'Literal') {
      setInEditor(commandInfoMapper.getDefaultValueForArgumentDef(argDef, {}));
    } else {
      setInEditor('VARIABLE_OR_CONSTANT_NAME');
    }
  }
</script>

<Collapse headerHeight={24} padContent={false} {title} defaultExpanded={false}>
  <div class="w-100 labeled-values" style="padding-bottom: 4px">
    {#if formattedRange}
      <div>Range</div>
      <div>{formattedRange}</div>
    {/if}

    {#if typeInfo}
      <div>Type</div>
      <div>{typeInfo}</div>
    {/if}

    {#if argDef.description}
      <div>Description</div>
      <div>
        {argDef.description}
      </div>
    {/if}

    {#if isSymbolAllowed}
      <div>Value Type</div>

      <select class="st-select" required bind:value={argumentValueCategory} on:change={onValueTypeChange}>
        <option value="Literal"> Literal </option>
        <option value="Symbol"> Symbol </option>
      </select>
    {/if}
  </div>
</Collapse>

<style>
  .labeled-values {
    align-content: center;
    align-items: top;
    column-gap: 3px;
    display: grid;
    grid-template-columns: max-content 1fr;
    row-gap: 2px;
  }

  .labeled-values > div:nth-child(odd) {
    font-weight: bold;
  }
</style>
