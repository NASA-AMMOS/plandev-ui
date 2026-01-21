<svelte:options immutable={true} />

<script lang="ts">
  export let messages: string[];
</script>

<div class="sequence-tooltip">
  {#each messages as message}
    <div class="container">
      {message}
    </div>
  {/each}
</div>

<style>
  .container {
    align-items: center;
    display: flex;
    padding: 5px;
  }
</style>
