<svelte:options immutable={true} />

<script lang="ts">
  export let height: number | string = 350;
  export let width: number | string = 400;

  $: heightStyle = typeof height === 'number' ? `${height}px` : height;
  $: widthStyle = typeof width === 'number' ? `${width}px` : width;
</script>

<div id="modal-container">
  <div class="modal st-typography-body" role="none" style:height={heightStyle} style:width={widthStyle}>
    <slot />
  </div>
</div>

<style>
  #modal-container {
    align-items: center;
    background-color: #00000052;
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 9999;
  }

  .modal {
    background-color: var(--st-primary-background-color);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    min-height: 150px;
    text-align: left;
    z-index: 1000;
  }
</style>
