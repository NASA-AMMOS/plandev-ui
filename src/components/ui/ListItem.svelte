<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { permissionHandler } from '../../utilities/permissionHandler';

  export { className as class };
  export { styleName as style };
  export let draggable: boolean = false;
  export let hasPermission: boolean | undefined = undefined;
  export let permissionError: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  let className: string = '';
  let styleName: string = '';
</script>

<div
  class="list-item st-typography-body {className}"
  {draggable}
  role="none"
  style={styleName}
  on:click={e => dispatch('click', e)}
  on:dragend={e => dispatch('dragend', e)}
  on:dragstart={e => dispatch('dragstart', e)}
  use:permissionHandler={{
    hasPermission: hasPermission ?? true,
    permissionError,
  }}
>
  <div class="list-item-content">
    <slot />
  </div>
  <div class="suffix">
    <slot name="suffix" />
  </div>
</div>

<style>
  .list-item {
    align-items: center;
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    display: flex;
    font-size: 0.8rem;
    justify-content: space-between;
    padding: 0.2rem;
  }

  .list-item-content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .list-item:not(:last-child) {
    margin-bottom: 0.2rem;
  }

  .list-item > .suffix > :global(span) {
    display: flex;
  }
</style>
