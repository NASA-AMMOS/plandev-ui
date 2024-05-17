<svelte:options immutable={true} />

<script lang="ts">
  export let initVal: string;

  export let setInEditor: () => void;
</script>

<div>
  <button on:click={setInEditor}>Remove</button>
  <span>{initVal}</span>
</div>
