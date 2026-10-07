<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle } from 'lucide-svelte';
  import { getContext } from 'svelte';
  import { activeDocument, activeDocumentIsDirty } from '../../stores/activeDocument';
  import { catchError } from '../../stores/console';
  import { workspaceId } from '../../stores/workspaces';
  import type { UserStore } from '../../types/app';
  import type { WorkspaceFileRevision, WorkspaceFileRevisionList } from '../../types/workspace';
  import { showWorkspaceRevisionPreviewModal } from '../../utilities/modal';
  import { CompoundError, WorkspaceSaveConflictError } from '../../utilities/requests';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import PanelHeader from './PanelHeader.svelte';

  export let filePath: string | null = null;
  /** Write permission. Not the same as read-only: a read-only file can still get a revision. */
  export let hasEditPermission: boolean = false;
  export let isReadOnly: boolean = false;
  /** Reload the editor from the server after a restore changed (or failed to change) the working copy. */
  export let reloadWorkingCopy: () => Promise<void>;

  const user: UserStore = getContext('user');

  let isCreating: boolean = false;
  let isLoading: boolean = false;
  let list: WorkspaceFileRevisionList | null = null;
  let loadedPath: string | null = null;
  let notice: string | null = null;
  let requestId: number = 0;

  $: newestFirst = list ? [...list.revisions].reverse() : [];
  $: latest = list?.latestRevision ?? null;
  $: matching = list?.matchingRevision ?? null;
  // Matching an older revision still allows a new one: returning to it is worth recording.
  $: createDisabledReason = !hasEditPermission
    ? "You don't have permission to create revisions."
    : $activeDocumentIsDirty
      ? 'Save your changes before creating a revision.'
      : matching && matching.id === latest?.id
        ? 'The saved copy already matches the latest revision.'
        : null;
  $: restoreDisabledReason = !hasEditPermission
    ? "You don't have permission to restore revisions."
    : isReadOnly
      ? 'This file is read-only, so revisions can be previewed but not restored.'
      : $activeDocumentIsDirty
        ? 'Save or discard your unsaved changes before restoring a revision.'
        : null;

  // The saved copy moves on open, save and restore (baseEtag). User-metadata edits happen in the Metadata tab, and
  // switching back remounts this panel. readOnly is runtime state, not part of a revision, so it never reloads.
  // baseEtag is pulled out so keystrokes (which change $activeDocument) don't refetch.
  $: baseEtag = $activeDocument.baseEtag;
  $: loadRevisions(filePath, baseEtag);

  async function loadRevisions(path: string | null = filePath, ..._deps: unknown[]) {
    const id = ++requestId;
    if (path !== loadedPath) {
      list = null;
      notice = null;
      loadedPath = path;
    }
    if (!path) {
      return;
    }
    isLoading = true;
    try {
      const result = await WorkspaceApi.listFileRevisions($workspaceId, path, $user);
      if (id === requestId) {
        list = result;
      }
    } catch (e) {
      if (id === requestId) {
        catchError('log', 'Failed to load revisions', e as Error);
      }
    } finally {
      if (id === requestId) {
        isLoading = false;
      }
    }
  }

  async function onCreate() {
    if (!filePath || createDisabledReason) {
      return;
    }
    isCreating = true;
    notice = null;
    try {
      const revision = await WorkspaceApi.createFileRevision($workspaceId, filePath, $user);
      showSuccessToast(`Created revision ${revision.name}`);
    } catch (e) {
      // The revision exists but the list can't show it yet; a retry would create the next one.
      if (
        e instanceof CompoundError &&
        e.errors.some(({ type }) => (type as string) === 'WORKSPACE_REVISION_NOT_INDEXED')
      ) {
        notice = "Revision created, but it isn't available in the list yet.";
      } else {
        catchError('log', 'Failed to create revision', e as Error);
        showFailureToast('Failed to create revision');
      }
    } finally {
      isCreating = false;
    }
    await loadRevisions();
  }

  async function onPreview(revision: WorkspaceFileRevision) {
    if (!filePath || !list) {
      return;
    }
    const path = filePath;
    const workingCopyETag = list.workingCopyETag;
    await showWorkspaceRevisionPreviewModal({
      currentContent: $activeDocument.currentContent,
      currentLabel: $activeDocumentIsDirty ? 'Current editor (unsaved)' : 'Working copy',
      filePath: path,
      restore: () => restore(path, revision, workingCopyETag),
      restoreDisabledReason,
      revision,
      type: $activeDocument.type,
      unrevisionedWarning:
        latest && !matching ? 'The saved copy is not in any revision, so it will be replaced and lost.' : null,
      user: $user,
      workspaceId: $workspaceId,
    });
  }

  /** Runs inside the preview modal, which blocks the editor until this (including the reload) settles. */
  async function restore(path: string, revision: WorkspaceFileRevision, workingCopyETag: string) {
    if ($activeDocumentIsDirty || path !== filePath) {
      return;
    }
    notice = null;
    try {
      await WorkspaceApi.restoreFileRevision($workspaceId, path, revision.id, workingCopyETag, $user);
      showSuccessToast(`Restored revision ${revision.name}`);
    } catch (e) {
      if (e instanceof WorkspaceSaveConflictError) {
        notice = `The working copy changed since this list loaded, so revision ${revision.name} was not restored. Review the refreshed state and try again.`;
      } else {
        catchError('log', 'Failed to restore revision', e as Error);
        showFailureToast('Failed to restore revision');
        return;
      }
    }
    // Success or 412: the server state differs from what we showed, so reload the (clean) editor and this list.
    await reloadWorkingCopy();
    await loadRevisions();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    });
  }
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <PanelHeader>
      <SectionTitle>Revisions</SectionTitle>
      {#if isLoading}<LoaderCircle class="animate-spin text-muted-foreground" size={14} />{/if}
    </PanelHeader>
  </Sidebar.Header>
  <Sidebar.Content className="h-full overflow-auto">
    {#if !filePath}
      <div class="p-3 text-sm text-muted-foreground">Open a file to see its revisions.</div>
    {:else}
      <section class="flex flex-col gap-2 border-b border-border p-3" aria-label="Working copy">
        <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Working copy</div>
        {#if list}
          <div class="text-sm">
            {#if !latest}
              No revisions yet.
            {:else if matching}
              Saved copy matches revision <b>{matching.name}</b>
            {:else}
              <span class="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
              Saved changes since revision <b>{latest.name}</b>
            {/if}
          </div>
        {/if}
        {#if $activeDocumentIsDirty}
          <div class="text-sm text-amber-700 dark:text-amber-400">
            <span class="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            Unsaved editor changes
          </div>
        {/if}
        <Button size="sm" class="mt-1 w-fit" disabled={!!createDisabledReason || isCreating} on:click={onCreate}>
          {isCreating ? 'Creating…' : 'Create revision'}
        </Button>
        {#if createDisabledReason}
          <div class="text-xs text-muted-foreground">{createDisabledReason}</div>
        {/if}
        {#if notice}
          <div class="rounded border border-border bg-muted p-2 text-xs" role="status">{notice}</div>
        {/if}
      </section>
      <ul class="flex flex-col" aria-label="Revisions">
        {#each newestFirst as revision (revision.id)}
          <li>
            <button
              class="flex w-full items-baseline gap-3 border-b border-border px-3 py-2 text-left hover:bg-muted"
              title="Preview revision {revision.name}"
              on:click={() => onPreview(revision)}
            >
              <span class="w-6 flex-none text-base font-semibold">{revision.name}</span>
              <span class="flex min-w-0 flex-col text-xs text-muted-foreground">
                <span class="truncate">{revision.createdBy ?? 'Unknown'}</span>
                <span>{formatDate(revision.createdAt)}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </Sidebar.Content>
</div>
