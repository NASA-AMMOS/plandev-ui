<svelte:options immutable={true} />

<script lang="ts">
  // This uses JS number to represents arguments

  // ("+" | "-")? (@digit ("_" | @digit)* ("." ("_" | @digit)*)? | "." @digit ("_" | @digit)*)
  // (("e" | "E") ("+" | "-")? ("_" | @digit)+)? |
  // @digit ("_" | @digit)* "n" |

  import { isFswCommandArgumentUnsigned, type NumberArg } from '../../../utilities/codemirror/codemirror-utils';

  // const PAT_INT = "^[-+]?\\d+$";
  // const PAT_FLOAT = "^[-+]?\\d+\.?\\d*$";

  export let argDef: NumberArg;
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let max: number = Infinity;
  let min: number = -Infinity;
  let value: string;

  // $: pattern = isFswCommandArgumentUnsigned(argDef) ? PAT_INT : PAT_FLOAT;

  $: max = argDef.range?.max ?? Infinity;
  $: min = argDef.range?.min ?? (isFswCommandArgumentUnsigned(argDef) ? 0 : -Infinity);
  $: value = initVal;
  $: valFloat = Number(value);
  $: {
    if (value && !isNaN(valFloat)) {
      setInEditor(value);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function customValidate(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
    // const val = (e.target as HTMLInputElement).value;
    const numVal = Number(value);
    if (numVal < min) {
      (e.target as HTMLInputElement).setCustomValidity('value is too low');
    } else if (numVal > max) {
      (e.target as HTMLInputElement).setCustomValidity('value is too low');
    } else {
      (e.target as HTMLInputElement).setCustomValidity('');
    }
  }
</script>

<div>
  <input class="st-input" type="string" bind:value required />
  <!-- {pattern} -->
  <!-- on:input={customValidate} -->
  {#if typeof min === 'number' && typeof max === 'number' && min === max && valFloat !== max}
    <button on:click={() => setInEditor(max.toString())} title="Set to allowed value">{max}</button>
  {/if}
</div>

<style>
  input {
    width: 90%;
  }

  input:invalid {
    color: red;
  }
</style>
