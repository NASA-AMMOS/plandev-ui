<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let highlight: boolean = false;
  export let flash: boolean = false;

  const dispatch = createEventDispatcher<{
    didFlash: any;
  }>();

  let el: HTMLDivElement;
  let showFlash: boolean = false;

  onMount(() => {
    if (flash) {
      showFlash = true;
      if (el) {
        el.scrollIntoView({ behavior: 'auto' });
      }
      // Immediately dispatch flash but delay animation class removal
      // to ensure animation has sufficient time to complete
      dispatch('didFlash');
      setTimeout(() => {
        showFlash = false;
      }, 2500);
    }
  });
</script>

<div class="highlight" bind:this={el}>
  <div class="highlight-bg" class:active={highlight || flash} class:fade-out={showFlash} />
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

  .fade-out {
    animation: fadeOut 2.5s;
  }

  @keyframes fadeOut {
    0% {
      background: rgba(255, 237, 72, 0.24);
    }
    70% {
      background: rgba(255, 237, 72, 0.24);
    }
    100% {
      background: transparent;
    }
  }
</style>
