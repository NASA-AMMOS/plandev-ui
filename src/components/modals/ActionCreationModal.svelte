<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import effects from '../../utilities/effects';
  import gql from '../../utilities/gql';
  import { reqHasura } from '../../utilities/requests';
  import { showSuccessToast } from '../../utilities/toast';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;
  export let height: number = 380;
  export let width: number = 380;
  export let workspaceId: number;

  let createButtonDisabled: boolean = true;
  let description: string = '';
  let files: FileList | undefined;
  let file: File | undefined;
  let name: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    create: { actionDefinitionId: number };
  }>();

  // File parse logic
  $: if (files && files[0]) {
    file = files[0];
  }

  $: createButtonDisabled = !name || !file;

  async function create() {
    if (!createButtonDisabled && file) {
      // dispatch('create', { file, description, name });
      const actionFileId = await effects.uploadFile(file, user);
      showSuccessToast('Model Uploaded Successfully. Processing model...');

      if (actionFileId !== null) {
        const actionDefinitionInsertInput = {
          action_file_id: actionFileId,
          description,
          name,
          workspace_id: workspaceId,
        };
        const data = await reqHasura<ActionDefinition>(
          gql.CREATE_ACTION_DEFINITION,
          { actionDefinitionInsertInput },
          user,
        );
        const { insert_action_definition_one } = data;
        console.log('createActionDefinition :>> ', data);
        if (insert_action_definition_one) {
          dispatch('create', { actionDefinitionId: insert_action_definition_one?.id });
        } else {
          // TODO
        }
      }

      //   if (jarId !== null) {
      //     const modelInsertInput: ModelInsertInput = {
      //       description,
      //       jar_id: jarId,
      //       mission: '',
      //       name,
      //       version,
      //     };
      //     const data = await reqHasura<Model>(gql.CREATE_MODEL, { model: modelInsertInput }, user);
      //     const { createModel } = data;
      //     if (createModel != null) {
      //       const { id } = createModel;

      //       showSuccessToast('Model Created Successfully');
      //       createModelErrorStore.set(null);
      //       creatingModelStore.set(false);

      //       return id;
      //       dispatch('close');
      //     } else {
      //       throw Error(`Unable to create model "${name}"`);
      //     }
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
