<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgumentFixedString, FswCommandArgumentVarString } from '@nasa-jpl/aerie-ampcs';
  import { isFswCommandArgumentVarString } from '../../../utilities/sequence-editor/sequence-utils';
  import Collapse from '../../Collapse.svelte';
  import CommandArgUnit from './CommandArgUnit.svelte';

  export let argDef: FswCommandArgumentVarString | FswCommandArgumentFixedString;
</script>

<Collapse title={argDef.name}>
  <div>{argDef.description}</div>
  <div slot="right">
    <CommandArgUnit
      type="string"
      typeDisplay={`string${isFswCommandArgumentVarString(argDef) ? `(${argDef.max_bit_length})` : ''}`}
    />
  </div>
</Collapse>
