<svelte:options immutable={true} />

<script lang="ts">
  export let setInEditor: () => void;
</script>

<div>
  <button on:click={setInEditor} class="st-button w-100"> Add Missing Arguments </button>
</div>
