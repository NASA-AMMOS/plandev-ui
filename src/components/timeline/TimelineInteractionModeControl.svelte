<script lang="ts">
  import CursorDefaultIcon from '@nasa-jpl/stellar/icons/cursor_default.svg?component';
  import MoveIcon from '@nasa-jpl/stellar/icons/move.svg?component';
  import { createEventDispatcher, onMount } from 'svelte';
  import { isMacOs } from '../../utilities/generic';
  import { isMetaOrCtrlPressed } from '../../utilities/keyboardEvents';
  import { TimelineInteractionMode } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';

  export let timelineInteractionMode: TimelineInteractionMode = TimelineInteractionMode.Interact;

  const dispatch = createEventDispatcher();

  $: tooltipContent = `${
    timelineInteractionMode === TimelineInteractionMode.Interact
      ? 'Switch to Zoom and Pan Mode'
      : 'Switch to Interaction Mode'
  }`;
  $: className = timelineInteractionMode === TimelineInteractionMode.Navigate ? 'navigate' : '';

  onMount(() => {
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keyup', onKeyup);

    return () => {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('keyup', onKeyup);
    };
  });

  function onKeydown(e: KeyboardEvent) {
    // If user holds meta/control while not focused on an input then activate navigation mode
    const keyActive = isMacOs() ? e.key === 'Meta' : e.key === 'Control';
    if (isMetaOrCtrlPressed(e)) {
      // If the meta key is the one pressed enter navigation mode
      if (keyActive && (e.target as HTMLElement).tagName !== 'INPUT') {
        dispatch('change', TimelineInteractionMode.Navigate);
      } else {
        // Otherwise exit navigation mode since this could be a system shortcut
        dispatch('change', TimelineInteractionMode.Interact);
      }
    }
  }

  function onKeyup(e: KeyboardEvent) {
    const keyReleased = isMacOs() ? e.key === 'Meta' : e.key === 'Control';
    if (keyReleased && timelineInteractionMode === TimelineInteractionMode.Navigate) {
      dispatch('change', TimelineInteractionMode.Interact);
    }
  }

  function onClick() {
    if (timelineInteractionMode === TimelineInteractionMode.Interact) {
      dispatch('change', TimelineInteractionMode.Navigate);
    } else {
      dispatch('change', TimelineInteractionMode.Interact);
    }
  }
</script>

<button
  class={`st-button icon ${className}`}
  on:click={onClick}
  use:tooltip={{
    content: tooltipContent,
    placement: 'bottom',
    shortcut: isMacOs() ? '⌘' : 'CTRL',
    shortcutLabel: timelineInteractionMode === TimelineInteractionMode.Interact ? 'Hold' : 'Release',
  }}
>
  {#if timelineInteractionMode === TimelineInteractionMode.Interact}
    <CursorDefaultIcon />
  {:else}
    <MoveIcon />
  {/if}
</button>

<style>
  .st-button {
    border: 1px solid var(--st-gray-30);
    color: var(--st-gray-70);
  }

  .navigate,
  .navigate:hover {
    background-color: var(--st-utility-blue) !important;
    border-color: transparent;
    color: #ffffff;
  }
</style>
