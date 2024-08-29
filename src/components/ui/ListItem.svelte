<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export { className as class };
  export { styleName as style };
  export let draggable: boolean = false;

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
    dragend: DragEvent;
    dragstart: DragEvent;
  }>();

  let className: string = '';
  let styleName: string = '';
  let dragging: boolean = false;
</script>

<div
  class="list-item st-typography-body {className}"
  class:dragging
  {draggable}
  role="none"
  style={styleName}
  on:click={e => dispatch('click', e)}
  on:dragend={e => {
    dragging = false;
    dispatch('dragend', e);
  }}
  on:dragstart={e => {
    dragging = true;
    dispatch('dragstart', e);
  }}
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

  .list-item:hover,
  .list-item:focus-within {
    background: var(--st-gray-10);
  }

  .list-item-content {
    display: flex;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .suffix:not(:focus-within) {
    opacity: 0;
    pointer-events: none;
  }

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
