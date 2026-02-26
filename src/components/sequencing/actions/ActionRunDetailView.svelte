<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Tabs } from '@nasa-jpl/stellar-svelte';
  import { ArrowLeft, Ban, ExternalLink, RefreshCw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import { gqlSubscribable } from '../../../stores/subscribable';
  import { workspaceId } from '../../../stores/workspaces';
  import type { ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { LogMessage } from '../../../types/errors';
  import type { ArgumentsMap, FormParameter } from '../../../types/parameter';
  import type { ValueSchemaOption } from '../../../types/schema';
  import {
    getActionDefinitionForRun,
    getStatusForActionRun,
    getUserSequenceValueSchemaOptions,
    openActionRun,
    valueSchemaRecordToParametersMap,
  } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import { ErrorTypes } from '../../../utilities/errors';
  import gql from '../../../utilities/gql';
  import { getFormParameters } from '../../../utilities/parameters';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { formatMS } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import ConsoleLog from '../../console/views/ConsoleLog.svelte';
  import Parameters from '../../parameters/Parameters.svelte';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  const dispatch = createEventDispatcher<{
    back: void;
    rerun: { actionDefinitionId: number; parameters: ArgumentsMap };
    viewAction: { actionId: number };
  }>();

  export let actionRunId: number;
  export let hasPermission: boolean;
  export let user: User | null;

  let actionSettings: FormParameter[] = [];
  let actionParameters: FormParameter[] = [];
  let sequenceOptions: ValueSchemaOption[] = [];

  const actionRunSubscription = gqlSubscribable<ActionRun | null>(gql.SUB_ACTION_RUN, { actionRunId }, null, user);

  $: actionRun = $actionRunSubscription;

  $: if ($workspaceId > 0) {
    getWorkspaceFileOptions($workspaceId);
  }

  $: if (actionRun) {
    updateActionSettingsAndParameters(actionRun);
  }

  $: actionDefinition = actionRun
    ? getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, $workspaceId)
    : null;

  $: status = actionRun ? getStatusForActionRun(actionRun) : null;

  async function getWorkspaceFileOptions(idOfWorkspace: number): Promise<void> {
    const workspaceFileList = await effects.getWorkspaceFilesList(idOfWorkspace, user);
    sequenceOptions = getUserSequenceValueSchemaOptions(workspaceFileList, idOfWorkspace);
  }

  function updateActionSettingsAndParameters(run: ActionRun) {
    actionSettings = getFormParameters(
      valueSchemaRecordToParametersMap(run.action_definition.settings_schema),
      run.settings,
      [],
      undefined,
      undefined,
      sequenceOptions,
      'sequence',
      undefined,
      false,
      false,
    );

    actionParameters = getFormParameters(
      valueSchemaRecordToParametersMap(run.action_definition.parameter_schema),
      run.parameters,
      [],
      undefined,
      undefined,
      sequenceOptions,
      'sequence',
      undefined,
      false,
      false,
    );
  }

  function parseLogLines(logString: string): LogMessage[] {
    return logString
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        let level: LogMessage['level'] = 'info';
        if (line.includes('[ERROR]')) {
          level = 'error';
        } else if (line.includes('[WARN]')) {
          level = 'warn';
        }
        return {
          level,
          message: line,
          timestamp: '',
          type: ErrorTypes.LOG,
        };
      });
  }

  async function onCancelRun() {
    if (actionRun && (actionRun.status === 'pending' || actionRun.status === 'incomplete')) {
      await effects.cancelActionRun(actionRun.id, user);
    }
  }

  function onRerun() {
    if (actionRun && actionDefinition) {
      dispatch('rerun', {
        actionDefinitionId: actionRun.action_definition_id,
        parameters: actionRun.parameters,
      });
    }
  }

  function onOpenInNewTab() {
    openActionRun($workspaceId, actionRunId, true);
  }

  function onBack() {
    dispatch('back');
  }
</script>

