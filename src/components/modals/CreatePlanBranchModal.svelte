<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DatePicker from '../ui/DatePicker/DatePicker.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 270;
  export let width: number = 280;
  export let plan: Plan;

  const dispatch = createEventDispatcher();

  let newBranchName: string = '';
  let createButtonDisabled: boolean = true;

  $: createButtonDisabled = newBranchName === '';

  function create() {
    if (!createButtonDisabled) {
      dispatch('create', { name: newBranchName, plan });
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
  <ModalHeader on:close>Create Branch</ModalHeader>
  <ModalContent style=" display: flex; flex-direction: column; gap: 8px; padding:8px 0 0 ;">
    <fieldset>
      <label for="name">Name of branch</label>
      <input
        bind:value={newBranchName}
        placeholder="Name of branch"
        autocomplete="off"
        class="st-input w-100"
        name="name"
        required
        type="text"
      />
    </fieldset>
    <fieldset>
      <label for="start">Start date</label>
      <DatePicker name="start" disabled dateString={plan.start_time_doy} />
    </fieldset>
    <fieldset>
      <label for="end">End date</label>
      <DatePicker name="end" disabled dateString={plan.end_time_doy} />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={createButtonDisabled} on:click={create}> Create Branch </button>
  </ModalFooter>
</Modal>
