<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgumentVarString } from '@nasa-jpl/aerie-ampcs';
  import { isQuoted, quoteEscape, unquoteUnescape } from './utils';

  export let argDef: FswCommandArgumentVarString;
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let initHadQuotes: boolean = false;
  let value: string;

  $: initHadQuotes = isQuoted(initVal);
  $: value = unquoteUnescape(initVal);

  $: {
    if (value !== unquoteUnescape(initVal)) {
      // normal case is string tokens contain quotes
      if (initHadQuotes) {
        setInEditor(quoteEscape(value));
      } else {
        setInEditor(value);
      }
    }
  }
</script>

<div>
  <input class="st-input" spellcheck="false" bind:value title={argDef.description} />
</div>

<style>
  input {
    width: 90%;
  }
</style>
