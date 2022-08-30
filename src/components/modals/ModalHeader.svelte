<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
</script>

<div class="modal-header st-typography-header">
  <slot />
  <button class="st-button icon fs-6" on:click|stopPropagation={() => dispatch('close')}>
    <i class="bi bi-x" />
  </button>
</div>

<style>
  .modal-header {
    align-items: center;
    background: var(--st-white);
    border-bottom: 1px solid var(--st-gray-15);
    border-radius: 4px 4px 0px 0px;
    display: flex;
    height: 40px;
    justify-content: space-between;
    padding: 1rem;
    padding-right: 8px;
    width: 100%;
  }
</style>
