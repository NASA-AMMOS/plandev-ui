<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tags } from '../../stores/tags';
  import type { User } from '../../types/app';
  import type { PlanSnapshot } from '../../types/plan-snapshot';
  import type { Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number | string = 'unset';
  export let width: number = 280;
  export let numOfActivities: number;
  export let snapshot: PlanSnapshot;
  export let user: User | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    restore: {
      description: string;
      name: string;
      shouldCreateSnapshot: boolean;
      snapshot: PlanSnapshot;
      tags: Tag[];
    };
  }>();

  let shouldCreateSnapshot: boolean = false;
  let newSnapshotName: string = '';
  let snapshotDescription: string = '';
  let snapshotTags: Tag[] = [];
  let restoreButtonDisabled: boolean = true;

  $: restoreButtonDisabled = shouldCreateSnapshot && newSnapshotName === '';

  function restore() {
    if (!restoreButtonDisabled) {
      dispatch('restore', {
        description: snapshotDescription,
        name: newSnapshotName,
        shouldCreateSnapshot,
        snapshot,
        tags: snapshotTags,
      });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      restore();
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      snapshotTags = snapshotTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      snapshotTags = snapshotTags.concat(tagsToAdd);
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Restore Snapshot</ModalHeader>
  <ModalContent style=" display: flex; flex-direction: column; gap: 8px; padding:8px 0 16px;">
    <div class="message">
      Restore {numOfActivities} activity directives from "{snapshot.snapshot_name}"
    </div>
    <fieldset>
      <label>
        <input type="checkbox" bind:checked={shouldCreateSnapshot} />
        <span class="create-label">Take snapshot prior to restoring</span>
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
      <fieldset>
        <label for="description">Description</label>
        <textarea
          bind:value={snapshotDescription}
          placeholder="Notes about this snapshot"
          class="st-input w-100"
          name="description"
        />
      </fieldset>
      <fieldset>
        <label for="plan-duration">Tags</label>
        <TagsInput options={$tags} selected={snapshotTags} on:change={onTagsInputChange} />
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
