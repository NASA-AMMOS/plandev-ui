<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgumentBoolean } from '@nasa-jpl/aerie-ampcs';

  export let argDef: FswCommandArgumentBoolean;
  export let initVal: string;
  export let setInEditor: (val: string) => void;

  let value: string;
  $: value = initVal;
  $: {
    setInEditor(value);
  }
</script>

<div>
  <select class="st-select w-100" required bind:value title={argDef.description}>
    {#each ['false', 'true'] as ev}
      <option>{ev}</option>
    {/each}
  </select>
</div>
