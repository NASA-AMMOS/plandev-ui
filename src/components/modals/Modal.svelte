<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let closeOnOutsideClick: boolean = true;
  export let closeOnEscape: boolean = true;
  export let height: number | string = 350;
  export let width: number | string = 400;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  function handleKeydown(event: KeyboardEvent) {
    if (
      closeOnEscape &&
      event.key === 'Escape' &&
      (event.target as HTMLElement)?.nodeName !== 'INPUT' &&
      (event.target as HTMLElement)?.nodeName !== 'TEXTAREA'
    ) {
      dispatch('close');
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  $: heightStyle = typeof height === 'number' ? `${height}px` : height;
  $: widthStyle = typeof width === 'number' ? `${width}px` : width;
</script>

<div id="modal-container">
  <div class="modal st-typography-body" role="none" style:height={heightStyle} style:width={widthStyle}>
    <slot />
  </div>
  <!-- Stage to capture clicks outside of the modal body-->
  <div
    on:click={() => {
      if (closeOnOutsideClick) {
        dispatch('close');
      }
    }}
    class="fixed bottom-0 left-0 top-0 h-full w-full bg-black/50"
    data-aria-hidden="true"
    aria-hidden="true"
  />
</div>

<style>
  #modal-container {
    align-items: center;
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
