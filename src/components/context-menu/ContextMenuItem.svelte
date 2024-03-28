<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    click: void;
  }>();
</script>

<div
  class="context-menu-item st-typography-body"
  role="none"
  on:mouseenter
  on:mouseleave
  use:useActions={use}
  on:click|preventDefault={() => dispatch('click')}
>
  <slot />
</div>

<style>
  .context-menu-item {
    cursor: pointer;
    padding: 4px;
    user-select: none;
    white-space: nowrap;
  }

  .context-menu-item:hover {
    background-color: var(--st-gray-20);
    border-radius: 4px;
  }
</style>
