<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition, ActionParametersMap } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { ArgumentsMap, FormParameter } from '../../../types/parameter';
  import type { Workspace } from '../../../types/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import { getUserSequenceValueSchemaOptions, valueSchemaRecordToParametersMap } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import { getArguments, getFormParameters } from '../../../utilities/parameters';
  import Parameters from '../../parameters/Parameters.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let actionDefinition: ActionDefinition;
  export let parameters: ArgumentsMap | undefined;
  export let user: User | null;
  export let workspace: Workspace;
  export let workspaceFiles: WorkspaceTreeNodeWithFullPath[] = [];

  let argumentsMap: ArgumentsMap = {};
  let isLoadingWorkspace: boolean = false;
  let running: boolean = false;
  let parametersMap: ActionParametersMap = {};

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { id: number | null } };
  }>();

  $: if (parameters !== undefined) {
    argumentsMap = parameters;
  }

  $: {
    parametersMap = valueSchemaRecordToParametersMap(actionDefinition.parameter_schema);
  }

  function handleCancel() {
    open = false;
  }

  async function handleRun() {
    running = true;
    let secretParametersMap: ActionParametersMap = {};
    let nonSecretParametersMap: ActionParametersMap = {};
    let hasSecrets = false;

    // Filter out the secret params to send directly to the action server.
    for (const param of Object.keys(parametersMap)) {
      if (parametersMap[param].schema.type === 'secret') {
        secretParametersMap[param] = argumentsMap[param];
        hasSecrets = true;
      } else {
        nonSecretParametersMap[param] = argumentsMap[param];
      }
    }

    const actionRunId = await effects.createActionRun(
      workspace,
      actionDefinition.id,
      // Only send non-secret arguments to the db.
      parametersMap,
      argumentsMap,
      actionDefinition.settings,
      user,
    );

    if (actionRunId !== null && hasSecrets) {
      await effects.sendActionSecretParameters(workspace, secretParametersMap, actionRunId, user);
    }

    running = false;
    open = false;
    dispatch('resolve', { confirm: true, value: { id: actionRunId } });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    if (formParameter.schema.type === 'options-single') {
      const files = workspaceFiles.find(sequence => sequence.fullPath === formParameter.value);
      formParameter.value = files?.fullPath ?? null;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else if (formParameter.schema.type === 'options-multiple') {
      const values: string[] = formParameter.value;
      const fileNames: string[] = [];
      values.forEach(value => {
        const seq = workspaceFiles.find(sequence => sequence.fullPath === value);
        if (seq !== undefined && seq.fullPath !== undefined) {
          fileNames.push(seq.fullPath);
        }
      });
      formParameter.value = fileNames;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else {
      argumentsMap = getArguments(argumentsMap, formParameter);
    }
  }
</script>

<StellarDialog bind:open size="md" title="Run Action" on:close closeOnEscape={false} closeOnOutsideClick={false}>
  <div class="max-h-[50vh] overflow-auto py-2">
    <div class="pb-2 text-sm font-medium">
      Input parameters to run <span class="font-bold">{actionDefinition.name}</span>
    </div>
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
      hideInfo={false}
      disabled={isLoadingWorkspace}
      on:change={onChangeFormParameters}
    />
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText={running ? 'Running...' : 'Run'}
      confirmDisabled={running}
      on:cancel={handleCancel}
      on:confirm={handleRun}
    />
  </svelte:fragment>
</StellarDialog>
