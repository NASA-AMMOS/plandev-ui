<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TimelineItemType } from '../../types/timeline';

  export let hint: string = '';
  export let hintPosition: 'center' | 'bottom' = 'center';

  let isDropTarget: boolean = false;
  let isDragging: boolean = false;

  const dispatch = createEventDispatcher<{
    dragend: DragEvent;
    dragstart: DragEvent;
    drop: { items?: TimelineItemType[]; type?: string };
  }>();

  function onDragEnter() {
    isDropTarget = true;
  }

  function onDragLeave(e: DragEvent) {
    isDropTarget = false;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function onDragOver(e: DragEvent) {
    isDropTarget = true;
    if (e.dataTransfer?.effectAllowed === 'copyLink') {
      e.dataTransfer.dropEffect = 'link';
    }
  }

  function onDrop(e: DragEvent) {
    isDropTarget = false;

    if (e.dataTransfer !== null) {
      const data = e.dataTransfer.getData('text');
      const json = JSON.parse(data || '{}');
      dispatch('drop', json);
    }
  }
</script>

<svelte:window
  on:dragstart={e => {
    isDragging = true;
    dispatch('dragstart', e);
  }}
  on:dragend={e => {
    isDragging = false;
    dispatch('dragend', e);
  }}
/>

<div
  class="drop-target"
  class:dropping={isDropTarget}
  role="none"
  on:dragenter|preventDefault={onDragEnter}
  on:dragleave={onDragLeave}
  on:dragover|preventDefault={onDragOver}
  on:drop|preventDefault={onDrop}
>
  <div class="content-wrapper" class:disable-pointer={isDragging}>
    <slot />
    {#if isDropTarget && hint}
      <div class="hint" style:margin-top={hintPosition === 'bottom' ? '16px' : ''}>
        <div class="hint-text st-typography-bold">
          {hint}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .drop-target,
  .content-wrapper {
    display: inherit;
    height: inherit;
    width: inherit;
  }

  .disable-pointer,
  .disable-pointer * {
    pointer-events: none;
  }

  .dropping::after {
    background: rgb(47, 128, 237, 0.2);
    box-shadow: 0 0 0px 2px inset var(--st-utility-blue);
    content: ' ';
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 9;
  }

  .hint {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    pointer-events: none;
    position: absolute;
    user-select: none;
    width: 100%;
    z-index: 10;
  }

  .hint-text {
    background: var(--st-utility-blue);
    border-radius: 4px;
    color: white;
    font-size: 10px;
    padding: 4px 8px;
  }
</style>
