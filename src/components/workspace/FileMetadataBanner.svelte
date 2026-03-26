<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox, Label } from '@nasa-jpl/stellar-svelte';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { getShortISOForDate } from '../../utilities/time';

  export let fileMetadata: WorkspaceFileMetadata;
  export let onReadOnlyChange: ((readOnly: boolean) => void) | null = null;
</script>

<div class="flex h-8 items-center gap-4 border-b bg-[var(--sidebar)] px-3 py-1.5 text-xs text-muted-foreground">
  {#if fileMetadata.lastEditedBy}
    <span><span class="font-medium">Last edited by:</span> {fileMetadata.lastEditedBy}</span>
  {/if}
  {#if fileMetadata.lastEditedAt}
    <span><span class="font-medium">Last edited:</span> {getShortISOForDate(new Date(fileMetadata.lastEditedAt))}</span>
  {/if}
  <div class="ml-auto flex items-center gap-1.5">
    <Checkbox
      checked={fileMetadata.readOnly ?? false}
      on:click={() => onReadOnlyChange?.(!(fileMetadata?.readOnly ?? false))}
      size="sm"
      id="read-only"
    />
    <Label size="sm" for="read-only">Read only</Label>
  </div>
</div>
