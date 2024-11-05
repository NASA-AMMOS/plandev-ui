<svelte:options immutable={true} />

<script lang="ts">
  import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
  // This uses JS number to represents arguments

  // ("+" | "-")? (@digit ("_" | @digit)* ("." ("_" | @digit)*)? | "." @digit ("_" | @digit)*)
  // (("e" | "E") ("+" | "-")? ("_" | @digit)+)? |
  // @digit ("_" | @digit)* "n" |

  import {
    isFswCommandArgumentUnsigned,
    isVariableDeclaration,
    type NumberArg,
  } from './../../../utilities/codemirror/codemirror-utils';

  export let argDef: NumberArg | VariableDeclaration;
  export let initVal: number;
  export let setInEditor: (val: number) => void;

  let max: number = Infinity;
  let min: number = -Infinity;
  let value: number;

  $: max = findMax(argDef);
  $: min = findMin(argDef);
  $: value = initVal;
  $: valFloat = Number(value);
  $: {
    if (typeof value === 'number' && !isNaN(valFloat)) {
      setInEditor(value);
    }
  }

  function findMax(argDef: NumberArg | VariableDeclaration): number {
    if (isVariableDeclaration(argDef)) {
      const varDef = argDef as VariableDeclaration;
      return varDef && varDef.allowable_ranges
        ? varDef.allowable_ranges?.reduce((acc, current) => Math.max(acc, current.max), 0)
        : Infinity;
    }
    const numDef = argDef as NumberArg;
    return numDef.range?.max ?? Infinity;
  }

  function findMin(argDef: NumberArg | VariableDeclaration): number {
    if (isVariableDeclaration(argDef)) {
      const varDef = argDef as VariableDeclaration;
      return varDef && varDef.allowable_ranges
        ? varDef.allowable_ranges?.reduce((acc, current) => Math.min(acc, current.min), 0)
        : ((argDef.type === 'UINT' ? 0 : -Infinity) as number);
    }
    const numDef = argDef as NumberArg;
    return argDef.range?.min ?? (isFswCommandArgumentUnsigned(numDef) ? 0 : -Infinity);
  }
</script>

<div>
  <input class="st-input w-100" type="number" bind:value required {min} {max} step="any" />
  {#if typeof min === 'number' && typeof max === 'number' && (valFloat < min || valFloat > max)}
    <button style="margin-top: 4px" class="st-button" on:click={() => setInEditor(max)} title="Set to allowed value">
      Set to maximum: {max}
    </button>
  {/if}
</div>

<style>
  input:invalid {
    color: red;
  }
</style>
