<svelte:options immutable={true} />

<script lang="ts">
  import { Alert } from '@nasa-jpl/stellar-svelte';
  import { TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition, ActionParametersMap } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { ArgumentsMap, FormParameter, ParameterName, RequiredParametersList } from '../../types/parameter';
  import type { Workspace } from '../../types/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import {
    getDefaultsFromSchema,
    getLatestRunnableVersion,
    getRunnableVersions,
    getUserSequenceValueSchemaOptions,
    valueSchemaRecordToParametersMap,
  } from '../../utilities/actions';
  import effects from '../../utilities/effects';
  import { applyRequiredErrors, getArguments, getFormParameters } from '../../utilities/parameters';
  import { tooltip } from '../../utilities/tooltip';
  import Parameters from '../parameters/Parameters.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionDefinition: ActionDefinition;
  export let initialRevision: number | undefined = undefined;
  export let initialSettings: ArgumentsMap | undefined = undefined;
  export let isRerun: boolean = false;
  export let parameters: ArgumentsMap | undefined;
  export let user: User | null;
  export let workspace: Workspace;
  export let workspaceFiles: WorkspaceTreeNodeWithFullPath[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    complete: { actionRunId: number | null };
  }>();

  const latestRunnable = getLatestRunnableVersion(actionDefinition.versions);
  const initialVersionArchived =
    initialRevision !== undefined &&
    actionDefinition.versions.find(v => v.revision === initialRevision)?.archived === true;

  let argumentsMap: ArgumentsMap = {};
  let isLoadingWorkspace: boolean = false;
  let touchedParamNames: Set<string> = new Set();
  let touchedSettingNames: Set<string> = new Set();
  let running: boolean = false;
  let parametersMap: ActionParametersMap = {};
  let requiredParameters: RequiredParametersList = [];
  let requiredSettings: RequiredParametersList = [];
  let selectedRevision: string =
    initialRevision !== undefined && !initialVersionArchived && initialRevision !== latestRunnable?.revision
      ? String(initialRevision)
      : 'latest';
  let settingsArgumentsMap: ArgumentsMap = {};
  let settingsParametersMap: ActionParametersMap = {};

  $: latestVersion = getLatestRunnableVersion(actionDefinition.versions);
  $: runnableVersions = getRunnableVersions(actionDefinition.versions);
  $: selectedVersion =
    selectedRevision === 'latest'
      ? latestVersion
      : (runnableVersions.find(v => v.revision === Number(selectedRevision)) ?? latestVersion);
  $: isLatestSelected = selectedRevision === 'latest';
  $: effectiveSelectedRevision = selectedRevision === 'latest' ? latestVersion?.revision : Number(selectedRevision);
  $: versionMismatch = isRerun && initialRevision !== undefined && effectiveSelectedRevision !== initialRevision;
  $: requiredParameters = Object.entries(parametersMap)
    .filter(([_, param]) => param.schema.required === true)
    .map(([key, _]) => key as ParameterName);
  $: requiredSettings = Object.entries(settingsParametersMap)
    .filter(([_, param]) => param.schema.required === true)
    .map(([key, _]) => key as ParameterName);
  $: hasEmptyRequired =
    requiredParameters.some(name => !argumentsMap[name]) ||
    (showSettings && requiredSettings.some(name => !settingsArgumentsMap[name]));

  $: if (parameters !== undefined) {
    argumentsMap = parameters;
  }

  $: {
    const paramSchema = selectedVersion?.parameter_schema ?? {};
    parametersMap = valueSchemaRecordToParametersMap(paramSchema);
  }

  // Build settings form for non-latest versions, or for reruns on latest
  $: showSettings = !isLatestSelected || (isRerun && isLatestSelected);

  $: {
    if (showSettings && selectedVersion) {
      settingsParametersMap = valueSchemaRecordToParametersMap(selectedVersion.settings_schema);

      if (isRerun) {
        // Re-run: pre-fill with the original run's settings, falling back to live settings
        settingsArgumentsMap = { ...(initialSettings ?? actionDefinition.settings) };
      } else {
        // Fresh run on old version: attempt to pull live settings where schemas match exactly
        const latestSettingsSchema = latestVersion?.settings_schema ?? {};
        const versionSettingsSchema = selectedVersion.settings_schema;
        const liveSettings = actionDefinition.settings;
        const merged: ArgumentsMap = {};

        for (const [key, versionSchema] of Object.entries(versionSettingsSchema)) {
          const latestSchema = latestSettingsSchema[key];
          if (latestSchema && JSON.stringify(latestSchema) === JSON.stringify(versionSchema) && key in liveSettings) {
            merged[key] = liveSettings[key];
          } else {
            const defaults = getDefaultsFromSchema({ [key]: versionSchema });
            if (key in defaults) {
              merged[key] = defaults[key];
            }
          }
        }
        settingsArgumentsMap = merged;
      }
    } else {
      settingsParametersMap = {};
      settingsArgumentsMap = {};
    }
  }

  function onVersionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedRevision = target.value;
  }

  async function run() {
    running = true;
    let secretParametersMap: ActionParametersMap = {};
    let nonSecretParametersMap: ActionParametersMap = {};

    // Merge schema defaults into user-set arguments so params the user didn't touch
    // (e.g. variant/enum with a default first option) are still sent to the server.
    const defaults = getDefaultsFromSchema(selectedVersion?.parameter_schema ?? {});
    const effectiveArguments = { ...defaults, ...argumentsMap };

    // Filter out the secret params to send directly to the action server.
    for (const param of Object.keys(parametersMap)) {
      if (parametersMap[param].schema.type === 'secret') {
        secretParametersMap[param] = effectiveArguments[param];
      } else {
        nonSecretParametersMap[param] = effectiveArguments[param];
      }
    }

    // Use stored settings for fresh latest runs, user-provided settings for non-latest or reruns
    const settings = isLatestSelected && !isRerun ? actionDefinition.settings : settingsArgumentsMap;
    const revision = isLatestSelected ? undefined : selectedVersion?.revision;

    const actionRunId = await effects.createActionRun(
      workspace,
      actionDefinition.id,
      parametersMap,
      effectiveArguments,
      settings,
      user,
      revision,
    );

    running = false;
    dispatch('complete', { actionRunId });
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    touchedParamNames = new Set([...touchedParamNames, formParameter.name]);
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
    touchedSettingNames = new Set([...touchedSettingNames, formParameter.name]);
    settingsArgumentsMap = getArguments(settingsArgumentsMap, formParameter);
  }
