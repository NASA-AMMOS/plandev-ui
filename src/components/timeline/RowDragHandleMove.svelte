<svelte:options immutable={true} />

<script lang="ts">
  import { GripHorizontal } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  export let disabled: boolean = true;

  const dispatch = createEventDispatcher<{
    mouseDownRowMove: void;
  }>();
</script>

<div
  class="row-drag-handle-move"
  role="none"
  style={disabled ? 'cursor: grab' : 'cursor: grabbing'}
  on:mousedown={() => dispatch('mouseDownRowMove')}
>
  <GripHorizontal size={16} />
</div>

<style>
  .row-drag-handle-move {
    display: flex;
    flex: 1;
    justify-content: center;
    width: 100%;
  }
</style>
