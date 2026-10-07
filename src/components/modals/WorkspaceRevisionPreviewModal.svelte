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
  export let filePath: string;
  /** Runs the restore. The modal stays open, blocking the editor, until it settles, then closes. */
  export let restore: () => Promise<void>;
  /** Why Restore is unavailable; null when it is allowed. */
  export let restoreDisabledReason: string | null = null;
  export let revision: WorkspaceFileRevision;
  export let type: WorkspaceContentType | null = null;
  /** Extra confirm-step warning, e.g. saved changes that no revision holds. */
  export let unrevisionedWarning: string | null = null;
  export let user: User | null = null;
  export let workspaceId: number;

  const dispatch = createEventDispatcher<{ close: void }>();
  // Runtime/derived fields: not part of a revision, so not a difference.
  const unversionedKeys = ['lastEditedAt', 'lastEditedBy', 'readOnly'];

  let changedLines: number = 0;
  let confirming: boolean = false;
  let isLoading: boolean = true;
  let isRestoring: boolean = false;
  let loadError: boolean = false;
  let metadataDiffers: boolean = false;
  let revisionContent: string = '';

  // The diff only shows content, but a restore also replaces versioned metadata. Load both before describing the
  // restore or enabling it, so "identical" never shows for a revision whose metadata differs.
  onMount(async () => {
    try {
      const [content, { metadata }, current] = await Promise.all([
        WorkspaceApi.getFileRevisionContent(workspaceId, revision.id, user),
        WorkspaceApi.getFileRevision(workspaceId, revision.id, user),
        WorkspaceApi.getFileMetadata(workspaceId, filePath, user),
      ]);
      revisionContent = content;
      metadataDiffers = canonical(metadata) !== canonical(current ?? {});
    } catch {
      loadError = true;
    } finally {
      isLoading = false;
    }
  });

  function canonical(value: unknown, top = true): string {
    if (Array.isArray(value)) {
      return `[${value.map(v => canonical(v, false)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value)
        .filter(([key]) => !top || !unversionedKeys.includes(key))
        .sort(([a], [b]) => a.localeCompare(b));
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v, false)}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function close() {
    if (!isRestoring) {
      dispatch('close');
    }
  }

  async function onRestore() {
    if (isRestoring) {
      return;
    }
    isRestoring = true;
    try {
      await restore();
    } finally {
      isRestoring = false;
      dispatch('close');
    }
  }
</script>

<Modal height="min(680px, 85vh)" width="min(1200px, 92vw)" on:close={close}>
  <ModalHeader on:close={close}>Revision {revision.name}</ModalHeader>
  <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
    <div class="st-typography-body flex-none text-muted-foreground">
      {revision.createdBy ?? 'Unknown'} · {new Date(revision.createdAt).toLocaleString()}
      {#if !isLoading && !loadError}
        · {changedLines === 0
          ? `${metadataDiffers ? 'content ' : ''}identical to ${currentLabel.toLowerCase()}`
          : `${changedLines} changed ${changedLines === 1 ? 'line' : 'lines'}`}
      {/if}
      {#if metadataDiffers}· File metadata also differs.{/if}
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
      <Button variant="outline" disabled={isRestoring} on:click={() => (confirming = false)}>Cancel</Button>
      <Button variant="destructive" disabled={isRestoring} on:click={onRestore}>
        {isRestoring ? 'Restoring…' : 'Restore'}
      </Button>
    {:else}
      {#if restoreDisabledReason}
        <span class="mr-auto text-sm text-muted-foreground">{restoreDisabledReason}</span>
      {/if}
      <Button variant="outline" on:click={close}>Close</Button>
      <Button disabled={!!restoreDisabledReason || isLoading || loadError} on:click={() => (confirming = true)}>
        Restore…
      </Button>
    {/if}
  </div>
</Modal>
