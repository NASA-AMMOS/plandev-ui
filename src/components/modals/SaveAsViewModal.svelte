<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let modal: Modal;

  const dispatch = createEventDispatcher();

  let buttonElement: HTMLButtonElement;
  let nameElement: HTMLInputElement;
  let name: string = '';

  function onKeyUp(event: KeyboardEvent) {
    if (name !== '' && event.key === 'Enter') {
      event.preventDefault();
      buttonElement.click();
    }
  }

  async function onSaveAsView() {
    modal.hide();
    dispatch('saveAsView', name);
  }

  async function onShow() {
    await tick();
    if (nameElement) {
      nameElement.focus();
    }
  }
</script>

<Modal bind:this={modal} height={150} width={200} on:show={onShow}>
  <ModalHeader on:close={modal.hide}>Save As View</ModalHeader>
  <ModalContent>
    <label for="name">Name</label>
    <input
      bind:this={nameElement}
      bind:value={name}
      autocomplete="off"
      class="st-input w-100"
      name="name"
      required
      type="text"
      on:keyup={onKeyUp}
    />
  </ModalContent>
  <ModalFooter>
    <button bind:this={buttonElement} class="st-button" disabled={name === ''} type="button" on:click={onSaveAsView}>
      Save
    </button>
  </ModalFooter>
</Modal>
