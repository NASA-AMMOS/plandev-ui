<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PlanSnapshot } from '../../types/plan-snapshot';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 270;
  export let width: number = 280;
  export let numOfActivities: number;
  export let snapshot: PlanSnapshot;

  const dispatch = createEventDispatcher();

  let shouldCreateSnapshot: boolean = false;
  let newSnapshotName: string = '';
  let restoreButtonDisabled: boolean = true;

  $: restoreButtonDisabled = shouldCreateSnapshot && newSnapshotName === '';

  function restore() {
    if (!restoreButtonDisabled) {
      dispatch('restore', { name: newSnapshotName, snapshot });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      restore();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Restore Snapshot</ModalHeader>
  <ModalContent style=" display: flex; flex-direction: column; gap: 8px; padding:8px 0 0 ;">
    <div class="message">
      Restore {numOfActivities} activity directives from "{snapshot.snapshot_name}"
    </div>
    <fieldset>
      <label>
        <span class="create-label">Create </span>
        <input type="checkbox" bind:checked={shouldCreateSnapshot} />
      </label>
    </fieldset>
    {#if shouldCreateSnapshot}
      <fieldset>
        <label for="name">Name of snapshot</label>
        <input
          bind:value={newSnapshotName}
          placeholder="Name of snapshot"
          autocomplete="off"
          class="st-input w-100"
          name="name"
          required
          type="text"
        />
      </fieldset>
    {/if}
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={restoreButtonDisabled} on:click={restore}> Restore Snapshot </button>
  </ModalFooter>
</Modal>

<style>
  .message {
    font-weight: 500;
    padding: 0px 16px;
  }

  input[type='checkbox'],
  .create-label {
    vertical-align: middle;
  }
</style>
