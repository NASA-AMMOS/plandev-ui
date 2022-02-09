<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import Modal from './Modal.svelte';

  export let modal: Modal | null = null;

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
    dispatch('createView', name);
  }

  async function onShow() {
    await tick();
    if (nameElement) {
      nameElement.focus();
    }
  }
</script>

<Modal bind:this={modal} height={150} width={200} on:show={onShow}>
  <div class="header">
    <div class="title">Save As View</div>
    <button class="st-button icon fs-6" on:click|stopPropagation={modal.hide}>
      <i class="bi bi-x" />
    </button>
  </div>
  <div class="content">
    <fieldset>
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
    </fieldset>
  </div>

  <div class="footer">
    <button
      bind:this={buttonElement}
      class="st-button"
      disabled={name === ''}
      type="button"
      on:click={onSaveAsView}
    >
      Save
    </button>
  </div>
</Modal>
