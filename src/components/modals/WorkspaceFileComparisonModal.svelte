<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { User } from '../../types/app';
  import type { Side, SideState, WorkspaceFileRevision } from '../../types/workspace';
  import { downloadBlob } from '../../utilities/generic';
  import {
    getDownloadOptionsForFile,
    getRevisionDisplayName,
    getVersionedFileName,
    separateFilenameFromPath,
    WorkspaceApi,
  } from '../../utilities/workspaces';
  import DownloadMenu from '../ui/DownloadMenu.svelte';
  import WorkspaceDiffViewer from '../workspace/WorkspaceDiffViewer/WorkspaceDiffViewer.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let leftFilePath: string;
  export let rightFilePath: string;
  export let type: WorkspaceContentType | null = null;
  export let user: User | null = null;
  export let workspaceId: number;

  const dispatch = createEventDispatcher<{ close: void }>();
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
  let isLoading: boolean;
  let leftDownloadOptions: ReturnType<typeof getDownloadOptionsForFile>;
  let leftFilename: string;
  let leftLabel: string;
  let leftRevisions: WorkspaceFileRevision[] = [];
  let leftSide: Side = { kind: 'workingCopy' };
  let leftState: SideState = { ...emptySideState };
  let loadError: boolean;
  let metadataDiffers: boolean;
  let rightDownloadOptions: ReturnType<typeof getDownloadOptionsForFile>;
  let rightFilename: string;
  let rightLabel: string;
  let rightRevisions: WorkspaceFileRevision[] = [];
  let rightSide: Side = { kind: 'workingCopy' };
  let rightState: SideState = { ...emptySideState };

  $: ({ filename: leftFilename } = separateFilenameFromPath(leftFilePath));
  $: ({ filename: rightFilename } = separateFilenameFromPath(rightFilePath));
  $: isLoading = leftState.loading || rightState.loading;
  $: loadError = leftState.error || rightState.error;
  $: metadataDiffers =
    !isLoading && !loadError && canonical(leftState.metadata) !== canonical(rightState.metadata ?? {});
  $: leftLabel = sideLabel(leftFilename, leftSide);
  $: rightLabel = sideLabel(rightFilename, rightSide);
  $: leftDownloadOptions = getDownloadOptionsForFile(
    leftFilename,
    leftSide.kind === 'revision',
    leftSide.kind === 'revision' ? leftSide.revision.name : null,
  );
  $: rightDownloadOptions = getDownloadOptionsForFile(
    rightFilename,
    rightSide.kind === 'revision',
    rightSide.kind === 'revision' ? rightSide.revision.name : null,
  );

  function sideLabel(filename: string, side: Side): string {
    return side.kind === 'workingCopy'
      ? `${filename} (Working copy)`
      : getVersionedFileName(filename, side.revision.name);
  }

  function sideKey(side: Side): string {
    return side.kind === 'workingCopy' ? 'workingCopy' : side.revision.name;
  }

  function sideFromKey(key: string, revisions: WorkspaceFileRevision[]): Side {
    if (key === 'workingCopy') {
      return { kind: 'workingCopy' };
    }
    const found = revisions.find(r => r.name === key);
    return found ? { kind: 'revision', revision: found } : { kind: 'workingCopy' };
  }

  async function loadRevisionsFor(filePath: string): Promise<WorkspaceFileRevision[]> {
    try {
      const { revisions } = await WorkspaceApi.getFileRevisionList(workspaceId, filePath, user);
      return revisions;
    } catch {
      return [];
    }
  }

  async function loadSide(filePath: string, side: Side): Promise<SideState> {
    try {
      if (side.kind === 'workingCopy') {
        const [{ content }, metadata] = await Promise.all([
          WorkspaceApi.getFileContent(workspaceId, filePath, user),
          WorkspaceApi.getFileMetadata(workspaceId, filePath, user),
        ]);
        return {
          content,
          error: false,
          lastEditedAt: metadata?.lastEditedAt ?? null,
          lastEditedBy: metadata?.lastEditedBy ?? null,
          loading: false,
          message: '',
          metadata,
          pathAtRevision: filePath,
        };
      }
      const [{ content }, { fileMetadata }] = await Promise.all([
        WorkspaceApi.getFileRevisionContent(workspaceId, filePath, side.revision.name, user),
        WorkspaceApi.getFileRevision(workspaceId, filePath, side.revision.name, user),
      ]);
      return {
        content,
        error: false,
        lastEditedAt: side.revision.lastEditedAt,
        lastEditedBy: side.revision.lastEditedBy,
        loading: false,
        message: side.revision.message,
        metadata: fileMetadata,
        pathAtRevision: filePath,
      };
    } catch (error) {
      console.error('Error loading side:', error);
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

  async function selectLeft(side: Side) {
    leftSide = side;
    leftState = { ...emptySideState };
    leftState = await loadSide(leftFilePath, side);
  }

  async function selectRight(side: Side) {
    rightSide = side;
    rightState = { ...emptySideState };
    rightState = await loadSide(rightFilePath, side);
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

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    });
  }

  function close() {
    dispatch('close');
  }

  /** Downloads a side's already-loaded content under the given name (plain, or with its revision letter). */
  function onDownloadSide(state: SideState, name: string) {
    if (state.loading || state.error) {
      return;
    }
    downloadBlob(new Blob([state.content], { type: 'text/plain' }), name);
  }

  onMount(async () => {
    [leftRevisions, rightRevisions] = await Promise.all([
      loadRevisionsFor(leftFilePath),
      loadRevisionsFor(rightFilePath),
    ]);
    selectLeft(leftSide);
    selectRight(rightSide);
  });
