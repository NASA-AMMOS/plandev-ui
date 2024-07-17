<svelte:options immutable={true} />

<script lang="ts">
  // This uses JS number to represents arguments

  // ("+" | "-")? (@digit ("_" | @digit)* ("." ("_" | @digit)*)? | "." @digit ("_" | @digit)*)
  // (("e" | "E") ("+" | "-")? ("_" | @digit)+)? |
  // @digit ("_" | @digit)* "n" |

  import { isFswCommandArgumentUnsigned, type NumberArg } from './../../../utilities/codemirror/codemirror-utils';

  export let argDef: NumberArg;
  export let initVal: number;
  export let setInEditor: (val: number) => void;

  let max: number = Infinity;
  let min: number = -Infinity;
  let value: number;

  $: max = argDef.range?.max ?? Infinity;
  $: min = argDef.range?.min ?? (isFswCommandArgumentUnsigned(argDef) ? 0 : -Infinity);
  $: value = initVal;
  $: valFloat = Number(value);
  $: {
    if (typeof value === 'number' && !isNaN(valFloat)) {
      setInEditor(value);
    }
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
