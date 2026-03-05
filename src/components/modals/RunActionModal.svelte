<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition, ActionParametersMap } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, FormParameter } from '../../types/parameter';
  import type { Workspace } from '../../types/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import {
    getDefaultsFromSchema,
    getUserSequenceValueSchemaOptions,
    valueSchemaRecordToParametersMap,
  } from '../../utilities/actions';
  import effects from '../../utilities/effects';
  import { getArguments, getFormParameters } from '../../utilities/parameters';
  import Parameters from '../parameters/Parameters.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let initialRevision: number | undefined = undefined;
  export let parameters: ArgumentsMap | undefined;
  export let user: User | null;
  export let workspace: Workspace;
  export let workspaceFiles: WorkspaceTreeNodeWithFullPath[] = [];

  let argumentsMap: ArgumentsMap = {};
  let isLoadingWorkspace: boolean = false;
  let running: boolean = false;
  let parametersMap: ActionParametersMap = {};
  let selectedRevision: string =
    initialRevision !== undefined && initialRevision !== actionDefinition.versions[0]?.revision
      ? String(initialRevision)
      : 'latest';
  let settingsArgumentsMap: ArgumentsMap = {};
  let settingsParametersMap: ActionParametersMap = {};

  const dispatch = createEventDispatcher<{
    close: void;
    complete: { actionRunId: number | null };
  }>();

  $: latestVersion = actionDefinition.versions[0] ?? null;
  $: selectedVersion =
    selectedRevision === 'latest'
      ? latestVersion
      : (actionDefinition.versions.find(v => v.revision === Number(selectedRevision)) ?? latestVersion);
  $: isLatestSelected = selectedRevision === 'latest';

  $: if (parameters !== undefined) {
    argumentsMap = parameters;
  }

  $: {
    const paramSchema = selectedVersion?.parameter_schema ?? {};
    parametersMap = valueSchemaRecordToParametersMap(paramSchema);
  }

  // When a non-latest version is selected, build settings form from that version's settings_schema
  $: {
    if (!isLatestSelected && selectedVersion) {
      settingsParametersMap = valueSchemaRecordToParametersMap(selectedVersion.settings_schema);
      settingsArgumentsMap = getDefaultsFromSchema(selectedVersion.settings_schema);
    } else {
      settingsParametersMap = {};
      settingsArgumentsMap = {};
    }
  }

  function onVersionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedRevision = target.value;
    // Clear argumentsMap so getFormParameters uses defaultArgumentsMap with correct 'mission' valueSource
    // argumentsMap = {};
  }

  async function run() {
    running = true;
    let secretParametersMap: ActionParametersMap = {};
    let nonSecretParametersMap: ActionParametersMap = {};

    // Filter out the secret params to send directly to the action server.
    for (const param of Object.keys(parametersMap)) {
      if (parametersMap[param].schema.type === 'secret') {
        secretParametersMap[param] = argumentsMap[param];
      } else {
        nonSecretParametersMap[param] = argumentsMap[param];
      }
    }

    // Use stored settings for latest, user-provided settings for non-latest
    const settings = isLatestSelected ? actionDefinition.settings : settingsArgumentsMap;
    const revision = isLatestSelected ? undefined : selectedVersion?.revision;

    const actionRunId = await effects.createActionRun(
      workspace,
      actionDefinition.id,
      parametersMap,
      argumentsMap,
      settings,
      user,
      revision,
    );

    running = false;
    dispatch('complete', { actionRunId });
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

  function onResetFormParameter(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const { [formParameter.name]: _, ...rest } = argumentsMap;
    argumentsMap = rest;
  }

  function onChangeSettingsParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    settingsArgumentsMap = getArguments(settingsArgumentsMap, formParameter);
  }
</script>

<Modal height="max-content" width={500} on:close closeOnEscape={false} closeOnOutsideClick={false}>
  <ModalHeader on:close>{actionDefinition.name}</ModalHeader>
  <ModalContent style="max-height: 50vh;overflow: auto">
    <Parameters
      formParameters={getFormParameters(
        parametersMap,
        argumentsMap,
        [],
        undefined,
        getDefaultsFromSchema(selectedVersion?.parameter_schema ?? {}),
        getUserSequenceValueSchemaOptions(workspaceFiles, actionDefinition.workspace_id),
        'sequence',
        false,
        false,
      )}
      parameterType="action"
      disabled={isLoadingWorkspace}
      on:change={onChangeFormParameters}
      on:reset={onResetFormParameter}
    />

    {#if !isLatestSelected && Object.keys(settingsParametersMap).length > 0}
      <div class="mt-4 pt-4">
        <div class="pb-2 font-medium text-muted-foreground">
          Action Settings for Version {selectedVersion?.revision}
        </div>
        <Parameters
          formParameters={getFormParameters(
            settingsParametersMap,
            settingsArgumentsMap,
            [],
            undefined,
            getDefaultsFromSchema(selectedVersion?.settings_schema ?? {}),
            undefined,
            'sequence',
            false,
            false,
          )}
          parameterType="action"
          hideRightAdornments
          hideInfo={false}
          on:change={onChangeSettingsParameters}
        />
      </div>
    {/if}
  </ModalContent>

  <ModalFooter>
    <select class="st-select mr-auto" value={selectedRevision} on:change={onVersionChange}>
      <option value="latest">v{latestVersion?.revision ?? 0} (latest)</option>
      {#each actionDefinition.versions.slice(1) as version (version.revision)}
        <option value={version.revision.toString()}>v{version.revision}</option>
      {/each}
    </select>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={running} on:click={run}>
      {running ? 'Running...' : 'Run'}
    </button>
  </ModalFooter>
</Modal>
