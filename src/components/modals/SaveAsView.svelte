<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import Modal from './Modal.svelte';
  import InputText from '../form/InputText.svelte';
  import Field from '../form/Field.svelte';
  import Label from '../form/Label.svelte';
  import { reqCreateView } from '../../utilities/requests';
  import type { View } from '../../types';

  const dispatch = createEventDispatcher();

  export let currentView: View;
  export let modal: Modal | null = null;

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
    const { message, success, view } = await reqCreateView(name, currentView);

    if (success) {
      dispatch('setView', { view });
      modal.hide();
    } else {
      console.log(message);
    }
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
    <button class="st-button-icon" on:click|stopPropagation={modal.hide}>
      <i class="bi bi-x" />
    </button>
  </div>
  <div class="content">
    <Field>
      <Label for="name">Name</Label>
      <InputText
        bind:input={nameElement}
        bind:value={name}
        name="name"
        required
        on:keyup={onKeyUp}
      />
    </Field>
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
