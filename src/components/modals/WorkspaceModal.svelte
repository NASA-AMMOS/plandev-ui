<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 150;
  export let initialWorkspaceName: string = '';
  export let mode: 'create' | 'edit' = 'create';
  export let width: number = 380;
  export let workspaceNames: string[];

  const dispatch = createEventDispatcher<{
    close: void;
    save: { name: string };
  }>();

  let workspaceName: string = initialWorkspaceName;
  let saveButtonDisabled: boolean = true;
  let modalTitle: string;
  let workspaceNameSet: Set<string>;

  $: saveButtonDisabled =
    workspaceName === '' || !(!workspaceNameSet.has(workspaceName) || workspaceName === initialWorkspaceName);
  $: modalTitle = mode === 'edit' ? 'Edit Workspace' : 'Create Workspace';
  $: workspaceNameSet = new Set(workspaceNames);

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { name: workspaceName });
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
  <ModalHeader on:close>{modalTitle}</ModalHeader>

  <ModalContent>
    <div class="st-typography-body">Workspace names must be unique.</div>

    <fieldset>
      <label for="name">Workspace name</label>
      <input bind:value={workspaceName} autocomplete="off" class="st-input w-100" id="name" required type="text" />
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Save Workspace </button>
  </ModalFooter>
</Modal>
