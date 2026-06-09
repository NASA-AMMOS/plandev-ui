<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TimelineItemMetadata, TimelineItemType } from '../../types/timeline';

  export let hint: string = '';
  export let hintPosition: 'center' | 'bottom' = 'center';
  // When true, don't disable pointer events on children during drag
  // Use this when the DropTarget contains elements that use pragmatic DND
  export let disablePointerBlock: boolean = false;

  let isDropTarget: boolean = false;
  let isDragging: boolean = false;

  const dispatch = createEventDispatcher<{
    dragend: DragEvent;
    dragstart: DragEvent;
    drop: { items?: TimelineItemType[]; metadata?: TimelineItemMetadata; type?: string };
  }>();

  // Check if this drag event is from pragmatic-drag-and-drop (row/section reordering)
  // Pragmatic DND sets a specific MIME type 'application/vnd.pdnd' in the dataTransfer
  function isPragmaticDragAndDrop(e: DragEvent): boolean {
    if (!e.dataTransfer) {
      return false;
    }
    const types = Array.from(e.dataTransfer.types);
    return types.includes('application/vnd.pdnd');
  }

  function onDragEnter(e: DragEvent) {
    if (isPragmaticDragAndDrop(e)) {
      return;
    }
    isDropTarget = true;
  }

  function onDragLeave(e: DragEvent) {
    if (isPragmaticDragAndDrop(e)) {
      return;
    }
    isDropTarget = false;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function onDragOver(e: DragEvent) {
    if (isPragmaticDragAndDrop(e)) {
      return;
    }
    isDropTarget = true;
    if (e.dataTransfer?.effectAllowed === 'copyLink') {
      e.dataTransfer.dropEffect = 'link';
    }
  }

  function onDrop(e: DragEvent) {
    if (isPragmaticDragAndDrop(e)) {
      return;
    }
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
    if (isPragmaticDragAndDrop(e)) {
      return;
    }
    isDragging = true;
    dispatch('dragstart', e);
  }}
  on:dragend={e => {
    // Always reset states on dragend, even for pragmatic DND
    // This ensures we clean up stuck states from rapid/cancelled drags
    const wasDragging = isDragging;
    isDragging = false;
    isDropTarget = false;

    if (isPragmaticDragAndDrop(e)) {
      return;
    }
    if (wasDragging) {
      dispatch('dragend', e);
    }
  }}
  on:drop={e => {
    // Reset on any window-level drop as a fallback
    isDragging = false;
    isDropTarget = false;
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
  <div class="content-wrapper" class:disable-pointer={isDragging && !disablePointerBlock}>
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
