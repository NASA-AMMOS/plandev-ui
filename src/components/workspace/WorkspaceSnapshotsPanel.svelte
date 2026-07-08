<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { WorkspaceCheckpoint } from '../../types/workspace';
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

  // A workspace snapshot captures the whole workspace at a point in time (independent of any open file).
  const dispatch = createEventDispatcher<{
    snapshotRestored: { name: string };
  }>();

  export let workspaceId: number | null = null;
  export let user: User | null = null;
  export let hasEditPermission: boolean = false;
  // Path of the open file with unsaved changes (or null). A snapshot captures only *saved* files, so we warn.
  export let unsavedFilePath: string | null = null;
  // Saves the unsaved file (resolves true once saved), so we can offer "Save & snapshot". Null if unavailable.
  export let saveActiveDocument: (() => Promise<boolean>) | null = null;

  let snapshots: WorkspaceCheckpoint[] = [];
  let loadedFor: number | null = null;
  let loading: boolean = false;
  let snapshotting: boolean = false;
  let restoring: number | null = null;
  let confirmRestore: WorkspaceCheckpoint | null = null;
  let note: string = '';
  let confirmUnsaved: boolean = false;

  // (Re)load whenever the workspace changes.
  $: if (workspaceId !== loadedFor) {
    loadedFor = workspaceId;
    snapshots = [];
    if (workspaceId != null) {
      void loadSnapshots();
    }
  }

  // Newest first (the API returns oldest-first).
  $: orderedSnapshots = [...snapshots].reverse();

  async function loadSnapshots() {
    if (workspaceId == null) {
      return;
    }
    loading = true;
    try {
      snapshots = await WorkspaceApi.listCheckpoints(workspaceId, user);
    } catch {
      showFailureToast('Failed to load snapshots');
    } finally {
      loading = false;
    }
  }

  // A snapshot only captures saved files — if the open file is dirty, warn before proceeding.
  function onSnapshotClick() {
    if (unsavedFilePath) {
      confirmUnsaved = true;
    } else {
      void doSnapshot();
    }
  }

  async function onSaveAndSnapshot() {
    confirmUnsaved = false;
    if (saveActiveDocument) {
      const saved = await saveActiveDocument();
      if (!saved) {
        return; // save failed or hit a conflict — don't snapshot a state the user didn't confirm
      }
    }
    await doSnapshot();
  }

  async function doSnapshot() {
    if (workspaceId == null) {
      return;
    }
    confirmUnsaved = false;
    snapshotting = true;
    try {
      const result = await WorkspaceApi.snapshotWorkspace(workspaceId, { message: note.trim() || undefined }, user);
      note = '';
      const n = result.checkpoint.fileCount;
      showSuccessToast(`Snapshot ${result.checkpoint.name} created (${n} file${n === 1 ? '' : 's'})`);
      await loadSnapshots();
    } catch {
      showFailureToast('Failed to snapshot workspace');
    } finally {
      snapshotting = false;
    }
  }

  async function onConfirmRestore() {
    const snapshot = confirmRestore;
    if (workspaceId == null || snapshot == null) {
      return;
    }
    confirmRestore = null;
    restoring = snapshot.number;
    try {
      const result = await WorkspaceApi.restoreToCheckpoint(workspaceId, snapshot.name, user);
      const resetCount = result.restored.length;
      const removedCount = result.removed.length;
      showSuccessToast(
        `Restored to snapshot ${snapshot.name} — ${resetCount} file${resetCount === 1 ? '' : 's'} reset` +
          (removedCount > 0 ? `, ${removedCount} removed` : ''),
      );
      dispatch('snapshotRestored', { name: snapshot.name });
    } catch {
      showFailureToast('Failed to restore snapshot');
    } finally {
      restoring = null;
    }
  }
</script>

