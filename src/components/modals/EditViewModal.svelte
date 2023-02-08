<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { plan } from '../../stores/plan';
  import { view } from '../../stores/views';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 150;
  export let width: number = 380;

  const dispatch = createEventDispatcher();

  let viewName: string = '';
  let selectedModelId: number | null;
  let saveButtonDisabled: boolean = true;

  $: saveButtonDisabled = viewName === '';
  $: selectedModelId = $plan.model_id;
  $: viewName = $view.name;

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { id: $view.id, name: viewName });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      save();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Edit view</ModalHeader>
  <ModalContent>
    <fieldset>
      <label for="name">View name</label>
      <input bind:value={viewName} autocomplete="off" class="st-input w-100" name="name" required type="text" />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Save View </button>
  </ModalFooter>
</Modal>
