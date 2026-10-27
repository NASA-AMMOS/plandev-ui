<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { WorkspaceContentType } from '../../enums/workspace';
  import type { User } from '../../types/app';
  import type { Side, SideState, WorkspaceFileRevision } from '../../types/workspace';
  import { downloadBlob } from '../../utilities/generic';
  import {
    getDownloadOptionsForFile,
    getVersionedFileName,
    separateFilenameFromPath,
    WorkspaceApi,
  } from '../../utilities/workspaces';
  import DownloadMenu from '../ui/DownloadMenu.svelte';
  import WorkspaceDiffViewer from '../workspace/WorkspaceDiffViewer/WorkspaceDiffViewer.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentContent: string;
  /** "Working copy", or "Current editor (unsaved)" when comparing against unsaved edits. */
  export let filePath: string;
  /** Why Restore is unavailable regardless of which sides are selected; null when permission/dirty state allow it. */
  export let restoreDisabledReason: string | null = null;
  /** The revision that was clicked to open this modal; preselected on the right. */
  export let revision: WorkspaceFileRevision;
  export let type: WorkspaceContentType | null = null;
  /** Extra confirm-step warning, e.g. saved changes that no revision holds. */
  export let unrevisionedWarning: string | null = null;
  export let user: User | null = null;
  export let workspaceId: number;

  const dispatch = createEventDispatcher<{ close: void; restore: { revision: WorkspaceFileRevision } }>();
  // Runtime/derived fields: not part of a revision, so not a difference.
  const unversionedKeys = ['lastEditedAt', 'lastEditedBy', 'readOnly'];
  const emptySideState: SideState = {
    content: '',
    error: false,
    lastEditedAt: null,
    lastEditedBy: null,
    loading: true,
    message: '',
    metadata: null,
    pathAtRevision: '',
  };

  let changedLines: number = 0;
  let effectiveRestoreDisabledReason: string | null;
  let filename: string = '';
  let isLoading: boolean;
  let leftDownloadOptions: ReturnType<typeof getDownloadOptionsForFile>;
  let leftLabel: string;
  let leftSide: Side = { kind: 'workingCopy' };
  let leftState: SideState = { ...emptySideState };
  let loadError: boolean;
  let metadataDiffers: boolean;
  let pathDiffers: boolean;
  let revisionToRestore: WorkspaceFileRevision | null;
  let rightDownloadOptions: ReturnType<typeof getDownloadOptionsForFile>;
  let rightLabel: string;
  let rightRevision: WorkspaceFileRevision = revision;
  let rightState: SideState = { ...emptySideState };

  $: ({ filename } = separateFilenameFromPath(filePath));
  $: isLoading = leftState.loading || rightState.loading;
  $: loadError = leftState.error || rightState.error;
  $: metadataDiffers =
    !isLoading && !loadError && canonical(leftState.metadata) !== canonical(rightState.metadata ?? {});
  $: pathDiffers = !isLoading && !loadError && leftState.pathAtRevision !== rightState.pathAtRevision;
  $: revisionToRestore = leftSide.kind === 'workingCopy' ? rightRevision : null;
  $: effectiveRestoreDisabledReason =
    restoreDisabledReason ??
    (!revisionToRestore ? 'Restoring is only available when comparing against the working copy.' : null);
  $: leftLabel = sideLabel(leftSide);
  $: rightRevision = revision;
  $: rightLabel = getVersionedFileName(filename, rightRevision.name);
  $: leftDownloadOptions = getDownloadOptionsForFile(
    filename,
    leftSide.kind === 'revision',
    leftSide.kind === 'revision' ? leftSide.revision.name : null,
  );
  $: rightDownloadOptions = getDownloadOptionsForFile(filename, true, rightRevision.name);

  function sideLabel(side: Side): string {
    return side.kind === 'workingCopy' ? `${filename}` : getVersionedFileName(filename, side.revision.name);
  }

  async function loadRevisionState(rev: WorkspaceFileRevision): Promise<SideState> {
    try {
      const [{ content }, data] = await Promise.all([
        WorkspaceApi.getFileRevisionContent(workspaceId, filePath, rev.name, user),
        WorkspaceApi.getFileRevision(workspaceId, filePath, rev.name, user),
      ]);
      return {
        content,
        error: false,
        lastEditedAt: rev.lastEditedAt,
        lastEditedBy: rev.lastEditedBy,
        loading: false,
        message: rev.message,
        metadata: data.fileMetadata,
        pathAtRevision: rev.pathAtRevision,
      };
    } catch {
      return {
        content: '',
        error: true,
        lastEditedAt: null,
        lastEditedBy: null,
        loading: false,
        message: '',
        metadata: null,
        pathAtRevision: '',
      };
    }
  }

  async function loadSide(side: Side): Promise<SideState> {
    if (side.kind === 'workingCopy') {
      try {
        const metadata = await WorkspaceApi.getFileMetadata(workspaceId, filePath, user);
        return {
          content: currentContent,
          error: false,
          lastEditedAt: metadata?.lastEditedAt ?? null,
          lastEditedBy: metadata?.lastEditedBy ?? null,
          loading: false,
          message: '',
          metadata,
          pathAtRevision: filePath,
        };
      } catch {
        return {
          content: '',
          error: true,
          lastEditedAt: null,
          lastEditedBy: null,
          loading: false,
          message: '',
          metadata: null,
          pathAtRevision: filePath,
        };
      }
    }
    return loadRevisionState(side.revision);
  }

  async function selectLeft(side: Side) {
    leftSide = side;
    leftState = { ...emptySideState };
    leftState = await loadSide(side);
  }

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
    dispatch('close');
  }

  function onRestore() {
    if (revisionToRestore && !effectiveRestoreDisabledReason && !isLoading && !loadError) {
      dispatch('restore', { revision: revisionToRestore });
    }
  }

  /** Downloads a side's already-loaded content under the given name (plain, or with its revision letter). */
  function onDownloadSide(state: SideState, name: string) {
    if (state.loading || state.error) {
      return;
    }
    downloadBlob(new Blob([state.content], { type: 'text/plain' }), name);
  }

  onMount(async () => {
    selectLeft(leftSide);
    rightState = await loadRevisionState(rightRevision);
  });
