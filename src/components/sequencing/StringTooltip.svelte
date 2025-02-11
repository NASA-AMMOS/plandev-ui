<svelte:options immutable={true} />

<script lang="ts">
  export let message: string;
</script>

<div class="sequence-tooltip">
  <div class="container">
    {message}
  </div>
</div>

<style>
  .container {
    align-items: center;
    display: flex;
    padding: 5px;
  }
</style>
