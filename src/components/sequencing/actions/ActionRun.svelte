<svelte:options immutable={true} />

<script lang="ts">
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import { gqlSubscribable } from '../../../stores/subscribable';
  import type { ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { FormParameter } from '../../../types/parameter';
  import type { ValueSchemaOption } from '../../../types/schema';
  import {
    getActionDefinitionForRun,
    getUserSequenceValueSchemaOptions,
    valueSchemaRecordToParametersMap,
  } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import gql from '../../../utilities/gql';
  import { getFormParameters } from '../../../utilities/parameters';
  import Parameters from '../../parameters/Parameters.svelte';
  import ActionRunCard from './ActionRunCard.svelte';

  export let initialActionRun: ActionRun | null = null;
  export let user: User | null;
  export let workspaceId: number | null = null;

  let actionSettings: FormParameter[] = [];
  let actionParameters: FormParameter[] = [];
  let sequenceOptions: ValueSchemaOption[] = [];

  $: if (workspaceId != null) {
    getUserSequenceOptions(workspaceId);
  }

  $: updateActionSettingsAndParameters(); //update on any change

  $: if (sequenceOptions.length) {
    //if the user sequences change, we need to update
    updateActionSettingsAndParameters();
  }

  const actionRun = gqlSubscribable<ActionRun | null>(
    gql.SUB_ACTION_RUN,
    { actionRunId: initialActionRun?.id },
    initialActionRun,
    user,
  );

  async function getUserSequenceOptions(idOfWorkspace: number): Promise<void> {
    const workspaceSequences = await effects.getWorkspaceSequences(idOfWorkspace, null, false, user);
    sequenceOptions = getUserSequenceValueSchemaOptions(workspaceSequences, workspaceId);
  }

  async function onCancelAction(id: number) {
    await effects.cancelActionRun(id, user);
  }

  function updateActionSettingsAndParameters() {
    if (initialActionRun !== null) {
      actionSettings = getFormParameters(
        valueSchemaRecordToParametersMap(initialActionRun.action_definition.settings_schema),
        initialActionRun.settings,
        [],
        undefined,
        undefined,
        sequenceOptions,
        'sequence',
      );

      actionParameters = getFormParameters(
        valueSchemaRecordToParametersMap(initialActionRun.action_definition.parameter_schema),
        initialActionRun.parameters,
        [],
        undefined,
        undefined,
        sequenceOptions,
        'sequence',
      );
    }
  }
</script>

<div class="action-run-container">
  <div class="action-run">
    {#if !$actionRun}
      <div class="st-typography-medium">No action run found</div>
    {/if}
    {#if $actionRun}
      <ActionRunCard
        actionRun={$actionRun}
        actionDefinition={getActionDefinitionForRun($actionRun, $actionDefinitionsByWorkspace, workspaceId)}
        on:cancelAction={e => onCancelAction(e.detail.id)}
        interactable={false}
      />
      <div>
        <div class="st-typography-medium action-run-label">Results</div>
        {#if $actionRun.results?.data}
          <div class="logs">
            <pre>{JSON.stringify($actionRun.results?.data, undefined, 2)}</pre>
          </div>
        {:else}
          <div class="logs empty">No data</div>
        {/if}
        <div class="st-typography-medium action-run-label">Errors</div>
        {#if $actionRun.error}
          <div class="logs">
            <pre>Message: {JSON.stringify($actionRun.error.message, undefined, 2)}</pre>
            <pre>Stack: {JSON.stringify($actionRun.error.stack, undefined, 2)}</pre>
          </div>
        {:else}
          <div class="logs empty">No errors</div>
        {/if}
        <div class="st-typography-medium action-run-label">String Logs</div>
        {#if $actionRun.logs}
          <pre class="logs">{$actionRun.logs}</pre>
        {:else}
          <div class="logs empty">No logs</div>
        {/if}
        <div class="st-typography-medium action-run-label">Action Settings</div>
        <div class="action-run-parameters">
          <Parameters formParameters={actionSettings} parameterType="action" hideRightAdornments hideInfo disabled />
          <div class="st-typography-medium action-run-label">Action Parameters</div>
          <Parameters formParameters={actionParameters} parameterType="action" hideRightAdornments hideInfo disabled />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .action-run-container {
    overflow-x: hidden;
  }

  .action-run {
    padding: 24px;
  }

  .logs {
    background: var(--st-gray-10);
    border-radius: 4px;
    font-family: 'JetBrains mono';
    max-height: 400px;
    overflow: auto;
    padding: 16px;
  }

  .logs pre {
    font-family: 'JetBrains mono';
    margin: 0;
  }

  .logs.empty {
    opacity: 0.5;
  }

  .action-run-label {
    padding: 16px 0px 8px 0px;
  }

  .action-run-parameters {
    max-width: 500px;
  }
</style>
