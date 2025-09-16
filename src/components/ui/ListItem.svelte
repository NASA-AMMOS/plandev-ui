<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  export { className as class };
  export { styleName as style };
  export let draggable: boolean = false;

  export let tooltipContent: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
    dragend: DragEvent;
    dragstart: DragEvent;
  }>();

  let className: string = '';
  let styleName: string = '';
  let dragging: boolean = false;

  function handleClick(e: MouseEvent) {
    dispatch('click', e);
  }

  function handleDragEnd(e: DragEvent) {
    dragging = false;
    dispatch('dragend', e);
  }

  function handleDragStart(e: DragEvent) {
    dragging = true;
    dispatch('dragstart', e);
  }
</script>

<div
  class="st-typography-body list-item {className}"
  class:dragging
  {draggable}
  role="none"
  style={styleName}
  on:click={handleClick}
  on:dragend={handleDragEnd}
  on:dragstart={handleDragStart}
  use:tooltip={{ content: tooltipContent, disabled: !tooltipContent, placement: 'top' }}
>
  <div class="list-item-content">
    <slot />
    <slot name="prefix" />
  </div>
  <div class="suffix">
    <slot name="suffix" />
  </div>
</div>

<style>
  .list-item {
    align-items: center;
    border-radius: 4px;
    display: flex;
    height: 32px;
    justify-content: space-between;
    margin: 0px 4px;
    padding: 4px 8px 4px 12px;
  }

  .list-item.active,
  .list-item:hover,
  .list-item:focus-within {
    background: var(--st-gray-10);
  }

  .list-item-content {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .suffix:not(:focus-within) {
    opacity: 0;
    pointer-events: none;
  }

  .list-item.active .suffix,
  .list-item:hover .suffix,
  .list-item:focus .suffix {
    align-items: center;
    opacity: 1;
    pointer-events: auto;
  }

  .list-item > .suffix > :global(span) {
    display: flex;
  }

  .list-item.dragging .suffix {
    display: none;
  }
</style>
