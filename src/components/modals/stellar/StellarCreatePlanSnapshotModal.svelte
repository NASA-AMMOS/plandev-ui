<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label, Textarea } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { planSnapshots } from '../../../stores/planSnapshots';
  import { tags } from '../../../stores/tags';
  import type { User } from '../../../types/app';
  import type { Plan } from '../../../types/plan';
  import type { Tag, TagsChangeEvent } from '../../../types/tags';
  import effects from '../../../utilities/effects';
  import TagsInput from '../../ui/Tags/TagsInput.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let plan: Plan;
  export let user: User | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?: {
        description: string;
        name: string;
        plan: Plan;
        tags: Tag[];
      };
    };
  }>();

  let snapshotName: string = `${plan.name} – Snapshot ${($planSnapshots || []).length + 1}`;
  let snapshotDescription: string = '';
  let snapshotTags: Tag[] = [];

  $: createButtonDisabled = snapshotName.trim() === '';

  function handleCancel() {
    open = false;
  }

  function handleCreate() {
    if (!createButtonDisabled) {
      open = false;
      dispatch('resolve', {
        confirm: true,
        value: { description: snapshotDescription, name: snapshotName.trim(), plan, tags: snapshotTags },
      });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreate();
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

<StellarDialog bind:open size="md" title="Take Snapshot" on:close>
  <div class="grid gap-4">
    <p class="text-sm text-muted-foreground">
      Snapshot will capture activity directives and references to relevant simulations.
    </p>
    <div class="grid gap-2">
      <Label for="name">Name of Snapshot</Label>
      <Input
        bind:value={snapshotName}
        placeholder="Name of Snapshot"
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
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Create Snapshot"
      confirmDisabled={createButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleCreate}
    />
  </svelte:fragment>
</StellarDialog>
