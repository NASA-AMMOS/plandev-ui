<svelte:options immutable={true} />

<script lang="ts">
  export let highlight: boolean = false;
</script>

<div class="highlight">
  <div class="highlight-bg" class:active={highlight} />
  <slot />
</div>

<style>
  .highlight {
    position: relative;
  }

  .highlight-bg {
    height: 100%;
    left: -8px;
    position: absolute;
    top: 0;
    width: calc(100% + 16px);
    z-index: -1;
  }

  .active {
    background: rgba(255, 237, 72, 0.24);
  }
</style>
