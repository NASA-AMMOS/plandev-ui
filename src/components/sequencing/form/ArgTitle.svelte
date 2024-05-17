<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import {
    isFswCommandArgumentFloat,
    isFswCommandArgumentInteger,
    isFswCommandArgumentRepeat,
    isFswCommandArgumentUnsigned,
    isFswCommandArgumentVarString,
  } from './utils';

  export let argDef: FswCommandArgument;

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
    const base = `${argDef.name}${compactTypeInfo}`;
    if ('units' in argDef) {
      return `${base} - (${argDef.units})`;
    }
    return base;
  }
</script>

<details>
  <summary>{getArgTitle(argDef)}</summary>
  {argDef.description}
</details>
