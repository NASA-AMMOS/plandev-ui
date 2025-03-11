<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, FormParameter, ParametersMap } from '../../types/parameter';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import { showFailureToast } from '../../utilities/toast';
  import Parameters from '../parameters/Parameters.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let height: number = 380;
  export let width: number = 380;
  export let user: User | null;

  let running: boolean = false;
  let formParameters: FormParameter[] = [];
  let argumentsMap: ArgumentsMap = {};

  $: {
    const parametersMap: ParametersMap = Object.entries(actionDefinition.parameter_schema).reduce(
      (acc, [key, valueSchema], i) => {
        acc[key] = { order: i, schema: valueSchema };
        return acc;
      },
      {},
    );

    formParameters = getFormParameters(parametersMap, argumentsMap, []);
  }

  const dispatch = createEventDispatcher<{
    close: void;
    complete: { actionRunId: number | null };
  }>();

  async function run() {
    try {
      running = true;
      const actionRunId = await effects.createActionRun(
        actionDefinition.id,
        argumentsMap,
        actionDefinition.settings,
        user,
      );
      running = false;
      dispatch('complete', { actionRunId });
    } catch (error) {
      showFailureToast('Error running action');
    }
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    argumentsMap = getArguments(argumentsMap, formParameter);
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Run Action</ModalHeader>

  <ModalContent>
    <Parameters
      {formParameters}
      parameterType="action"
      hideRightAdornments
      hideInfo
      on:change={onChangeFormParameters}
    />
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={running} on:click={run}>
      {running ? 'Running...' : 'Run'}
    </button>
  </ModalFooter>
</Modal>
