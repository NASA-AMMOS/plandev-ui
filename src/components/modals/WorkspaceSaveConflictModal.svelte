<svelte:options immutable={true} />

<script lang="ts">
  import type { Extension } from '@codemirror/state';
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { WorkspaceContentType } from '../../enums/workspace';
  import type { User } from '../../types/app';
  import { isNoSuchFileCompoundError } from '../../utilities/errors';
  import type { WorkspaceSaveConflictReason } from '../../utilities/requests';
  import { getTimeAgo } from '../../utilities/time';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import WorkspaceDiffViewer from '../workspace/WorkspaceDiffViewer.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let allowMerge: boolean = false;
  export let fileName: string;
  export let languageExtension: Extension | null = null;
  export let lastEditedAt: string | undefined = undefined;
  export let lastEditedBy: string | undefined = undefined;
  export let mineContent: string;
  export let path: string;
  export let reason: WorkspaceSaveConflictReason;
  export let type: WorkspaceContentType | null = null;
  export let user: User | null = null;
  export let workspaceId: number;

  const dispatch = createEventDispatcher<{
    close: void;
    discard: void;
    recreate: void;
    takeMine: { content: string; etag: string | null };
    takeTheirs: { content: string; etag: string | null };
  }>();

  let changedLines: number = 0;
  let diffViewer: WorkspaceDiffViewer | undefined;
  let editedByText: string = '';
  let whenText: string = '';
  let isLoading: boolean = true;
  let loadError: boolean = false;
  let theirsContent: string | null = null;
  let theirsEtag: string | null = null;
  let variant: WorkspaceSaveConflictReason = reason === 'deleted' ? 'deleted' : 'conflict';

  $: editedByText = lastEditedBy ?? 'another user';
  $: whenText = lastEditedAt ? getTimeAgo(new Date(lastEditedAt)) : '';
  $: changedLinesText = changedLines > 0 ? ` · ${changedLines} changed ${changedLines === 1 ? 'line' : 'lines'}` : '';

  async function loadTheirs() {
    // Re-fetch the server's version for the diff. A 404 means it was deleted. Any other
    // failure is transient — the 412 proved the file exists, so don't assume deletion
    // (Recreate would overwrite their change) and just show a retry and keep the doc dirty.
    isLoading = true;
    loadError = false;
    try {
      const { content, etag } = await WorkspaceApi.getFileContent(workspaceId, path, user);
      theirsContent = content;
      theirsEtag = etag;
      variant = 'conflict';
    } catch (e) {
      if (isNoSuchFileCompoundError(e)) {
        variant = 'deleted';
      } else {
        loadError = true;
      }
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadTheirs();
  });

  function onTakeMine() {
    // Save the "Mine" pane against the version shown (theirsEtag). If the file moved again,
    // the save 412s and the diff re-opens rather than overwriting unseen changes.
    dispatch('takeMine', { content: diffViewer?.getMergedContent() ?? mineContent, etag: theirsEtag });
  }

  async function onTakeTheirs() {
    // Re-fetch so "take theirs" applies the *latest* server version, not the snapshot from when
    // the modal opened — someone may have saved again while it was open. A 404 means it was since
    // deleted, so switch to the deleted flow instead of loading empty content; any other failure
    // is transient, so show the retry prompt and keep the doc dirty.
    isLoading = true;
    loadError = false;
    try {
      const { content, etag } = await WorkspaceApi.getFileContent(workspaceId, path, user);
      dispatch('takeTheirs', { content, etag });
    } catch (e) {
      if (isNoSuchFileCompoundError(e)) {
        theirsContent = null;
        variant = 'deleted';
      } else {
        loadError = true;
      }
      isLoading = false;
    }
  }

  function onRecreate() {
    dispatch('recreate');
  }

  function onDiscard() {
    dispatch('discard');
  }
</script>

