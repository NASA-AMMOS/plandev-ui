<svelte:options immutable={true} />

<script lang="ts">
  export let setInEditor: () => void;
</script>

<div>
  <button on:click={setInEditor} class="st-button w-full"> Add Missing Arguments </button>
</div>
