<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, FormParameter } from '../../types/parameter';
  import { valueSchemaRecordToParametersMap } from '../../utilities/actions';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import Parameters from '../parameters/Parameters.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let user: User | null;

  let running: boolean = false;
  let argumentsMap: ArgumentsMap = {};

  const dispatch = createEventDispatcher<{
    close: void;
    complete: { actionRunId: number | null };
  }>();

  async function run() {
    running = true;
    const actionRunId = await effects.createActionRun(
      actionDefinition.id,
      argumentsMap,
      actionDefinition.settings,
      user,
    );
    running = false;
    dispatch('complete', { actionRunId });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    argumentsMap = getArguments(argumentsMap, formParameter);
  }
</script>

<Modal height="max-content" width={500}>
  <ModalHeader on:close>Run Action</ModalHeader>

  <ModalContent style="max-height: 50vh;overflow: auto">
    <div class="st-typography-label pb-2">Input parameters for this action run</div>
    <Parameters
      formParameters={getFormParameters(
        valueSchemaRecordToParametersMap(actionDefinition.parameter_schema),
        argumentsMap,
        [],
      )}
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