<Modal height="min(680px, 85vh)" width="min(1200px, 92vw)" on:close>
  <ModalHeader on:close>
    {variant === 'deleted' && !loadError ? 'File deleted or moved' : 'This file was changed by someone else'}
  </ModalHeader>
  <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
    <div class="st-typography-body flex flex-none flex-col gap-1.5">
      {#if loadError}
        <span
          ><b>{fileName}</b> was changed by user @{editedByText}
          {whenText ? ` ${whenText}` : ''}, but the latest version couldn't be loaded to compare.
        </span>
      {:else if variant === 'deleted'}
        <span>
          <b>{fileName}</b> was deleted or moved{whenText ? ` ${whenText}` : ''}. Your unsaved changes are shown below.
        </span>
      {:else if allowMerge}
        <span>
          <b>{fileName}</b> · edited by @{editedByText}{whenText ? ` ${whenText}` : ''}{changedLinesText}. Edit your
          version on the right — use the arrows to pull in theirs — then Save, or keep theirs to discard your changes.
        </span>
      {:else}
        <span>
          <b>{fileName}</b> · edited by @{editedByText}{whenText ? ` ${whenText}` : ''}{changedLinesText}. Choose which
          version to keep.
        </span>
      {/if}
    </div>

    <div class="flex min-h-0 flex-auto overflow-hidden rounded border">
      {#if isLoading}
        <div class="st-typography-body flex w-full items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle class="animate-spin" size={16} />
          <span>Loading the latest version…</span>
        </div>
      {:else if loadError}
        <div
          class="st-typography-body flex w-full items-center justify-center gap-2 px-4 text-center text-muted-foreground"
        >
          <TriangleAlert size={16} />
          <span
            >Couldn't load the latest version of this file. Your unsaved changes are preserved — retry, or cancel and
            try saving again.</span
          >
        </div>
      {:else if variant === 'deleted'}
        <WorkspaceDiffViewer mine={mineContent} theirs={null} {type} {languageExtension} />
      {:else}
        <WorkspaceDiffViewer
          bind:this={diffViewer}
          mine={mineContent}
          theirs={theirsContent}
          {type}
          {languageExtension}
          editable={allowMerge}
          on:stats={e => (changedLines = e.detail.changedLines)}
        />
      {/if}
    </div>
  </ModalContent>
  <!-- All variants share one gray footer bar so the white buttons read strong by contrast, with no
       filled treatment; each lossy path spells out its consequence in a subline. -->
  <div class="flex flex-none flex-col gap-2 rounded-b border-t bg-muted px-4 py-3">
    {#if loadError}
      <div class="flex justify-center">
        <Button size="lg" variant="outline" on:click={loadTheirs}>Retry</Button>
      </div>
    {:else if variant === 'deleted'}
      <div class="flex gap-3">
        <Button size="lg" variant="outline" class="h-auto flex-1 flex-col gap-0.5 py-2" on:click={onDiscard}>
          <span class="font-semibold text-destructive">Discard &amp; close</span>
          <span class="text-xs font-normal text-muted-foreground">Discards your unsaved edits</span>
        </Button>
        <Button size="lg" variant="outline" class="h-auto flex-1 flex-col gap-0.5 py-2" on:click={onRecreate}>
          <span class="font-semibold">Recreate file</span>
          <span class="text-xs font-normal text-muted-foreground">Saves your edits as a new file</span>
        </Button>
      </div>
    {:else if !isLoading}
      <div class="flex gap-3">
        <Button size="lg" variant="outline" class="h-auto flex-1 flex-col gap-0.5 py-2" on:click={onTakeTheirs}>
          <span class="font-semibold">Keep theirs</span>
          <span class="text-xs font-normal text-muted-foreground">Discards your unsaved edits</span>
        </Button>
        {#if allowMerge}
          <Button size="lg" class="h-auto flex-1 flex-col gap-0.5 py-2" on:click={onTakeMine}>
            <span class="font-semibold">Save merged</span>
            <span class="text-xs font-normal text-muted-foreground">Saves your version to the server</span>
          </Button>
        {:else}
          <Button size="lg" variant="outline" class="h-auto flex-1 flex-col gap-0.5 py-2" on:click={onTakeMine}>
            <span class="font-semibold">Keep mine</span>
            <span class="text-xs font-normal text-muted-foreground">Overwrites the server copy</span>
          </Button>
        {/if}
      </div>
    {/if}
    <div class="flex justify-center">
      <Button variant="ghost" class="hover:bg-muted-foreground/10" on:click={() => dispatch('close')}
        >Keep editing</Button
      >
    </div>
  </div>
</Modal>
