<svelte:options immutable={true} />

<script lang="ts">
  import CollapseIcon from '@nasa-jpl/stellar/icons/collapse.svg?component';
  import ExpandIcon from '@nasa-jpl/stellar/icons/expand.svg?component';
  import { createEventDispatcher } from 'svelte';
  import ContextMenuHeader from '../../../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../../../context-menu/ContextMenuItem.svelte';

  const dispatch = createEventDispatcher();

  function onAutoSizeContent() {
    dispatch('autoSizeContent');
  }

  function onAutoSizeSpace() {
    dispatch('autoSizeSpace');
  }
</script>

<ContextMenuHeader>Table Actions</ContextMenuHeader>
<ContextMenuItem on:click={onAutoSizeContent}>
  <div class="table-action"><CollapseIcon />Fit Columns to Content</div>
</ContextMenuItem>
<ContextMenuItem on:click={onAutoSizeSpace}>
  <div class="table-action"><ExpandIcon />Fit Columns to Available Space</div>
</ContextMenuItem>

<style>
  :global(.context-menu .context-menu-header:not(:first-child)) {
    padding-top: 8px;
  }

  .table-action {
    align-items: center;
    column-gap: 4px;
    display: grid;
    grid-template-columns: min-content auto;
  }
</style>
