<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox, Label } from '@nasa-jpl/stellar-svelte';
  import type { WorkspaceRevisionName } from '../../types/workspace';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { getShortISOForDate } from '../../utilities/time';
  import { getRevisionDisplayName, getUserDisplayNameFromIdentity } from '../../utilities/workspaces';

  export let doesWorkingCopyMatchLatestRevision: boolean = false;
  export let isDirty: boolean = false;
  export let fileMetadata: WorkspaceFileMetadata;
  export let hasEditPermission: boolean = false;
  export let hasRevisions: boolean = false;
  export let matchingRevisionName: WorkspaceRevisionName | null = null;
  export let onReadOnlyChange: ((readOnly: boolean) => void) | null = null;
</script>

<div class="flex min-h-8 items-center gap-4 border-b bg-[var(--sidebar)] px-3 py-1.5 text-xs text-muted-foreground">
  <div>
    {#if fileMetadata.lastEditedBy}
      <span class="font-medium">Last edited by:</span>
      {getUserDisplayNameFromIdentity(fileMetadata.lastEditedBy)}
    {/if}
    {#if fileMetadata.lastEditedAt}
      @{getShortISOForDate(new Date(fileMetadata.lastEditedAt))}
    {/if}
  </div>
  <div>
    <span class="font-medium">Working Copy:</span>
    {#if isDirty}
      Unsaved Changes
    {:else if matchingRevisionName !== null && matchingRevisionName !== ''}
      {#if doesWorkingCopyMatchLatestRevision}
        Latest Revision ({getRevisionDisplayName(matchingRevisionName)})
      {:else}
        Matches Revision <span class="font-medium">{getRevisionDisplayName(matchingRevisionName)}</span>
      {/if}
    {:else if !hasRevisions}
      Unrevisioned
    {:else}
      Modified
    {/if}
  </div>
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
