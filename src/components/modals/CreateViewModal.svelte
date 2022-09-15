<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 150;
  export let width: number = 380;

  const dispatch = createEventDispatcher();

  let newViewName: string = '';
  let createButtonDisabled: boolean = true;

  $: createButtonDisabled = newViewName === '';

  function create() {
    if (!createButtonDisabled) {
      dispatch('create', { name: newViewName });
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
  <ModalHeader on:close>Create View</ModalHeader>
  <ModalContent>
    <fieldset>
      <label for="name">Name</label>
      <input bind:value={newViewName} autocomplete="off" class="st-input w-100" name="name" required type="text" />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={createButtonDisabled} on:click={create}> Create </button>
  </ModalFooter>
</Modal>
