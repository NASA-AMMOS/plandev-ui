<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox, Label } from '@nasa-jpl/stellar-svelte';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { getShortISOForDate } from '../../utilities/time';
  import { getUserDisplayNameFromIdentity } from '../../utilities/workspaces';

  export let doesWorkingCopyMatchLatestRevision: boolean = false;
  export let isDirty: boolean = false;
  export let fileMetadata: WorkspaceFileMetadata;
  export let hasEditPermission: boolean = false;
  export let matchingRevisionName: string | null = null;
  export let onReadOnlyChange: ((readOnly: boolean) => void) | null = null;
</script>

<div class="flex h-8 items-center gap-4 border-b bg-[var(--sidebar)] px-3 py-1.5 text-xs text-muted-foreground">
  {#if fileMetadata.lastEditedBy}
    <span
      ><span class="font-medium">Last edited by:</span>
      {getUserDisplayNameFromIdentity(fileMetadata.lastEditedBy)}</span
    >
  {/if}
  {#if fileMetadata.lastEditedAt}
    <span><span class="font-medium">Last edited:</span> {getShortISOForDate(new Date(fileMetadata.lastEditedAt))}</span>
  {/if}
  {#if isDirty}
    <span><span class="font-medium">Working Copy:</span> Unsaved Changes</span>
  {:else if matchingRevisionName}
    <span
      ><span class="font-medium">Revision:</span>
      {matchingRevisionName}
      {#if doesWorkingCopyMatchLatestRevision}
        (latest){/if}</span
    >
  {:else}
    <span><span class="font-medium">Working Copy:</span> Modified</span>
  {/if}
  <div
    class="ml-auto flex items-center gap-1.5"
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: 'You do not have permission to change the read-only status of this file',
    }}
  >
    <Checkbox
      checked={fileMetadata.readOnly ?? false}
      on:click={() => onReadOnlyChange?.(!(fileMetadata?.readOnly ?? false))}
      size="sm"
      id="read-only"
    />
    <Label size="sm" for="read-only">Read only</Label>
  </div>
</div>