</script>

<Modal height="min(680px, 85vh)" width="min(1200px, 92vw)" on:close={close}>
  <ModalHeader on:close={close}>Comparing {leftLabel} with {rightLabel}</ModalHeader>
  <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
    <div class="st-typography-body flex-none text-muted-foreground">
      {#if !isLoading && !loadError}
        {#if changedLines > 0}
          Content contains: {changedLines} changed {changedLines === 1 ? 'line' : 'lines'}
        {:else}
          No content changes
        {/if}
        {#if metadataDiffers}· File metadata differs{/if}
      {/if}
    </div>
    <div class="flex min-h-0 flex-auto overflow-hidden rounded border">
      {#if isLoading}
        <div class="flex w-full items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle class="animate-spin" size={16} /> Loading…
        </div>
      {:else if loadError}
        <div class="flex w-full items-center justify-center gap-2 text-muted-foreground">
          <TriangleAlert size={16} /> Couldn't load one of these files.
        </div>
      {:else}
        <WorkspaceDiffViewer
          theirs={leftState.content}
          theirsFilePath={leftFilePath}
          theirsLabel={leftLabel}
          theirsEditBy={leftState.lastEditedBy}
          theirsEditedAt={leftState.lastEditedAt}
          theirsMessage={leftState.message}
          mine={rightState.content}
          mineFilePath={rightFilePath}
          mineLabel={rightLabel}
          mineEditBy={rightState.lastEditedBy}
          mineEditedAt={rightState.lastEditedAt}
          mineMessage={rightState.message}
          {type}
          on:stats={e => (changedLines = e.detail.changedLines)}
        >
          <div class="inline-block text-nowrap text-xs text-muted-foreground" slot="theirs-header-slot">
            <div class="flex flex-none flex-wrap items-center gap-2 text-sm">
              <select
                class="st-select"
                value={sideKey(leftSide)}
                on:change={e => selectLeft(sideFromKey(e.currentTarget.value, leftRevisions))}
              >
                <option value="workingCopy">{leftLabel}</option>
                {#each leftRevisions as rev (rev.name)}
                  <option value={rev.name}
                    >Revision {getRevisionDisplayName(rev.name)} · {formatDate(rev.createdAt)}</option
                  >
                {/each}
              </select>
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
            <div class="flex flex-none flex-wrap items-center gap-2 text-sm">
              <select
                class="st-select"
                value={sideKey(rightSide)}
                on:change={e => selectRight(sideFromKey(e.currentTarget.value, rightRevisions))}
              >
                <option value="workingCopy">{rightLabel}</option>
                {#each rightRevisions as rev (rev.name)}
                  <option value={rev.name}
                    >Revision {getRevisionDisplayName(rev.name)} · {formatDate(rev.createdAt)}</option
                  >
                {/each}
              </select>
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
          </div>
        </WorkspaceDiffViewer>
      {/if}
    </div>
  </ModalContent>
  <div class="flex flex-none items-center justify-end gap-3 rounded-b border-t bg-muted px-4 py-3">
    <Button variant="outline" on:click={close}>Close</Button>
  </div>
</Modal>
