<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox, Input, Label, Textarea } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { tags } from '../../../stores/tags';
  import type { User } from '../../../types/app';
  import type { PlanSnapshot } from '../../../types/plan-snapshot';
  import type { Tag, TagsChangeEvent } from '../../../types/tags';
  import effects from '../../../utilities/effects';
  import TagsInput from '../../ui/Tags/TagsInput.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let numOfActivities: number;
  export let snapshot: PlanSnapshot;
  export let user: User | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?: {
        description: string;
        name: string;
        shouldCreateSnapshot: boolean;
        snapshot: PlanSnapshot;
        tags: Tag[];
      };
    };
  }>();

  let shouldCreateSnapshot: boolean = false;
  let newSnapshotName: string = '';
  let snapshotDescription: string = '';
  let snapshotTags: Tag[] = [];

  $: restoreButtonDisabled = shouldCreateSnapshot && newSnapshotName === '';

  function handleCancel() {
    open = false;
  }

  function handleRestore() {
    if (!restoreButtonDisabled) {
      open = false;
      dispatch('resolve', {
        confirm: true,
        value: {
          description: snapshotDescription,
          name: newSnapshotName,
          shouldCreateSnapshot,
          snapshot,
          tags: snapshotTags,
        },
      });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleRestore();
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

<StellarDialog bind:open size="sm" title="Restore Snapshot" on:close>
  <div class="grid gap-4 py-2">
    <div class="font-medium">
      Restore {numOfActivities} activity directives from "{snapshot.snapshot_name}"
    </div>
    <div class="flex items-center space-x-2">
      <Checkbox id="create-snapshot" bind:checked={shouldCreateSnapshot} />
      <Label for="create-snapshot" class="font-normal">Take snapshot prior to restoring</Label>
    </div>
    {#if shouldCreateSnapshot}
      <div class="grid gap-2">
        <Label for="name">Name of snapshot</Label>
        <Input
          bind:value={newSnapshotName}
          placeholder="Name of snapshot"
          autocomplete="off"
          id="name"
          name="name"
          required
          type="text"
          on:keydown={onInputKeydown}
        />
      </div>
      <div class="grid gap-2">
        <Label for="description">Description</Label>
        <Textarea
          bind:value={snapshotDescription}
          placeholder="Notes about this snapshot"
          id="description"
          name="description"
        />
      </div>
      <div class="grid gap-2">
        <Label for="tags">Tags</Label>
        <TagsInput options={$tags} selected={snapshotTags} on:change={onTagsInputChange} />
      </div>
    {/if}
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Restore Snapshot"
      confirmDisabled={restoreButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleRestore}
    />
  </svelte:fragment>
</StellarDialog>
