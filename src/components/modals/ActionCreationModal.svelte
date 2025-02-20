<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 380;
  export let width: number = 380;

  let createButtonDisabled: boolean = true;
  let description: string = '';
  let files: FileList | undefined;
  let file: File | undefined;
  let name: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    create: { actionJS: string; description: string; name: string };
  }>();

  // File parse logic
  $: if (files && files[0]) {
    file = files[0];
  }

  $: createButtonDisabled = !name || !file;

  async function create() {
    if (!createButtonDisabled && file) {
      const actionJS = await file.text();
      dispatch('create', { actionJS, description, name });
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
      <input
        bind:value={description}
        autocomplete="off"
        class="st-input w-100"
        id="description"
        required
        type="text"
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
