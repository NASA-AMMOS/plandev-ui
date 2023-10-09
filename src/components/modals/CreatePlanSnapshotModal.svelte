<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { planSnapshots } from '../../stores/planSnapshots';
  import { tags } from '../../stores/tags';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import type { Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number | string = 'unset';
  export let width: number = 380;
  export let plan: Plan;
  export let user: User | null = null;

  const dispatch = createEventDispatcher();

  let createButtonDisabled: boolean = true;
  let snapshotName: string = `${plan.name} – Snapshot ${$planSnapshots.length + 1}`;
  let snapshotDescription: string = '';
  let snapshotTags: Tag[] = [];

  /* TODO tie this into featurePermissions? */
  $: createButtonDisabled = snapshotName === '';

  function create() {
    if (!createButtonDisabled) {
      dispatch('create', { description: snapshotDescription, name: snapshotName, plan, tags: snapshotTags });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      create();
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
  <ModalHeader on:close>Take Snapshot</ModalHeader>
  <ModalContent style=" display: flex; flex-direction: column; gap: 8px; padding:8px 0 16px;">
    <div class="description">Snapshot will capture activity directives and references to relevant simulations.</div>
    <fieldset>
      <label for="name">Name of Snapshot</label>
      <!-- svelte-ignore a11y-autofocus -->
      <input
        autofocus
        bind:value={snapshotName}
        placeholder="Name of Snapshot"
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
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={createButtonDisabled} on:click={create}> Create Snapshot </button>
  </ModalFooter>
</Modal>

<style>
  .description {
    padding: 0px 16px;
  }
</style>
