<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { WorkspaceContentType } from '../../enums/workspace';
  import type { User } from '../../types/app';
  import type { WorkspaceFileRevision } from '../../types/workspace';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import WorkspaceDiffViewer from '../workspace/WorkspaceDiffViewer.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentContent: string;
  /** "Working copy", or "Current editor (unsaved)" when comparing against unsaved edits. */
  export let currentLabel: string;
  /** Why Restore is unavailable; null when it is allowed. */
  export let restoreDisabledReason: string | null = null;
  export let revision: WorkspaceFileRevision;
  export let type: WorkspaceContentType | null = null;
  /** Extra confirm-step warning, e.g. saved changes that no revision holds. */
  export let unrevisionedWarning: string | null = null;
  export let user: User | null = null;
  export let workspaceId: number;

  const dispatch = createEventDispatcher<{ close: void; restore: void }>();

  let changedLines: number = 0;
  let confirming: boolean = false;
  let isLoading: boolean = true;
  let loadError: boolean = false;
  let revisionContent: string = '';

  onMount(async () => {
    try {
      revisionContent = await WorkspaceApi.getFileRevisionContent(workspaceId, revision.id, user);
    } catch {
      loadError = true;
    } finally {
      isLoading = false;
    }
  });
</script>

<Modal height="min(680px, 85vh)" width="min(1200px, 92vw)" on:close>
  <ModalHeader on:close>Revision {revision.name}</ModalHeader>
  <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
    <div class="st-typography-body flex-none text-muted-foreground">
      {revision.createdBy ?? 'Unknown'} · {new Date(revision.createdAt).toLocaleString()}
      {#if !isLoading && !loadError}
        · {changedLines === 0
          ? `identical to ${currentLabel.toLowerCase()}`
          : `${changedLines} changed ${changedLines === 1 ? 'line' : 'lines'}`}
      {/if}
    </div>
    <div class="flex min-h-0 flex-auto overflow-hidden rounded border">
      {#if isLoading}
        <div class="flex w-full items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle class="animate-spin" size={16} /> Loading revision {revision.name}…
        </div>
      {:else if loadError}
        <div class="flex w-full items-center justify-center gap-2 text-muted-foreground">
          <TriangleAlert size={16} /> Couldn't load revision {revision.name}.
        </div>
      {:else}
        <WorkspaceDiffViewer
          theirs={revisionContent}
          theirsLabel="Revision {revision.name}"
          mine={currentContent}
          mineLabel={currentLabel}
          {type}
          on:stats={e => (changedLines = e.detail.changedLines)}
        />
      {/if}
    </div>
  </ModalContent>
  <div class="flex flex-none items-center justify-end gap-3 rounded-b border-t bg-muted px-4 py-3">
    {#if confirming}
      <div class="mr-auto flex flex-col text-sm">
        <span class="font-semibold">Restore revision {revision.name}?</span>
        <span class="text-muted-foreground">
          The working copy will be replaced with revision {revision.name}. Existing revisions will not be changed.
        </span>
        {#if unrevisionedWarning}
          <span class="text-destructive">{unrevisionedWarning}</span>
        {/if}
      </div>
      <Button variant="outline" on:click={() => (confirming = false)}>Cancel</Button>
      <Button variant="destructive" on:click={() => dispatch('restore')}>Restore</Button>
    {:else}
      {#if restoreDisabledReason}
        <span class="mr-auto text-sm text-muted-foreground">{restoreDisabledReason}</span>
      {/if}
      <Button variant="outline" on:click={() => dispatch('close')}>Close</Button>
      <Button disabled={!!restoreDisabledReason || isLoading || loadError} on:click={() => (confirming = true)}>
        Restore…
      </Button>
    {/if}
  </div>
</Modal>
