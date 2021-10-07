<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let disabled: boolean = true;
</script>

<div
  class="row-drag-handle-move"
  style={disabled ? 'cursor: grab' : 'cursor: grabbing'}
  on:mousedown={() => dispatch('mouseDownRowMove')}
>
  <i class="bi bi-grip-vertical" />
</div>
