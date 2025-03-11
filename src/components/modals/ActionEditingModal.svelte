<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, FormParameter, ParametersMap } from '../../types/parameter';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import Parameters from '../parameters/Parameters.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let user: User | null;
  export let height: number = 380;
  export let width: number = 380;

  let saveButtonDisabled: boolean = true;
  let description: string = actionDefinition.description;
  let name: string = actionDefinition.name;
  let formParameters: FormParameter[] = [];
  let argumentsMap: ArgumentsMap = {};
  let saving: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  $: {
    const settingsMap: ParametersMap = Object.entries(actionDefinition.settings_schema).reduce(
      (acc, [key, valueSchema], i) => {
        acc[key] = { order: i, schema: valueSchema };
        return acc;
      },
      {},
    );

    formParameters = getFormParameters(settingsMap, argumentsMap, []);
  }
  $: saveButtonDisabled = !name;

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    argumentsMap = getArguments(argumentsMap, formParameter);
  }

  async function save() {
    if (!saveButtonDisabled) {
      saving = true;
      const actionDefinitionUpdate = {
        description,
        name,
        // settings,
      };
      await effects.updateActionDefinition(actionDefinition.id, actionDefinitionUpdate, user);
      saving = false;
      dispatch('close');
    }
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Edit Action</ModalHeader>

  <ModalContent>
    <div style=" padding-bottom: 8px;padding-left: 16px" class="st-typography-bold">Metadata</div>
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
    <div class="settings">
      <div class="st-typography-bold">Settings</div>
      <Parameters
        {formParameters}
        parameterType="action"
        hideRightAdornments
        hideInfo
        on:change={onChangeFormParameters}
      />
    </div>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled || saving} on:click={save}> Save </button>
  </ModalFooter>
</Modal>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 16px;
    padding-top: 24px;
  }
</style>
