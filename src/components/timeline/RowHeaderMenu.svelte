<svelte:options immutable={true} />

<script lang="ts">
  import ThreeDotsIcon from '@nasa-jpl/stellar/icons/three_dot_horizontal.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  const dispatch = createEventDispatcher();

  let button: HTMLElement;

  function onClick(e: MouseEvent) {
    const { x, y } = button.getBoundingClientRect();
    const newEvent = new MouseEvent(e.type, { ...e, clientX: x, clientY: y });
    dispatch('contextMenu', { e: newEvent, origin: 'row-header' });
  }
</script>

<div>
  <button
    bind:this={button}
    class="st-button secondary row-header-menu"
    use:tooltip={{ content: 'Row Settings', placement: 'top' }}
    on:click|stopPropagation={onClick}
  >
    <div class="button-inner"><ThreeDotsIcon /></div>
  </button>
</div>

<style>
  .row-header-menu {
    height: 20px;
    padding: 0px 0px;
    width: 20px;
  }

  .button-inner {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    position: relative;
    width: 100%;
    z-index: 1;
  }
</style>
