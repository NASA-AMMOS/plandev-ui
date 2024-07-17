<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import { isArray } from 'lodash-es';
  import Collapse from '../../Collapse.svelte';
  import {
    isFswCommandArgumentFloat,
    isFswCommandArgumentInteger,
    isFswCommandArgumentRepeat,
    isFswCommandArgumentUnsigned,
    isFswCommandArgumentVarString,
  } from './../../../utilities/codemirror/codemirror-utils';

  export let argDef: FswCommandArgument;

  $: title = getArgTitle(argDef);

  function compactType(argDef: FswCommandArgument) {
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

  function getArgTitle(argDef: FswCommandArgument) {
    if (
      isFswCommandArgumentRepeat(argDef) &&
      typeof argDef.repeat?.max === 'number' &&
      typeof argDef.repeat?.min === 'number'
    ) {
      return `${argDef.name} - [${argDef.repeat?.min}, ${argDef.repeat?.max}] sets`;
    }

    let compactTypeInfo = compactType(argDef);
    if (compactTypeInfo) {
      compactTypeInfo = ` [${compactTypeInfo}]`;
    }
    let base = `${argDef.name}${compactTypeInfo}`;
    if ('range' in argDef && argDef.range) {
      if (isArray(argDef.range)) {
        base += ` [${argDef.range.join(', ')}]`;
      } else {
        base += ` [${argDef.range.min} – ${argDef.range.max}]`;
      }
    }

    if ('units' in argDef) {
      return `${base} – (${argDef.units})`;
    }

    return base;
  }
</script>

<Collapse headerHeight={24} padContent={false} {title} defaultExpanded={false}>
  <div style="padding-bottom: 4px">
    {argDef.description}
  </div>
</Collapse>
