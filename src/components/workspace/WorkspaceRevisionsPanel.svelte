<svelte:options immutable={true} />

<script lang="ts">
  import { Button, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import { Download, EllipsisVertical, LoaderCircle } from 'lucide-svelte';
  import { createEventDispatcher, tick } from 'svelte';

  import RotateCcwClock from '../../assets/rotate-ccw-clock.svg?component';
  import { activeDocument, activeDocumentIsDirty } from '../../stores/activeDocument';
  import { catchError, logMessage } from '../../stores/console';
  import { getUserStore } from '../../stores/user';
  import { workspaceId } from '../../stores/workspaces';
  import type { UserStore } from '../../types/app';
  import type { WorkspaceFileRevision, WorkspaceRevisionName } from '../../types/workspace';
  import effects from '../../utilities/effects';
  import { downloadBlob } from '../../utilities/generic';
  import { showWorkspaceRevisionPreviewModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { CompoundError } from '../../utilities/requests';
  import { getShortISOForDate } from '../../utilities/time';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import {
    WorkspaceApi,
    getDefaultRevisionName,
    getRevisionDisplayName,
    getRevisionNameRequirement,
    getVersionedFileName,
    separateFilenameFromExtension,
    separateFilenameFromPath,
    validateRevisionName,
  } from '../../utilities/workspaces';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import Tooltip from '../ui/Tooltip.svelte';
  import PanelHeader from './PanelHeader.svelte';

  export let doesWorkingCopyMatchLatestRevision: boolean = false;
  export let filePath: string | null = null;
  export let hasCreateRevisionPermission: boolean = false;
  export let hasRestoreRevisionPermission: boolean = false;
  export let isReadOnly: boolean = false;
  export let isRevisionsLoading: boolean = false;
  export let matchingRevisionName: WorkspaceRevisionName | null = null;
  export let revisionList: WorkspaceFileRevision[] = [];

  /** Reload the editor from the server after a restore changed (or failed to change) the working copy. */
  export let reloadWorkingCopy: () => Promise<void>;

  const dispatch = createEventDispatcher<{
    createdFileRevision: null;
  }>();
  const user: UserStore = getUserStore();

  let baseEtag: string | null = null;
  let baseFilename: string | null = null;
  let commitMessage: string = '';
  let createDisabled: boolean = false;
  let workingCopyStatus: string | null = null;
  let isCreating: boolean = false;
  let isRestoring: boolean = false;
  let latest: WorkspaceFileRevision | null = null;
  let notice: string | null = null;
  let restoreDisabledReason: string | null = null;
  let revisionStart: string | null = null;
  let revisionStartError: string | null = null;
  let revisionMessageTextArea: HTMLTextAreaElement | null = null;

  const defaultRevisionName = `${getDefaultRevisionName()}`;
  const revisionNameRequirement = getRevisionNameRequirement();

  $: latest = revisionList[0] ?? null;
  $: revisionStart = !latest ? defaultRevisionName : null;
  $: revisionStartError = revisionStart ? validateRevisionName(revisionStart) : null;

  $: baseFilename = filePath ? separateFilenameFromPath(filePath).filename : '';

  // Matching an older revision still allows a new one: returning to it is worth recording.
  $: workingCopyStatus = getWorkingCopyStatus(
    hasCreateRevisionPermission,
    $activeDocumentIsDirty,
    doesWorkingCopyMatchLatestRevision,
    matchingRevisionName,
  );
  $: createDisabled = getCreateDisabled(
    hasCreateRevisionPermission,
    $activeDocumentIsDirty,
    doesWorkingCopyMatchLatestRevision,
  );
  $: restoreDisabledReason = getRestoreDisabledReason(hasRestoreRevisionPermission, isReadOnly, $activeDocumentIsDirty);

  // The saved copy moves on open, save and restore (baseEtag). User-metadata edits happen in the Metadata tab, and
  // switching back remounts this panel. readOnly is runtime state, not part of a revision, so it never reloads.
  // baseEtag is pulled out so keystrokes (which change $activeDocument) don't refetch.
  $: baseEtag = $activeDocument.baseEtag;

  // Trigger autosize when commitMessage changes
  $: {
    void commitMessage;
    resizeTextArea();
  }

  function getWorkingCopyStatus(
    hasPermission: boolean,
    isDirty: boolean,
    doesWorkingCopyMatchLatestRevision: boolean,
    matchingRevisionName: WorkspaceRevisionName | null,
  ): string | null {
    if (!hasPermission) {
      return "You don't have permission to create revisions.";
    }
    if (isDirty) {
      return 'Save your changes before creating a revision.';
    }
    if (doesWorkingCopyMatchLatestRevision) {
      return 'The saved copy matches the latest revision.';
    }
    if (matchingRevisionName !== null && matchingRevisionName !== '') {
      return `The saved copy matches revision ${getRevisionDisplayName(matchingRevisionName)}`;
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

  async function onCreate() {
    if (!filePath || doesWorkingCopyMatchLatestRevision || (!latest && revisionStartError)) {
      return;
    }
    isCreating = true;
    notice = null;
    try {
      let revision: WorkspaceRevisionName | null = null;
      if (latest) {
        revision = await WorkspaceApi.createFileRevision($workspaceId, filePath, baseEtag, commitMessage, $user);
      } else {
        revision = await WorkspaceApi.createFileRevision(
          $workspaceId,
          filePath,
          baseEtag,
          commitMessage,
          $user,
          revisionStart,
        );
      }
      commitMessage = '';
      showSuccessToast(`Created revision ${getRevisionDisplayName(revision)}`);
      logMessage('log', `Created revision ${revision} for workspace file "${filePath}"`);
    } catch (e) {
      // The revision exists but the list can't show it yet; a retry would create the next one.
      if (
        e instanceof CompoundError &&
        e.errors.some(({ type }) => (type as string) === 'WORKSPACE_REVISION_NOT_INDEXED')
      ) {
        notice = "Revision created, but it isn't available in the list yet.";
        catchError('log', `Revision created but not available in list: ${revisionStart}`, e);
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
  async function resizeTextArea() {
    if (!revisionMessageTextArea) {
      return;
    }
    // Wait for Svelte to update the DOM with the new text content
    await tick();

    revisionMessageTextArea.style.height = 'auto';
    revisionMessageTextArea.style.height = `${revisionMessageTextArea.scrollHeight}px`;
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
              <section class="flex flex-col gap-1" aria-label="Create revision">
                <label class="flex flex-col gap-1" for="revision-commit-message">
                  <span>Revision description <span class="text-muted-foreground">(optional)</span></span>
                  <textarea
                    bind:this={revisionMessageTextArea}
                    bind:value={commitMessage}
                    id="revision-commit-message"
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
                <div
                  class="flex min-h-[26px] items-center gap-2"
                  use:permissionHandler={{
                    hasPermission: hasCreateRevisionPermission,
                    permissionError: 'You do not have permission to create a revision',
                  }}
                >
                  <Button
                    class="w-fit"
                    disabled={createDisabled || isCreating || (!latest && !!revisionStartError)}
                    on:click={onCreate}
                  >
                    {isCreating ? 'Creating…' : 'Create revision'}
                  </Button>
                  {#if !latest && revisionStart !== null}
                    <div class="grid h-full grid-cols-[auto_1fr] items-center gap-2">
                      <span>starting with revision</span>
                      <input
                        id="revision-start"
                        type="text"
                        title={revisionNameRequirement}
                        bind:value={revisionStart}
                        placeholder={defaultRevisionName}
                        aria-invalid={revisionStartError ? 'true' : 'false'}
                        aria-describedby={revisionStartError ? 'revision-start-error' : undefined}
                        aria-label="Starting revision name"
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
              <section class="flex flex-col gap-1" aria-label="Revision History">
                <span class="font-medium text-muted-foreground">Revision History</span>
                {#if latest}
                  <ul class="flex flex-col overflow-hidden rounded border border-border" aria-label="Revisions">
                    {#each revisionList as revision, i (revision.name)}
                      {@const revisionDisplayName = getRevisionDisplayName(revision.name)}
                      <li class={i > 0 ? 'border-t border-border' : ''}>
                        <div
                          class="grid grid-cols-[1fr_24px]"
                          role="region"
                          aria-label="Revision {revisionDisplayName}"
                        >
                          <Tooltip
                            wrapperClass="w-full overflow-hidden"
                            content="Preview revision {revisionDisplayName}"
                          >
                            <button
                              class="h-full w-full items-baseline overflow-hidden px-2 py-1.5 text-left hover:bg-muted"
                              aria-label="Preview revision {revisionDisplayName}"
                              on:click={() => onPreview(revision)}
                            >
                              <div class="flex h-full w-full flex-col gap-1 overflow-hidden">
                                <div class="font-semibold">
                                  Revision {revisionDisplayName}
                                </div>
                                <div class="min-h-4 w-full">
                                  <Tooltip
                                    wrapperClass="w-full overflow-hidden"
                                    wrapContent={true}
                                    class="max-w-xs whitespace-normal break-words"
                                    content={revision.message}
                                    disabled={!revision.message}
                                    side="left"
                                  >
                                    <span class="w-full overflow-hidden text-ellipsis text-nowrap"
                                      >{revision.message}</span
                                    >
                                  </Tooltip>
                                </div>
                                <div class="text-left text-muted-foreground">
                                  <span>Created By:</span>
                                  <span class="truncate">{revision.createdBy ?? 'Unknown'}</span>
                                  <span>at {getShortISOForDate(new Date(revision.createdAt))}</span>
                                </div>
                              </div>
                            </button>
                          </Tooltip>
                          <div class="grid grid-rows-2 justify-items-end gap-1">
                            <DropdownMenu.Root>
                              <Tooltip content="More options">
                                <DropdownMenu.Trigger asChild let:builder>
                                  <Button
                                    class="text-muted-foreground hover:text-foreground"
                                    variant="ghost"
                                    size="icon"
                                    builders={[builder]}
                                    aria-label="More options"
                                    on:click={e => e.stopPropagation()}
                                  >
                                    <EllipsisVertical size={20} />
                                  </Button>
                                </DropdownMenu.Trigger></Tooltip
                              >
                              <DropdownMenu.Content align="end">
                                {@const { extension } = separateFilenameFromExtension(baseFilename)}
                                {@const versionedFilename = getVersionedFileName(baseFilename, revision.name)}
                                {@const { extension: versionedExtension } =
                                  separateFilenameFromExtension(versionedFilename)}
                                <DropdownMenu.Item
                                  class="flex items-center gap-2"
                                  size="sm"
                                  aria-label={`Download (...${extension})`}
                                  on:click={() => onDownloadRevision(revision, baseFilename)}
                                >
                                  <Download size={14} class="shrink-0" />
                                  Download (...{extension})
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  class="flex items-center gap-2"
                                  size="sm"
                                  aria-label={`Download (${versionedExtension})`}
                                  on:click={() => onDownloadRevision(revision, versionedFilename)}
                                >
                                  <Download size={14} class="shrink-0" />
                                  Download ({versionedExtension})
                                </DropdownMenu.Item>
                                <div
                                  use:permissionHandler={{
                                    hasPermission: hasRestoreRevisionPermission,
                                    permissionError: 'You do not have permission to restore this revision',
                                  }}
                                >
                                  <DropdownMenu.Item
                                    class="flex items-center gap-2"
                                    size="sm"
                                    aria-label={`Restore file to revision ${revisionDisplayName}`}
                                    on:click={() => onRestore(revision)}
                                  >
                                    <RotateCcwClock size={10} />
                                    Restore file to revision {revisionDisplayName}
                                  </DropdownMenu.Item>
                                </div>
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                          </div>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <div class="text-muted-foreground">No revisions yet.</div>
                {/if}
              </section>
            </div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>
