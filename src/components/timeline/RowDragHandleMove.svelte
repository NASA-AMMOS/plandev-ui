<svelte:options immutable={true} />

<script lang="ts">
  import GripHorizontalIcon from 'bootstrap-icons/icons/grip-horizontal.svg?component';
  import { createEventDispatcher } from 'svelte';

  export let disabled: boolean = true;

  const dispatch = createEventDispatcher();
</script>

<div
  class="row-drag-handle-move"
  role="none"
  style={disabled ? 'cursor: grab' : 'cursor: grabbing'}
  on:mousedown={() => dispatch('mouseDownRowMove')}
>
  <GripHorizontalIcon />
</div>

<style>
  .row-drag-handle-move {
    display: flex;
    flex: 1;
    justify-content: center;
    width: 100%;
  }
</style>