<div class="grid h-full grid-rows-[min-content_auto]">
  <Sidebar.Header className="p-0">
    <PanelHeader>
      <SectionTitle>Snapshots</SectionTitle>
    </PanelHeader>
  </Sidebar.Header>
  <Sidebar.Content className="h-full">
    <Sidebar.Group className="h-full p-0">
      <Sidebar.GroupContent className="h-full">
        <Sidebar.Menu className="h-full text-xs">
          <div class="flex flex-col gap-3 p-3">
            <p class="text-muted-foreground">
              A snapshot captures every file in the workspace at a point in time. Restoring reverts all files to
              the snapshot and removes files added since — all recoverable from history.
            </p>

            {#if hasEditPermission}
              <div class="flex flex-col gap-1">
                <input
                  class="rounded border border-border bg-transparent px-2 py-1 text-xs"
                  aria-label="Snapshot note"
                  placeholder="Optional note"
                  bind:value={note}
                  disabled={snapshotting}
                />
                <Button size="sm" variant="default" disabled={snapshotting} on:click={onSnapshotClick}>
                  {snapshotting ? 'Snapshotting…' : 'Snapshot workspace'}
                </Button>
              </div>
            {/if}

            {#if loading}
              <div class="text-muted-foreground">Loading…</div>
            {:else if orderedSnapshots.length === 0}
              <div class="text-muted-foreground">No snapshots yet.</div>
            {:else}
              <div class="flex flex-col gap-2">
                {#each orderedSnapshots as snapshot (snapshot.number)}
                  <div class="flex flex-col gap-0.5 rounded border border-border p-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium">
                        Snapshot {snapshot.name} · {snapshot.fileCount} file{snapshot.fileCount === 1 ? '' : 's'}
                      </span>
                      {#if hasEditPermission}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={restoring !== null}
                          aria-label={`Restore snapshot ${snapshot.name}`}
                          on:click={() => (confirmRestore = snapshot)}
                        >
                          {restoring === snapshot.number ? 'Restoring…' : 'Restore'}
                        </Button>
                      {/if}
                    </div>
                    <span class="text-muted-foreground">{snapshot.author}</span>
                    {#if snapshot.createdAt}
                      <span class="text-muted-foreground">{getShortISOForDate(new Date(snapshot.createdAt))}</span>
                    {/if}
                    {#if snapshot.message}
                      <span>{snapshot.message}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</div>

{#if confirmRestore}
  <Modal height="auto" width="min(480px, 92vw)" on:close={() => (confirmRestore = null)}>
    <ModalHeader on:close={() => (confirmRestore = null)}>Restore snapshot {confirmRestore.name}?</ModalHeader>
    <ModalContent>
      <p class="text-sm">
        This resets the workspace to snapshot <strong>{confirmRestore.name}</strong>
        ({confirmRestore.fileCount} file{confirmRestore.fileCount === 1 ? '' : 's'}) and
        <strong>removes any files created since</strong> it. Removed files are recoverable from history.
      </p>
    </ModalContent>
    <ModalFooter>
      <Button variant="outline" on:click={() => (confirmRestore = null)}>Cancel</Button>
      <Button variant="default" on:click={onConfirmRestore}>Restore</Button>
    </ModalFooter>
  </Modal>
{/if}

{#if confirmUnsaved}
  <Modal height="auto" width="min(520px, 92vw)" on:close={() => (confirmUnsaved = false)}>
    <ModalHeader on:close={() => (confirmUnsaved = false)}>Unsaved changes won't be included</ModalHeader>
    <ModalContent>
      <p class="text-sm">
        <strong>{unsavedFilePath}</strong> has unsaved changes. A snapshot captures only saved files, so those
        changes won't be in it.
      </p>
    </ModalContent>
    <ModalFooter>
      <Button variant="outline" on:click={() => (confirmUnsaved = false)}>Cancel</Button>
      <Button variant="ghost" on:click={doSnapshot}>Snapshot without them</Button>
      {#if saveActiveDocument}
        <Button variant="default" on:click={onSaveAndSnapshot}>Save &amp; snapshot</Button>
      {/if}
    </ModalFooter>
  </Modal>
{/if}
