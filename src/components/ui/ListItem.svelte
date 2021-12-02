<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export { className as class };
  export { styleName as style };
  export let draggable: boolean = false;

  let className: string = '';
  let styleName: string = '';
</script>

<div
  class="list-item {className}"
  {draggable}
  style={styleName}
  on:click={e => dispatch('click', e)}
  on:dragend={e => dispatch('dragend', e)}
  on:dragstart={e => dispatch('dragstart', e)}
>
  <div>
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

  .list-item:not(:last-child) {
    margin-bottom: 0.2rem;
  }

  .list-item > .suffix > :global(span) {
    display: flex;
  }
</style>
