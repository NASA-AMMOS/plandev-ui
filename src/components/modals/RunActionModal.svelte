<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition, ActionParametersMap } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { Argument, ArgumentsMap, FormParameter, ParameterName } from '../../types/parameter';
  import type { UserSequence } from '../../types/sequencing';
  import { getUserSequenceValueSchemaOptions, valueSchemaRecordToParametersMap } from '../../utilities/actions';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import Parameters from '../parameters/Parameters.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let parameters: ArgumentsMap | undefined;
  export let user: User | null;
  export let workspaceSequences: UserSequence[] = [];

  let argumentsMap: ArgumentsMap = {};
  let isLoadingWorkspace: boolean = false;
  let running: boolean = false;
  let parametersMap: ActionParametersMap = {};
  let secretParametersMap: ActionParametersMap = {};

  const dispatch = createEventDispatcher<{
    close: void;
    complete: { actionRunId: number | null };
  }>();

  $: if (parameters !== undefined) {
    argumentsMap = parameters;
  }

  $: {
    parametersMap = valueSchemaRecordToParametersMap(actionDefinition.parameter_schema);
  }

  async function run() {
    running = true;

    // Filter out the secret params to send directly to the action server.
    for (const param of Object.keys(parametersMap)) {
      if (parametersMap[param].schema.type === 'secret') {
        secretParametersMap[param] = argumentsMap[param];
      }
    }

    const actionRunId = await effects.createActionRun(
      actionDefinition.id,
      // Only send non-secret arguments to the db.
      Object.entries(argumentsMap).reduce((acc: ArgumentsMap, [paramName, argument]: [ParameterName, Argument]) => {
        if (parametersMap[paramName].schema.type !== 'secret') {
          acc[paramName] = argument;
        }

        return acc;
      }, {}),
      actionDefinition.settings,
      Object.keys(secretParametersMap).length > 0, // The DB only needs to know if there are secrets or not.
      user,
    );

    if (actionRunId !== null) {
      await effects.sendActionSecretParameters(secretParametersMap, actionRunId, user);
    }

    running = false;
    dispatch('complete', { actionRunId });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    if (formParameter.schema.type === 'options-single') {
      const sequences = workspaceSequences.find(sequence => sequence.name === formParameter.value);
      formParameter.value = sequences?.name ?? null;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else if (formParameter.schema.type === 'options-multiple') {
      const values: string[] = formParameter.value;
      const sequenceNames: string[] = [];
      values.forEach(value => {
        const seq = workspaceSequences.find(sequence => sequence.name === value);
        if (seq !== undefined) {
          sequenceNames.push(seq.name);
        }
      });
      formParameter.value = sequenceNames;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else {
      argumentsMap = getArguments(argumentsMap, formParameter);
    }
  }
</script>

<Modal height="max-content" width={500}>
  <ModalHeader on:close>Run Action</ModalHeader>

  <ModalContent style="max-height: 50vh;overflow: auto">
    <div class="st-typography-label pb-2">Input parameters to run <b>{actionDefinition.name}</b></div>
    <Parameters
      formParameters={getFormParameters(
        parametersMap,
        argumentsMap,
        [],
        undefined,
        undefined,
        getUserSequenceValueSchemaOptions(workspaceSequences, actionDefinition.workspace_id),
        'sequence',
      )}
      parameterType="action"
      hideRightAdornments
      hideInfo
      disabled={isLoadingWorkspace}
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
