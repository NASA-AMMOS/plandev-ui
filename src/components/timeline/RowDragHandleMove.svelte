<svelte:options immutable={true} />

<script lang="ts">
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { createEventDispatcher } from 'svelte';

  export let disabled: boolean = true;

  const dispatch = createEventDispatcher();
</script>

<div
  class="row-drag-handle-move"
  style={disabled ? 'cursor: grab' : 'cursor: grabbing'}
  on:mousedown={() => dispatch('mouseDownRowMove')}
>
  <GripVerticalIcon />
</div>
