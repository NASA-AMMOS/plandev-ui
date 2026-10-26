<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  import RotateCcwClock from '../../assets/rotate-ccw-clock.svg?component';
  import { activeDocument, activeDocumentIsDirty } from '../../stores/activeDocument';
  import { catchError } from '../../stores/console';
  import { getUserStore } from '../../stores/user';
  import { workspaceId } from '../../stores/workspaces';
  import type { UserStore } from '../../types/app';
  import type { WorkspaceFileRevision } from '../../types/workspace';
  import effects from '../../utilities/effects';
  import { downloadBlob } from '../../utilities/generic';
  import { showWorkspaceRevisionPreviewModal } from '../../utilities/modal';
  import { CompoundError } from '../../utilities/requests';
  import { getShortISOForDate } from '../../utilities/time';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import {
    WorkspaceApi,
    getDownloadOptionsForFile,
    getRevisionDisplayName,
    separateFilenameFromPath,
  } from '../../utilities/workspaces';
  import DownloadMenu from '../ui/DownloadMenu.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import PanelHeader from './PanelHeader.svelte';

  export let doesWorkingCopyMatchLatestRevision: boolean = false;
  export let filePath: string | null = null;
  /** Write permission. Not the same as read-only: a read-only file can still get a revision. */
  export let hasEditPermission: boolean = false;
  export let isReadOnly: boolean = false;
  export let isRevisionsLoading: boolean = false;
  export let matchingRevisionName: string | null = null;
  export let revisionList: WorkspaceFileRevision[] = [];
  /** Reload the editor from the server after a restore changed (or failed to change) the working copy. */
  export let reloadWorkingCopy: () => Promise<void>;

  const dispatch = createEventDispatcher<{
    createdFileRevision: null;
  }>();
  const user: UserStore = getUserStore();

  let baseEtag: string | null = null;
  let commitMessage: string = '';
  let createDisabled: boolean = false;
  let workingCopyStatus: string | null = null;
  let isCreating: boolean = false;
  let isRestoring: boolean = false;
  let latest: WorkspaceFileRevision | null = null;
  let notice: string | null = null;
  let restoreDisabledReason: string | null = null;
  let revisionStart: string = 'a';
  let revisionStartError: string | null = null;

  $: latest = revisionList[0] ?? null;
  $: revisionStartError = getRevisionStartError(revisionStart);

  $: baseFilename = filePath ? separateFilenameFromPath(filePath).filename : '';

  // Matching an older revision still allows a new one: returning to it is worth recording.
  $: workingCopyStatus = getWorkingCopyStatus(
    hasEditPermission,
    $activeDocumentIsDirty,
    doesWorkingCopyMatchLatestRevision,
    matchingRevisionName,
  );
  $: createDisabled = getCreateDisabled(hasEditPermission, $activeDocumentIsDirty, doesWorkingCopyMatchLatestRevision);
  $: restoreDisabledReason = getRestoreDisabledReason(hasEditPermission, isReadOnly, $activeDocumentIsDirty);

  // The saved copy moves on open, save and restore (baseEtag). User-metadata edits happen in the Metadata tab, and
  // switching back remounts this panel. readOnly is runtime state, not part of a revision, so it never reloads.
  // baseEtag is pulled out so keystrokes (which change $activeDocument) don't refetch.
  $: baseEtag = $activeDocument.baseEtag;

  function getWorkingCopyStatus(
    hasEditPermission: boolean,
    isDirty: boolean,
    doesWorkingCopyMatchLatestRevision: boolean,
    matchingRevisionName: string | null,
  ): string | null {
    if (!hasEditPermission) {
      return "You don't have permission to create revisions.";
    }
    if (isDirty) {
      return 'Save your changes before creating a revision.';
    }
    if (doesWorkingCopyMatchLatestRevision) {
      return 'The saved copy matches the latest revision.';
    }
    if (matchingRevisionName) {
      return `The saved copy matches revision ${matchingRevisionName}`;
    }
    return null;
  }

  function getCreateDisabled(
    hasEditPermission: boolean,
    isDirty: boolean,
    doesWorkingCopyMatchLatestRevision: boolean,
  ): boolean {
    if (!hasEditPermission) {
      return true;
    }
    if (isDirty) {
      return true;
    }
    return doesWorkingCopyMatchLatestRevision;
  }

  function getRestoreDisabledReason(hasEditPermission: boolean, isReadOnly: boolean, isDirty: boolean): string | null {
    if (!hasEditPermission) {
      return "You don't have permission to restore revisions.";
    }
    if (isReadOnly) {
      return 'This file is read-only, so revisions can be previewed but not restored.';
    }
    if (isDirty) {
      return 'Save or discard your unsaved changes before restoring a revision.';
    }
    return null;
  }

  function getRevisionStartError(revisionStart: string): string | null {
    if (!/^[A-Za-z]*$/.test(revisionStart)) {
      return 'Only letters are allowed. No numbers, spaces, or symbols.';
    }
    return null;
  }

  async function onCreate() {
    if (!filePath || doesWorkingCopyMatchLatestRevision || (!latest && revisionStartError)) {
      return;
    }
    isCreating = true;
    notice = null;
    try {
      // TODO: add `revisionStart || 'a'` parameter to `createFileRevision`
      const revision = await WorkspaceApi.createFileRevision($workspaceId, filePath, baseEtag, commitMessage, $user);
      commitMessage = '';
      showSuccessToast(`Created revision ${revision}`);
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
      dispatch('createdFileRevision');
    }
  }

  async function onPreview(revision: WorkspaceFileRevision) {
    if (!filePath || !revisionList) {
      return;
    }
    const path = filePath;
    const workingCopyETag = $activeDocument.baseEtag;
    if (workingCopyETag) {
      await showWorkspaceRevisionPreviewModal({
        currentContent: $activeDocument.currentContent,
        filePath: path,
        revision,
        type: $activeDocument.type,
        user: $user,
        workspaceId: $workspaceId,
      });
    }
  }

  async function onRestore(revision: WorkspaceFileRevision) {
    if (!filePath || !revisionList || isRestoring) {
      return;
    }
    const workingCopyETag = $activeDocument.baseEtag;
    if (!workingCopyETag) {
      return;
    }
    notice = null;
    isRestoring = true;
    try {
      const result = await effects.restoreWorkspaceFileRevision(
        $workspaceId,
        filePath,
        revision,
        workingCopyETag,
        {
          currentContent: $activeDocument.currentContent,
          restoreDisabledReason,
          type: $activeDocument.type,
          unrevisionedWarning:
            latest && !doesWorkingCopyMatchLatestRevision
              ? 'The saved copy is not in any revision, so it will be replaced and lost.'
              : null,
        },
        $user,
      );
      if (result === 'conflict') {
        notice = `The working copy changed since this list loaded, so revision ${revision.name} was not restored. Review the refreshed state and try again.`;
      }
      // Success or 412: the server state differs from what we showed, so reload the (clean) editor and this list.
      if (result !== null) {
        await reloadWorkingCopy();
      }
    } finally {
      isRestoring = false;
    }
  }

  /** Fetches a past revision's content and downloads it under the chosen name. */
  async function onDownloadRevision(revision: WorkspaceFileRevision, name: string) {
    if (!filePath) {
      return;
    }
    try {
      const { content } = await WorkspaceApi.getFileRevisionContent($workspaceId, filePath, revision.name, $user);
      downloadBlob(new Blob([content], { type: 'text/plain' }), name);
    } catch (e) {
      catchError('log', 'Failed to download revision', e as Error);
      showFailureToast('Failed to download revision');
    }
  }

  /** Grows a textarea's height to fit its content as the user types. */
  function autosize(node: HTMLTextAreaElement) {
    function resize() {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    }
    resize();
    node.addEventListener('input', resize);
    return {
      destroy() {
        node.removeEventListener('input', resize);
      },
    };
  }
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <PanelHeader>
      <SectionTitle>Revisions</SectionTitle>
      {#if isRevisionsLoading}<LoaderCircle class="animate-spin text-muted-foreground" size={14} />{/if}
    </PanelHeader>
  </Sidebar.Header>
  <Sidebar.Content className="h-full overflow-auto">
    <Sidebar.Group className="h-full p-0">
      <Sidebar.GroupContent className="h-full">
        <Sidebar.Menu className="h-full text-xs">
          {#if !filePath}
            <div class="p-3 text-muted-foreground">Open a file to see its revisions.</div>
          {:else}
            <div class="flex flex-col gap-4 p-3">
              <section class="flex flex-col gap-1" aria-label="Working copy">
                <span class="font-medium uppercase tracking-wide text-muted-foreground">Working copy</span>
                <label class="flex flex-col gap-1" for="revision-commit-message">
                  <span>Revision description <span class="text-muted-foreground">(optional)</span></span>
                  <textarea
                    id="revision-commit-message"
                    bind:value={commitMessage}
                    use:autosize
                    class="w-full resize-none overflow-hidden rounded border border-border bg-background p-2 text-xs"
                    placeholder="Describe this revision"
                    rows={1}
                  />
                </label>
                {#if $activeDocumentIsDirty}
                  <div class="text-amber-700 dark:text-amber-400">
                    <span class="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                    Unsaved editor changes
                  </div>
                {/if}
                <div class="flex min-h-[26px] items-center gap-2">
                  <Button
                    class="w-fit"
                    disabled={createDisabled || isCreating || (!latest && !!revisionStartError)}
                    on:click={onCreate}
                  >
                    {isCreating ? 'Creating…' : 'Create revision'}
                  </Button>
                  {#if !latest}
                    <div class="grid h-full grid-cols-[auto_1fr] items-center gap-2">
                      <span>starting with revision</span>
                      <input
                        id="revision-start"
                        type="text"
                        title="Only letters are allowed. No numbers, spaces, or symbols."
                        bind:value={revisionStart}
                        placeholder="a"
                        aria-invalid={revisionStartError ? 'true' : 'false'}
                        aria-describedby={revisionStartError ? 'revision-start-error' : undefined}
                        size={Math.max(1, revisionStart.length)}
                        class="rounded border bg-background p-1 text-xs {revisionStartError
                          ? 'border-destructive'
                          : 'border-border'}"
                      />
                    </div>
                  {/if}
                </div>
                {#if !latest && revisionStartError}
                  <div id="revision-start-error" class="text-destructive" role="alert">{revisionStartError}</div>
                {/if}
                {#if workingCopyStatus}
                  <div class="text-muted-foreground">{workingCopyStatus}</div>
                {/if}
                {#if notice}
                  <div class="rounded border border-border bg-muted p-2" role="status">{notice}</div>
                {/if}
              </section>
              <div class="flex flex-col gap-1">
                <span class="font-medium text-muted-foreground">Revision History</span>
                {#if latest}
                  <ul class="flex flex-col overflow-hidden rounded border border-border" aria-label="Revisions">
                    {#each revisionList as revision, i (revision.name)}
                      {@const revisionDisplayName = getRevisionDisplayName(revision.name)}
                      <li class={i > 0 ? 'border-t border-border' : ''}>
                        <div class="grid grid-cols-[auto_min-content]">
                          <button
                            class="h-full w-full items-baseline px-2 py-1.5 hover:bg-muted"
                            title="Preview revision {revisionDisplayName}"
                            on:click={() => onPreview(revision)}
                          >
                            <div class="grid h-full grid-cols-[min-content_auto] items-start gap-2">
                              <div class="w-6 text-left text-sm font-semibold">
                                {revisionDisplayName}
                              </div>
                              <div class="flex flex-col gap-1">
                                <div
                                  class="min-h-4 overflow-hidden text-ellipsis text-nowrap text-left"
                                  title={revision.message}
                                >
                                  {revision.message}
                                </div>
                                <div class="text-left text-muted-foreground">
                                  <span>Created by:</span>
                                  <span class="truncate">{revision.createdBy ?? 'Unknown'}</span>
                                  <span>@{getShortISOForDate(new Date(revision.createdAt))}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                          <div class="grid grid-rows-2 justify-items-end gap-1">
                            <DownloadMenu
                              align="end"
                              variant="ghost"
                              className="flex-none px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                              label="Download revision {revision.name}"
                              options={getDownloadOptionsForFile(baseFilename, true, revision.name)}
                              onDownload={name => onDownloadRevision(revision, name)}
                            />

                            <Button
                              class="text-muted-foreground"
                              variant="ghost"
                              size="icon"
                              title={`Restore file to revision ${revisionDisplayName}`}
                              aria-label={`Restore file to revision ${revisionDisplayName}`}
                              disabled={isRestoring}
                              on:click={() => onRestore(revision)}
                            >
                              <RotateCcwClock size={10} />
                            </Button>
                          </div>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <div class="text-muted-foreground">No revisions yet.</div>
                {/if}
              </div>
            </div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>
