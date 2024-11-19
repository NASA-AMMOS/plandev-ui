<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import { isArray } from 'lodash-es';
  import type { CommandInfoMapper } from '../../../utilities/codemirror/commandInfoMapper';
  import { getTarget } from '../../../utilities/generic';
  import Collapse from '../../Collapse.svelte';
  import {
    isFswCommandArgumentFloat,
    isFswCommandArgumentInteger,
    isFswCommandArgumentRepeat,
    isFswCommandArgumentUnsigned,
    isFswCommandArgumentVarString,
  } from './../../../utilities/codemirror/codemirror-utils';

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

  function compactType(argDef: FswCommandArgument): string {
    if (isFswCommandArgumentUnsigned(argDef)) {
      return `U${argDef.bit_length}`;
    } else if (isFswCommandArgumentInteger(argDef)) {
      return `I${argDef.bit_length}`;
    } else if (isFswCommandArgumentFloat(argDef)) {
      return `F${argDef.bit_length}`;
    } else if (isFswCommandArgumentVarString(argDef)) {
      return `String`;
    }

    return '';
  }

  function formatRange(argDef: FswCommandArgument): string {
    if ('range' in argDef && argDef.range !== null && !isArray(argDef.range)) {
      return `[${argDef.range.min} – ${argDef.range.max}]`;
    }
    return '';
  }

  function getArgTitle(argDef: FswCommandArgument, typeInfo: string): string {
    if (
      isFswCommandArgumentRepeat(argDef) &&
      typeof argDef.repeat?.max === 'number' &&
      typeof argDef.repeat?.min === 'number'
    ) {
      return `${argDef.name} - [${argDef.repeat?.min}, ${argDef.repeat?.max}] sets`;
    }

    const bracketedTypeInfo = typeInfo && ` [${typeInfo}]`;
    const base = `${argDef.name}${bracketedTypeInfo} ${formatRange(argDef)}`;

    if ('units' in argDef) {
      return `${base} – (${argDef.units})`;
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
