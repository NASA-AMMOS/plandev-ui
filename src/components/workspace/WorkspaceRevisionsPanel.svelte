<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { WorkspaceFileRevision } from '../../types/workspace';
  import { getShortISOForDate } from '../../utilities/time';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import PanelHeader from './PanelHeader.svelte';
  import WorkspaceDiffViewer from './WorkspaceDiffViewer.svelte';

  const dispatch = createEventDispatcher<{
    restored: { name: string };
  }>();

  export let workspaceId: number | null = null;
  export let filePath: string | null = null;
  export let user: User | null = null;
  export let hasEditPermission: boolean = false;

  let creating: boolean = false;
  let loadedKey: string | null = null;
  let loading: boolean = false;
  let message: string = '';
  let previewError: boolean = false;
  let previewLoading: boolean = false;
  let previewMine: string = '';
  let previewRevision: WorkspaceFileRevision | null = null;
  let previewTheirs: string = '';
  let restoringNumber: number | null = null;
  let revisions: WorkspaceFileRevision[] = [];

  // Reload whenever the selected file (or workspace) changes.
  $: fileKey = workspaceId != null && filePath ? `${workspaceId}:${filePath}` : null;
  $: if (fileKey !== loadedKey) {
    loadedKey = fileKey;
    revisions = [];
    if (fileKey) {
      void loadRevisions();
    }
  }

  // Newest first for display (the API returns oldest-first).
  $: orderedRevisions = [...revisions].reverse();

  async function loadRevisions() {
    if (workspaceId == null || !filePath) {
      return;
    }
    loading = true;
    try {
      revisions = await WorkspaceApi.listRevisions(workspaceId, filePath, user);
    } catch {
      showFailureToast('Failed to load revisions');
    } finally {
      loading = false;
    }
  }

  async function onCreate() {
    if (workspaceId == null || !filePath) {
      return;
    }
    creating = true;
    try {
      await WorkspaceApi.createRevision(workspaceId, filePath, { message: message.trim() || undefined }, user);
      message = '';
      showSuccessToast('Revision created');
      await loadRevisions();
    } catch {
      showFailureToast('Failed to create revision');
    } finally {
      creating = false;
    }
  }

  async function onRestore(revision: WorkspaceFileRevision) {
    if (workspaceId == null || !filePath) {
      return;
    }
    restoringNumber = revision.number;
    try {
      await WorkspaceApi.restoreRevision(workspaceId, filePath, revision.name, user);
      showSuccessToast(`Restored to revision ${revision.name}`);
      dispatch('restored', { name: revision.name });
      await loadRevisions();
    } catch {
      showFailureToast('Failed to restore revision');
    } finally {
      restoringNumber = null;
    }
  }

  // Open a read-only diff of the revision (left) against the current working copy (right).
  async function onPreview(revision: WorkspaceFileRevision) {
    if (workspaceId == null || !filePath) {
      return;
    }
    previewRevision = revision;
    previewLoading = true;
    previewError = false;
    try {
      const [theirs, current] = await Promise.all([
        WorkspaceApi.readRevision(workspaceId, filePath, revision.name, user),
        WorkspaceApi.getFileContent(workspaceId, filePath, user),
      ]);
      previewTheirs = theirs;
      previewMine = current.content;
    } catch {
      previewError = true;
      showFailureToast('Failed to load revision');
    } finally {
      previewLoading = false;
    }
  }

  function closePreview() {
    previewRevision = null;
    previewTheirs = '';
    previewMine = '';
    previewError = false;
  }
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <PanelHeader>
      <SectionTitle>Revisions</SectionTitle>
    </PanelHeader>
  </Sidebar.Header>
  <Sidebar.Content className="h-full">
    <Sidebar.Group className="h-full p-0">
      <Sidebar.GroupContent className="h-full">
        <Sidebar.Menu className="h-full text-xs">
          <div class="flex flex-col gap-3 p-3">
            {#if !filePath}
              <div class="text-muted-foreground">Open a file to view its revisions.</div>
            {:else}
              {#if hasEditPermission}
                <div class="flex flex-col gap-1">
                  <input
                    class="rounded border border-border bg-transparent px-2 py-1 text-xs"
                    aria-label="Revision message"
                    placeholder="Optional message"
                    bind:value={message}
                    disabled={creating}
                  />
                  <Button size="sm" variant="default" disabled={creating} on:click={onCreate}>
                    {creating ? 'Creating…' : 'Create revision'}
                  </Button>
                </div>
              {/if}

              {#if loading}
                <div class="text-muted-foreground">Loading…</div>
              {:else if orderedRevisions.length === 0}
                <div class="text-muted-foreground">No revisions yet.</div>
              {:else}
                <div class="flex flex-col gap-2">
                  {#each orderedRevisions as revision (revision.number)}
                    <div class="flex flex-col gap-0.5 rounded border border-border p-2">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium">Revision {revision.name}</span>
                        <div class="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Preview revision ${revision.name}`}
                            on:click={() => onPreview(revision)}
                          >
                            Preview
                          </Button>
                          {#if hasEditPermission}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={restoringNumber !== null}
                              aria-label={`Restore revision ${revision.name}`}
                              on:click={() => onRestore(revision)}
                            >
                              {restoringNumber === revision.number ? 'Restoring…' : 'Restore'}
                            </Button>
                          {/if}
                        </div>
                      </div>
                      <span class="text-muted-foreground">{revision.author}</span>
                      {#if revision.createdAt}
                        <span class="text-muted-foreground">{getShortISOForDate(new Date(revision.createdAt))}</span>
                      {/if}
                      {#if revision.message}
                        <span>{revision.message}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>

{#if previewRevision}
  <Modal height="min(680px, 85vh)" width="min(1100px, 92vw)" on:close={closePreview}>
    <ModalHeader on:close={closePreview}>
      Revision {previewRevision.name}{filePath ? ` — ${filePath.split('/').pop()}` : ''}
    </ModalHeader>
    <ModalContent style="display: flex; flex-direction: column; gap: 8px; overflow: hidden;">
      <div class="flex min-h-0 flex-auto overflow-hidden rounded border">
        {#if previewLoading}
          <div class="flex w-full items-center justify-center p-4 text-muted-foreground">Loading revision…</div>
        {:else if previewError}
          <div class="flex w-full items-center justify-center p-4 text-muted-foreground">
            Couldn't load this revision.
          </div>
        {:else}
          <WorkspaceDiffViewer
            mine={previewMine}
            theirs={previewTheirs}
            mineLabel="Working copy (current)"
            theirsLabel={`Revision ${previewRevision.name}`}
          />
        {/if}
      </div>
    </ModalContent>
    <ModalFooter>
      <Button variant="outline" on:click={closePreview}>Close</Button>
    </ModalFooter>
  </Modal>
{/if}
