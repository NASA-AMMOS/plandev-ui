<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let use: ActionArray = [];

  const dispatch = createEventDispatcher();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="context-menu-item st-typography-body"
  on:click|preventDefault={() => dispatch('click')}
  on:mouseenter
  on:mouseleave
  use:useActions={use}
>
  <slot />
</div>

<style>
  .context-menu-item {
    cursor: pointer;
    padding: 4px;
    white-space: nowrap;
  }

  .context-menu-item:hover {
    background-color: var(--st-gray-20);
    border-radius: 4px;
  }
</style>
