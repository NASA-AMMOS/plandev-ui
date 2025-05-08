<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgumentBoolean } from '@nasa-jpl/aerie-ampcs';
  import Collapse from '../../Collapse.svelte';
  import CommandArgUnit from './CommandArgUnit.svelte';

  export let argDef: FswCommandArgumentBoolean;
</script>

<Collapse title={argDef.name}>
  <div class="text-xs">{argDef.description}</div>
  <div slot="right">
    <CommandArgUnit
      type="boolean"
      typeDisplay="Bool"
      range={argDef.format ? { max: argDef.format.true_str, min: argDef.format.false_str } : undefined}
    />
  </div>
</Collapse>
