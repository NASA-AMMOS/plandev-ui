<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition, ActionParametersMap } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, FormParameter } from '../../types/parameter';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
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
  export let workspaceFiles: WorkspaceTreeNodeWithFullPath[] = [];

  let argumentsMap: ArgumentsMap = {};
  let isLoadingWorkspace: boolean = false;
  let running: boolean = false;
  let parametersMap: ActionParametersMap = {};

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

    const actionRunId = await effects.createActionRun(
      actionDefinition.id,
      // Only send non-secret arguments to the db.
      parametersMap,
      argumentsMap,
      actionDefinition.settings,
      user,
    );

    running = false;
    dispatch('complete', { actionRunId });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    if (formParameter.schema.type === 'options-single') {
      const sequences = workspaceFiles.find(sequence => sequence.fullPath === formParameter.value);
      formParameter.value = sequences?.fullPath ?? null;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else if (formParameter.schema.type === 'options-multiple') {
      const values: string[] = formParameter.value;
      const sequenceNames: string[] = [];
      values.forEach(value => {
        const seq = workspaceFiles.find(sequence => sequence.fullPath === value);
        if (seq !== undefined && seq.fullPath !== undefined) {
          sequenceNames.push(seq.fullPath);
        }
      });
      formParameter.value = sequenceNames;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else {
      argumentsMap = getArguments(argumentsMap, formParameter);
    }
  }
</script>

<Modal height="max-content" width={500} on:close closeOnEscape={false} closeOnOutsideClick={false}>
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
        getUserSequenceValueSchemaOptions(workspaceFiles, actionDefinition.workspace_id),
        'sequence',
        false,
        false,
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
