<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TimelineItemMetadata, TimelineItemType } from '../../types/timeline';

  export let hint: string = '';
  export let hintPosition: 'center' | 'bottom' = 'center';
  // Keeps children clickable mid-drag. For a DropTarget wrapping its own drag targets.
  export let disablePointerBlock: boolean = false;

  let isDropTarget: boolean = false;
  let isDragging: boolean = false;
  // Whether consumers got a 'dragstart'. dataTransfer.types is cleared by the time 'dragend'
  // fires, so the check below can disagree between the two ends of one drag, and a consumer that
  // got a start without an end stays stuck in its dragging state.
  let dispatchedDragStart: boolean = false;

  const dispatch = createEventDispatcher<{
    dragend: DragEvent;
    dragstart: DragEvent;
    drop: { items?: TimelineItemType[]; metadata?: TimelineItemMetadata; type?: string };
  }>();

  /** Row and section reordering, which marks its drags with a MIME type of its own. */
  function isPragmaticDragAndDrop(e: DragEvent): boolean {
    if (!e.dataTransfer) {
      return false;
    }
    const types = Array.from(e.dataTransfer.types);
    return types.includes('application/vnd.pdnd');
  }

  /**
   * Ends a drag from any of the events that can terminate one, always pairing a dispatched
   * 'dragstart' with a 'dragend'. Resetting local state without dispatching left consumers such
   * as RowDividerDropTarget stuck visible and covering the row resize handles, so a row could
   * only be resized once.
   */
  function endDrag(e: Event) {
    // One of these is bound per row header, so on a busy timeline every mouseup anywhere in the
    // app reaches every instance. Leave immediately unless this one has a drag to end.
    if (!isDragging && !isDropTarget && !dispatchedDragStart) {
      return;
    }

    isDragging = false;
    isDropTarget = false;

    if (dispatchedDragStart) {
      dispatchedDragStart = false;
      dispatch('dragend', e as DragEvent);
    }
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
    dispatchedDragStart = true;
    dispatch('dragstart', e);
  }}
  on:dragend={e => endDrag(e)}
  on:drop={e => endDrag(e)}
  on:mouseup={e => endDrag(e)}
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
