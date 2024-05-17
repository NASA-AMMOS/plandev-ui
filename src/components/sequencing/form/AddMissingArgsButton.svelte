<svelte:options immutable={true} />

<script lang="ts">
  export let setInEditor: () => void;
</script>

<div>
  <button on:click={setInEditor}> Add Missing Arguments </button>
</div>
