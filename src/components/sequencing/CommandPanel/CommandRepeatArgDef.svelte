<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgumentRepeat } from '@nasa-jpl/aerie-ampcs';
  import Collapse from '../../Collapse.svelte';
  import CommandArg from './CommandArg.svelte';
  import CommandArgUnit from './CommandArgUnit.svelte';

  export let argDef: FswCommandArgumentRepeat;
</script>

<Collapse title={argDef.name}>
  <div>{argDef.description}</div>
  <div>
    {#each argDef.repeat?.arguments ?? [] as childArgumentDefinition}
      {#if childArgumentDefinition}
        <CommandArg commandArgumentDefinition={childArgumentDefinition} />
      {/if}
    {/each}
  </div>
  <div slot="right">
    <CommandArgUnit
      range={argDef.repeat ? { max: `${argDef.repeat.max}`, min: `${argDef.repeat.min}` } : undefined}
      type="repeat"
      unit="Sets"
    />
  </div>
</Collapse>
