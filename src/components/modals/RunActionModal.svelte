<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import effects from '../../utilities/effects';
  import { showFailureToast } from '../../utilities/toast';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let height: number = 380;
  export let width: number = 380;
  export let user: User | null;

  let runButtonDisabled: boolean = true;
  let settings: string = '{"externalUrl": "https://api.github.com"}';
  let parameters: string = '{"sequenceId": "repos/NASA-AMMOS/aerie"}';
  let running: boolean = false;

  $: runButtonDisabled = !parameters || !settings;

  const dispatch = createEventDispatcher<{
    close: void;
    complete: { actionRunId: number | null };
  }>();

  async function run() {
    try {
      running = true;
      const actionRunId = await effects.createActionRun(actionDefinition.id, parameters, settings, user);
      running = false;
      dispatch('complete', { actionRunId });
    } catch (error) {
      showFailureToast('Error running action');
    }
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Run Action</ModalHeader>

  <ModalContent>
    <fieldset>
      <label for="parameters">Parameters JSON</label>
      <input
        bind:value={parameters}
        autocomplete="off"
        class="st-input w-100"
        id="parameters"
        required
        type="text"
        placeholder="Enter a parameters JSON object"
      />
    </fieldset>
    <fieldset>
      <label for="settings">Settings</label>
      <input
        bind:value={settings}
        autocomplete="off"
        class="st-input w-100"
        id="settings"
        required
        type="text"
        placeholder="Enter a settings JSON object"
      />
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={runButtonDisabled || running} on:click={run}>
      {running ? 'Running...' : 'Run'}
    </button>
  </ModalFooter>
</Modal>