{#if actionRun}
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
      <div class="flex items-center gap-3">
        <button
          class="rounded p-1 hover:bg-accent"
          on:click={onBack}
          use:tooltip={{ content: 'Back', placement: 'bottom' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div class="flex items-center gap-2">
          {#if actionDefinition}
            <button
              class="text-sm text-muted-foreground hover:underline"
              on:click={() => dispatch('viewAction', { actionId: actionRun.action_definition_id })}
            >
              {actionDefinition.name}
            </button>
            <span class="text-sm text-muted-foreground">/</span>
          {/if}
          <StatusBadge {status} />
          <h2 class="text-lg font-bold">Run #{actionRun.id}</h2>
        </div>
      </div>
      <div class="flex items-center gap-2">
        {#if actionDefinition}
          <div
            use:permissionHandler={{ hasPermission, permissionError: 'You do not have permission to run an action' }}
          >
            <Button variant="outline" on:click={onRerun}>
              <RefreshCw size={12} class="mr-1" />
              Re-run
            </Button>
          </div>
        {/if}
        {#if actionRun.status === 'pending' || actionRun.status === 'incomplete'}
          <button
            class="st-button secondary"
            style="font-size: 12px; height: 28px; padding: 0 12px;"
            on:click={onCancelRun}
          >
            <Ban size={12} class="mr-1" />
            Cancel
          </button>
        {/if}
        <button
          class="rounded p-1 hover:bg-accent"
          on:click={onOpenInNewTab}
          use:tooltip={{ content: 'Open in new tab', placement: 'bottom' }}
        >
          <ExternalLink size={14} />
        </button>
      </div>
    </div>

    <!-- Metadata bar -->
    <div class="flex flex-wrap gap-x-6 gap-y-1 border-b border-border px-4 py-2 text-xs text-muted-foreground">
      {#if actionRun.requested_by}
        <span>Requested by: <span class="text-foreground">{actionRun.requested_by}</span></span>
      {/if}
      <span>Requested at: <span class="text-foreground">{new Date(actionRun.requested_at).toLocaleString()}</span></span
      >
      {#if actionRun.duration != null}
        <span>Duration: <span class="text-foreground">{formatMS(actionRun.duration)}</span></span>
      {/if}
      <span>Status: <span class="text-foreground">{actionRun.canceled ? 'Canceled' : actionRun.status}</span></span>
    </div>

    <!-- Tabbed content -->
    <div class="flex-1 overflow-hidden">
      <Tabs.Root value="results" class="flex h-full flex-col">
        <Tabs.List
          class="flex h-[36px] shrink-0 items-center justify-start rounded-none border-b border-border bg-secondary/50 py-0"
        >
          <div class="flex items-center py-0.5">
            <Tabs.Trigger
              value="results"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-0.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none lg:px-1.5"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Results</div>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="parameters"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-0.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none lg:px-1.5"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Parameters</div>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="logs"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-0.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none lg:px-1.5"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Logs</div>
            </Tabs.Trigger>
          </div>
        </Tabs.List>

        <!-- Results tab -->
        <Tabs.Content value="results" class="mt-0 flex-1 overflow-y-auto">
          <div class="flex flex-col gap-4 p-4">
            <div class="flex flex-col gap-2">
              <h3 class="text-sm font-medium">Results Data</h3>
              {#if actionRun.results?.data}
                <div class="h-[400px]">
                  <MonacoEditor
                    automaticLayout={true}
                    language="json"
                    lineNumbers="on"
                    minimap={{ enabled: false }}
                    readOnly={true}
                    scrollBeyondLastLine={false}
                    tabSize={2}
                    value={JSON.stringify(actionRun.results.data, undefined, 2)}
                  />
                </div>
              {:else}
                <p class="text-xs italic text-muted-foreground">No data</p>
              {/if}
            </div>

            <div class="flex flex-col gap-2">
              <h3 class="text-sm font-medium">Errors</h3>
              {#if actionRun.error}
                {@const errorLog = {
                  level: 'error',
                  message: actionRun.error.message,
                  timestamp: actionRun.requested_at,
                  trace: actionRun.error.stack,
                  type: ErrorTypes.CAUGHT_ERROR,
                }}
                <div class="max-h-[400px] overflow-auto rounded bg-muted py-2 font-mono text-xs">
                  <ConsoleLog log={errorLog} showTimestamp={false} showType={false} />
                </div>
              {:else}
                <p class="text-xs italic text-muted-foreground">No errors</p>
              {/if}
            </div>
          </div>
        </Tabs.Content>

        <!-- Parameters tab -->
        <Tabs.Content value="parameters" class="mt-0 flex-1 overflow-y-auto">
          <div class="flex max-w-lg flex-col gap-4 p-4">
            <div class="flex flex-col gap-2">
              <h3 class="text-sm font-medium">Action Parameters</h3>
              {#if actionParameters.length > 0}
                <Parameters
                  formParameters={actionParameters}
                  parameterType="action"
                  hideRightAdornments
                  hideInfo={false}
                  disabled
                />
              {:else}
                <p class="text-xs italic text-muted-foreground">No parameters</p>
              {/if}
            </div>
            <div class="flex flex-col gap-2">
              <h3 class="text-sm font-medium">Action Settings</h3>
              {#if actionSettings.length > 0}
                <Parameters
                  formParameters={actionSettings}
                  parameterType="action"
                  hideRightAdornments
                  hideInfo={false}
                  disabled
                />
              {:else}
                <p class="text-xs italic text-muted-foreground">No settings</p>
              {/if}
            </div>
          </div>
        </Tabs.Content>

        <!-- Logs tab -->
        <Tabs.Content value="logs" class="mt-0 flex-1 overflow-y-auto">
          <div class="flex flex-col gap-2 p-4">
            <h3 class="text-sm font-medium">Logs</h3>
            {#if actionRun.logs}
              {@const logMessages = parseLogLines(actionRun.logs)}
              <div class="max-h-[600px] overflow-auto rounded bg-muted py-2 font-mono text-xs">
                {#each logMessages as log}
                  <ConsoleLog {log} showTimestamp={false} showType={false} />
                {/each}
              </div>
            {:else}
              <p class="text-xs italic text-muted-foreground">No logs</p>
            {/if}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </div>
{:else}
  <div class="flex h-full items-center justify-center text-sm text-muted-foreground">Loading action run...</div>
{/if}
