<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';

  export let argDef: FswCommandArgument;
  export let value: string;
</script>

<input class="st-input w-100" spellcheck="false" bind:value title={argDef.description} disabled={true} />
