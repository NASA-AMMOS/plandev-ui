<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import { isFswCommandArgumentRepeat } from './utils';

  export let argDef: FswCommandArgument;

  function getArgTitle(argDef: FswCommandArgument) {
    if ('units' in argDef) {
      return `${argDef.name} - (${argDef.units})`;
    } else if (
      isFswCommandArgumentRepeat(argDef) &&
      typeof argDef.repeat?.max === 'number' &&
      typeof argDef.repeat?.min === 'number'
    ) {
      return `${argDef.name} - [${argDef.repeat?.min}, ${argDef.repeat?.max}] sets`;
    }
    return argDef.name;
  }
</script>

<details>
  <summary>{getArgTitle(argDef)}</summary>
  {argDef.description}
</details>
