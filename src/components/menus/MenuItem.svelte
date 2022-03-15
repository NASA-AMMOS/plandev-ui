<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();
</script>

<div class="menu-item" class:disabled on:click={() => dispatch('click')}>
  <slot />
</div>

<style>
  .menu-item {
    display: grid;
    font-size: 0.8rem;
    font-weight: 300;
    gap: 0.5rem;
    grid-template-columns: 1rem auto;
    justify-content: flex-start;
    overflow: hidden;
    padding: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .menu-item:hover {
    background: var(--st-gray-20);
    border-radius: 4px;
  }

  .menu-item.disabled {
    color: var(--st-gray-40);
    cursor: not-allowed;
  }
</style>
