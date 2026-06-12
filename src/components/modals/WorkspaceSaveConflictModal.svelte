<svelte:options immutable={true} />

<script lang="ts">
  import type { Extension } from '@codemirror/state';
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { WorkspaceContentType } from '../../enums/workspace';
  import type { User } from '../../types/app';
  import { WorkspaceRequestError, type WorkspaceSaveConflictReason } from '../../utilities/requests';
  import { getTimeAgo } from '../../utilities/time';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import WorkspaceDiffViewer from '../workspace/WorkspaceDiffViewer.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  /** Opt into the hand-merge UX (editable pane). Off by default → read-only take mine/theirs. */
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
    takeMine: { content: string; token: string | null };
    takeTheirs: { content: string; token: string | null };
  }>();

  let diffViewer: WorkspaceDiffViewer | undefined;
  let isLoading: boolean = true;
  let loadError: boolean = false;
  let theirsContent: string | null = null;
  let theirsToken: string | null = null;
  // Seed the variant from the 412 reason; the re-GET below is authoritative.
  let variant: WorkspaceSaveConflictReason = reason === 'deleted' ? 'deleted' : 'conflict';

  $: editedByText = lastEditedBy ?? 'another user';
  $: whenText = lastEditedAt ? getTimeAgo(new Date(lastEditedAt)) : '';

  async function loadTheirs() {
    // Re-fetch the server's version for the diff. A 404 means it was deleted. Any other
    // failure is transient — the 412 proved the file exists, so don't assume deletion
    // (Recreate would overwrite their change); show a retry and keep the doc dirty.
    isLoading = true;
    loadError = false;
    try {
      const { content, etag } = await WorkspaceApi.getFileContent(workspaceId, path, user);
      theirsContent = content;
      theirsToken = etag;
      variant = 'conflict';
    } catch (e) {
      if (e instanceof WorkspaceRequestError && e.status === 404) {
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
    // Save the "Mine" pane against the version shown (theirsToken). If the file moved again,
    // the save 412s and the diff re-opens rather than overwriting unseen changes.
    dispatch('takeMine', { content: diffViewer?.getMergedContent() ?? mineContent, token: theirsToken });
  }

  function onTakeTheirs() {
    dispatch('takeTheirs', { content: theirsContent ?? '', token: theirsToken });
  }

  function onRecreate() {
    dispatch('recreate');
  }

  function onDiscard() {
    dispatch('discard');
  }
</script>

<Modal height="min(680px, 85vh)" width="min(1100px, 92vw)" on:close>
  <ModalHeader on:close>
    {variant === 'deleted' && !loadError ? 'File deleted or moved' : 'This file changed since you opened it'}
  </ModalHeader>
  <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
    <div class="st-typography-body flex flex-none flex-col gap-1.5">
      {#if loadError}
        <span
          ><b>{fileName}</b> was changed by user @{editedByText}
          {whenText ? ` ${whenText}` : ''}, but the latest version couldn't be loaded to compare.</span
        >
      {:else if variant === 'deleted'}
        <span
          ><b>{fileName}</b> was deleted or moved by user @{editedByText}
          {whenText ? ` ${whenText}` : ''}. Your unsaved changes are shown below.</span
        >
      {:else if allowMerge}
        <span
          ><b>{fileName}</b> was changed by user @{editedByText}
          {whenText ? ` ${whenText}` : ''}. Edit your version on the right — use the arrows to pull in theirs — then
          Save, or take theirs to discard your changes.</span
        >
      {:else}
        <span
          ><b>{fileName}</b> was changed by user @{editedByText}
          {whenText ? ` ${whenText}` : ''}. Review the differences, then choose how to resolve.</span
        >
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
        />
      {/if}
    </div>
  </ModalContent>
  <ModalFooter>
    <div class="flex gap-2">
      {#if loadError}
        <Button variant="outline" on:click={() => dispatch('close')}>Cancel</Button>
        <Button variant="default" on:click={loadTheirs}>Retry</Button>
      {:else if variant === 'deleted'}
        <Button variant="outline" on:click={onDiscard}>Discard &amp; close</Button>
        <Button variant="default" on:click={onRecreate}>Recreate file</Button>
      {:else}
        <Button on:click={onTakeTheirs} disabled={isLoading}>Take theirs (discard mine)</Button>
        <Button variant="outline" on:click={() => dispatch('close')}>Cancel</Button>
        {#if allowMerge}
          <Button on:click={onTakeMine} disabled={isLoading}>Save</Button>
        {:else}
          <Button variant="destructive" on:click={onTakeMine} disabled={isLoading}>Take mine (overwrite)</Button>
        {/if}
      {/if}
    </div>
  </ModalFooter>
</Modal>
