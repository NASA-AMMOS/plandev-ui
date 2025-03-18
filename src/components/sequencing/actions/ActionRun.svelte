<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import { gqlSubscribable } from '../../../stores/subscribable';
  import type { ActionDefinition, ActionRun, ActionRunSlim } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import { valueSchemaRecordToParametersMap } from '../../../utilities/actions';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import gql from '../../../utilities/gql';
  import { getFormParameters } from '../../../utilities/parameters';
  import Parameters from '../../parameters/Parameters.svelte';
  import ActionRunCard from './ActionRunCard.svelte';

  export let initialActionRun: ActionRun | null = null;
  export let user: User | null;

  let workspaceId: number | null = null;

  $: workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID, $page.url.searchParams);

  const actionRun = gqlSubscribable<ActionRun | null>(
    gql.SUB_ACTION_RUN,
    { actionRunId: initialActionRun?.id },
    initialActionRun,
    user,
  );

  function getActionDefinitionForRun(
    actionRun: ActionRunSlim,
    actionDefinitionsByWorkspace: Record<number, Record<number, ActionDefinition>>,
    workspaceId: number | null,
  ): ActionDefinition | null {
    if (typeof workspaceId === 'number') {
      const workspaceDefinitions = actionDefinitionsByWorkspace[workspaceId];
      if (workspaceDefinitions) {
        return workspaceDefinitions[actionRun.action_definition_id] ?? null;
      }
    }
    return null;
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
          <Parameters
            formParameters={getFormParameters(
              valueSchemaRecordToParametersMap($actionRun.action_definition.settings_schema),
              $actionRun.settings,
              [],
            )}
            parameterType="action"
            hideRightAdornments
            hideInfo
            disabled
          />
          <div class="st-typography-medium action-run-label">Action Parameters</div>
          <Parameters
            formParameters={getFormParameters(
              valueSchemaRecordToParametersMap($actionRun.action_definition.parameter_schema),
              $actionRun.parameters,
              [],
            )}
            parameterType="action"
            hideRightAdornments
            hideInfo
            disabled
          />
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
