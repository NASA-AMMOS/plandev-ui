<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgumentEnum } from '@nasa-jpl/aerie-ampcs';
  import Collapse from '../../Collapse.svelte';
  import CommandArgUnit from './CommandArgUnit.svelte';

  export let argDef: FswCommandArgumentEnum;

  let enumValues: string = '';

  $: enumValues = argDef.range?.join('\n') ?? '';
</script>

<Collapse title={argDef.name}>
  <div>{argDef.description}</div>
  <div>
    <textarea class="enum-values" disabled>{enumValues}</textarea>
  </div>
  <div slot="right">
    <CommandArgUnit type="enum" unitShortName="enum" />
  </div>
</Collapse>

<style>
  .enum-values {
    color: var(--st-gray-100);
  }
</style>
