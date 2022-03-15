<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
</script>

<div class="modal-header">
  <slot />
  <button
    class="st-button icon fs-6"
    on:click|stopPropagation={() => dispatch('close')}
  >
    <i class="bi bi-x" />
  </button>
</div>

<style>
  .modal-header {
    align-items: center;
    background-color: var(--st-gray-20);
    border-radius: 4px 4px 0px 0px;
    color: var(--st-gray-100);
    display: flex;
    font-weight: 700;
    font-size: 1rem;
    height: 40px;
    justify-content: space-between;
    padding: 1rem;
    width: 100%;
  }
</style>