</script>

<Modal height="max-content" width={550} on:close closeOnEscape={false} closeOnOutsideClick={false}>
  <ModalHeader on:close>{isRerun ? `Re-run: ${actionDefinition.name}` : actionDefinition.name}</ModalHeader>
  <ModalContent style="max-height: 50vh;overflow: auto">
    {#if versionMismatch}
      <Alert.Root variant="destructive" class="mb-3">
        <TriangleAlert class="h-4 w-4" />
        <Alert.Title>Warning</Alert.Title>
        <Alert.Description>
          {#if initialVersionArchived}
            Version {initialRevision} from the original run has been archived. This re-run will use version {effectiveSelectedRevision}.
          {:else}
            The selected version (v{effectiveSelectedRevision}) differs from the original run's version (v{initialRevision}).
          {/if}
        </Alert.Description>
      </Alert.Root>
    {/if}
    {#if showSettings && Object.keys(settingsParametersMap).length > 0}
      <div class="pb-4">
        <div class="pb-2 font-medium text-muted-foreground">
          Input settings for this action run using {actionDefinition.name} version {selectedVersion?.revision}
        </div>
        <Parameters
          formParameters={applyRequiredErrors(
            getFormParameters(
              settingsParametersMap,
              settingsArgumentsMap,
              requiredSettings,
              undefined,
              getDefaultsFromSchema(selectedVersion?.settings_schema ?? {}),
              getUserSequenceValueSchemaOptions(workspaceFiles, actionDefinition.workspace_id),
              'sequence',
              false,
              false,
            ),
            touchedSettingNames,
          )}
          parameterType="action"
          hideRightAdornments
          hideInfo={false}
          on:change={onChangeSettingsParameters}
        />
      </div>
    {/if}

    {#if !selectedVersion}
      <Alert.Root variant="destructive" class="mb-3">
        <TriangleAlert class="h-4 w-4" />
        <Alert.Title>No runnable versions</Alert.Title>
        <Alert.Description>
          All versions of this action have been archived. Unarchive a version before running.
        </Alert.Description>
      </Alert.Root>
    {:else}
      {#if Object.keys(parametersMap).length === 0}
        <i class="flex text-muted-foreground">No parameters defined for this action</i>
      {:else}
        <div class="pb-2 font-medium text-muted-foreground">Input parameters for this action run</div>
      {/if}
      <Parameters
        formParameters={applyRequiredErrors(
          getFormParameters(
            parametersMap,
            argumentsMap,
            requiredParameters,
            undefined,
            getDefaultsFromSchema(selectedVersion?.parameter_schema ?? {}),
            getUserSequenceValueSchemaOptions(workspaceFiles, actionDefinition.workspace_id),
            'sequence',
            false,
            false,
          ),
          touchedParamNames,
        )}
        parameterType="action"
        disabled={isLoadingWorkspace}
        on:change={onChangeFormParameters}
        on:reset={onResetFormParameter}
      />
    {/if}
  </ModalContent>

  <ModalFooter>
    <select class="st-select mr-auto" value={selectedRevision} on:change={onVersionChange}>
      {#if latestVersion}
        <option value="latest">v{latestVersion.revision} (latest)</option>
      {/if}
      {#each runnableVersions.filter(v => v !== latestVersion) as version (version.revision)}
        <option value={version.revision.toString()}>v{version.revision}{version.archived ? ' (archived)' : ''}</option>
      {/each}
    </select>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <div class="ml-2" use:tooltip={{ content: hasEmptyRequired ? 'Please fill in all required fields' : undefined }}>
      <button class="st-button" disabled={running || !selectedVersion || hasEmptyRequired} on:click={run}>
        {running ? 'Running...' : 'Run'}
      </button>
    </div>
  </ModalFooter>
</Modal>
