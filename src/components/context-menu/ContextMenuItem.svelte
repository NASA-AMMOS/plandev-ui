<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
</script>

<div class="context-menu-item" on:click={() => dispatch('click')}>
  <slot />
</div>

<style>
  .context-menu-item {
    cursor: pointer;
    padding: 4px;
  }

  .context-menu-item:hover {
    background-color: var(--st-gray-20);
    border-radius: 4px;
  }
</style>
