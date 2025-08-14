<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { AlignHorizontalSpaceAround, Expand } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    autoSizeContent: void;
    autoSizeSpace: void;
  }>();

  function onAutoSizeContent() {
    dispatch('autoSizeContent');
  }

  function onAutoSizeSpace() {
    dispatch('autoSizeSpace');
  }
</script>

<ContextMenu.Item on:click={onAutoSizeContent} size="sm">
  <div class="flex items-center">
    <AlignHorizontalSpaceAround size={14} class="mr-2" />
    Fit Columns to Content
  </div>
</ContextMenu.Item>
<ContextMenu.Item on:click={onAutoSizeSpace} size="sm">
  <div class="flex items-center">
    <Expand size={14} class="mr-2" />
    Fit Columns to Available Space
  </div>
</ContextMenu.Item>