</script>

<Modal height="min(680px, 85vh)" width="min(1200px, 92vw)" on:close={close}>
  <ModalHeader on:close={close}>Restore {filename} to {rightLabel}?</ModalHeader>
  <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
    <div class="grid grid-cols-2"></div>
    <div class="st-typography-body flex-none text-muted-foreground">
      {#if !isLoading && !loadError}
        {#if changedLines > 0}
          Content contains: {changedLines} changed {changedLines === 1 ? 'line' : 'lines'}
        {:else}
          No content changes
        {/if}
        {#if metadataDiffers}· File metadata differs{/if}
        {#if pathDiffers}· File path differs ({leftState.pathAtRevision} vs {rightState.pathAtRevision}){/if}
      {/if}
    </div>
    <div class="flex min-h-0 flex-auto overflow-hidden rounded border">
      {#if isLoading}
        <div class="flex w-full items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle class="animate-spin" size={16} /> Loading…
        </div>
      {:else if loadError}
        <div class="flex w-full items-center justify-center gap-2 text-muted-foreground">
          <TriangleAlert size={16} /> Couldn't load one of these revisions.
        </div>
      {:else}
        <WorkspaceDiffViewer
          theirs={leftState.content}
          theirsLabel={leftLabel}
          theirsEditBy={leftState.lastEditedBy}
          theirsEditedAt={leftState.lastEditedAt}
          theirsMessage={leftState.message}
          mine={rightState.content}
          mineLabel={rightLabel}
          mineEditBy={rightState.lastEditedBy}
          mineEditedAt={rightState.lastEditedAt}
          mineMessage={rightState.message}
          {type}
          on:stats={e => (changedLines = e.detail.changedLines)}
        >
          <div slot="theirs-header-slot">
            <div class="grid grid-cols-[auto_min-content] items-center gap-2">
              <span>(Working Copy)</span>
              <DownloadMenu
                align="start"
                className="px-2"
                size="icon"
                disabled={leftState.loading || leftState.error}
                label="Download {leftLabel}"
                options={leftDownloadOptions}
                on:download={e => onDownloadSide(leftState, e.detail.name)}
              />
            </div>
          </div>
          <div class="inline-block text-nowrap text-xs text-muted-foreground" slot="mine-header-slot">
            <DownloadMenu
              align="start"
              className="px-2"
              size="icon"
              disabled={rightState.loading || rightState.error}
              label="Download {rightLabel}"
              options={rightDownloadOptions}
              on:download={e => onDownloadSide(rightState, e.detail.name)}
            />
          </div>
        </WorkspaceDiffViewer>
      {/if}
    </div>
  </ModalContent>
  <div class="flex flex-none items-center justify-end gap-2 rounded-b border-t bg-muted px-4 py-3">
    {#if revisionToRestore}
      <div class="mr-auto flex flex-col text-sm">
        <span class="font-semibold">Restore revision {revisionToRestore.name}?</span>
        <span class="text-muted-foreground">
          The working copy will be replaced with revision {revisionToRestore.name}. Existing revisions will not be
          changed.
        </span>
        {#if unrevisionedWarning}
          <span class="text-destructive">{unrevisionedWarning}</span>
        {/if}
      </div>
      {#if effectiveRestoreDisabledReason}
        <span class="mr-auto text-sm text-muted-foreground">{effectiveRestoreDisabledReason}</span>
      {/if}
      <div class="flex gap-2 self-end">
        <Button variant="outline" on:click={close}>Cancel</Button>
        <Button
          variant="destructive"
          disabled={!!effectiveRestoreDisabledReason || isLoading || !!loadError}
          on:click={onRestore}
        >
          Restore
        </Button>
      </div>
    {/if}
  </div>
</Modal>
