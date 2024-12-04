<svelte:options immutable={true} />

<script lang="ts">
  import type {
    FswCommandArgumentFloat,
    FswCommandArgumentInteger,
    FswCommandArgumentNumeric,
    FswCommandArgumentUnsigned,
  } from '@nasa-jpl/aerie-ampcs';
  import {
    isFswCommandArgumentFloat,
    isFswCommandArgumentInteger,
    isFswCommandArgumentNumeric,
    isFswCommandArgumentUnsigned,
  } from '../../../utilities/codemirror/codemirror-utils';
  import Collapse from '../../Collapse.svelte';
  import CommandArgUnit from './CommandArgUnit.svelte';

  export let argDef:
    | FswCommandArgumentFloat
    | FswCommandArgumentInteger
    | FswCommandArgumentUnsigned
    | FswCommandArgumentNumeric;

  let typeDisplay: string = '';

  $: {
    if (isFswCommandArgumentFloat(argDef)) {
      typeDisplay = `Float${argDef.bit_length}`;
    } else if (isFswCommandArgumentInteger(argDef)) {
      typeDisplay = `I${argDef.bit_length}`;
    } else if (isFswCommandArgumentUnsigned(argDef)) {
      typeDisplay = `U${argDef.bit_length}`;
    } else if (isFswCommandArgumentNumeric(argDef)) {
      switch (argDef.type) {
        case 'float':
          typeDisplay = `Float${argDef.bit_length}`;
          break;
        case 'integer':
          typeDisplay = `I${argDef.bit_length}`;
          break;
        case 'unsigned':
          typeDisplay = `U${argDef.bit_length}`;
          break;
      }
    }
  }
</script>

<Collapse title={argDef.name}>
  <div>{argDef.description}</div>
  <div slot="right">
    <CommandArgUnit
      type="number"
      {typeDisplay}
      range={argDef.range ? { max: argDef.range.max, min: argDef.range.min } : undefined}
      unit={argDef.units}
    />
  </div>
</Collapse>
