<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { WorkspaceFileRevision } from '../../types/workspace';
  import { getShortISOForDate } from '../../utilities/time';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { WorkspaceApi } from '../../utilities/workspaces';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import PanelHeader from './PanelHeader.svelte';

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
          {#if !filePath}
            <div class="p-3 text-muted-foreground">Select a file to view its revisions.</div>
          {:else}
            <div class="flex flex-col gap-3 p-3">
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
            </div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>
