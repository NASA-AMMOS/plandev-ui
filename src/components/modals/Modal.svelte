<svelte:options immutable={true} />

<script lang="ts">
  export let height = 350;
  export let width = 400;
</script>

<div class="modal-container">
  <div class="modal" style:height={`${height}px`} style:width={`${width}px`} on:click|stopPropagation>
    <slot />
  </div>
</div>

<style>
  .modal-container {
    align-items: center;
    background-color: #00000052;
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 999;
  }

  .modal {
    background-color: var(--st-primary-background-color);
    border-radius: 4px;
    color: var(--st-primary-text-color);
    display: flex;
    flex-direction: column;
    font-family: Inter, Roboto;
    font-size: 12px;
    font-weight: 300;
    justify-content: space-evenly;
    min-height: 150px;
    text-align: left;
    z-index: 1000;
  }
</style>
