<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import effects from '../../utilities/effects';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;
  export let height: number = 380;
  export let width: number = 380;
  export let workspaceId: number;

  let creating: boolean = false;
  let createButtonDisabled: boolean = true;
  let description: string = '';
  let files: FileList | undefined;
  let file: File | undefined;
  let name: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  // File parse logic
  $: if (files && files[0]) {
    file = files[0];
  }

  $: createButtonDisabled = !name || !file || creating;

  async function create() {
    if (!createButtonDisabled && file) {
      creating = true;
      const success = await effects.createActionDefinition(file, name, description, workspaceId, user);
      creating = false;
      if (success) {
        dispatch('close');
      }
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      create();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />
<Modal {height} {width}>
  <ModalHeader on:close>New Action</ModalHeader>

  <ModalContent>
    <fieldset>
      <label for="name">Name</label>
      <input
        bind:value={name}
        autocomplete="off"
        class="st-input w-100"
        id="name"
        required
        type="text"
        placeholder="Enter a name"
      />
    </fieldset>
    <fieldset>
      <label for="description">Description</label>
      <textarea
        bind:value={description}
        autocomplete="off"
        class="st-input w-100"
        id="description"
        required
        placeholder="Enter a description"
      />
    </fieldset>
    <fieldset style:flex={1}>
      <label for="file">Source File</label>
      <input class="w-100" name="file" required type="file" accept=".js" bind:files />
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={createButtonDisabled} on:click={create}> Create </button>
  </ModalFooter>
</Modal>
