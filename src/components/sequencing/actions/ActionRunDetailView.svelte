<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Tabs } from '@nasa-jpl/stellar-svelte';
  import { capitalize } from 'lodash-es';
  import { ArrowLeft, Ban, RefreshCw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import { Status } from '../../../enums/status';
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import { gqlSubscribable } from '../../../stores/subscribable';
  import { workspaceId } from '../../../stores/workspaces';
  import type { ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { LogMessage } from '../../../types/errors';
  import type { ArgumentsMap, FormParameter } from '../../../types/parameter';
  import {
    getActionDefinitionForRun,
    getDefaultsFromSchema,
    getLatestRunnableVersion,
    getStatusForActionRun,
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
  import StatusBadge from '../../ui/StatusBadge.svelte';

  const dispatch = createEventDispatcher<{
    back: void;
    rerun: { actionDefinitionId: number; parameters: ArgumentsMap; revision: number; settings: ArgumentsMap };
    viewAction: { actionId: number };
  }>();

  export let actionRunId: number;
  export let hasPermission: boolean;
  export let user: User | null;

  const actionRunIdStore = writable(actionRunId);
  const actionRunSubscription = gqlSubscribable<ActionRun | null>(
    gql.SUB_ACTION_RUN,
    { actionRunId: actionRunIdStore },
    null,
  );

  let actionSettings: FormParameter[] = [];
  let actionParameters: FormParameter[] = [];

  $: actionRunIdStore.set(actionRunId);
  $: actionRun = $actionRunSubscription;

  $: if (actionRun) {
    updateActionSettingsAndParameters(actionRun);
  }

  $: actionDefinition = actionRun
    ? getActionDefinitionForRun(actionRun, $actionDefinitionsByWorkspace, $workspaceId)
    : null;

  $: latestVersion = getLatestRunnableVersion(actionRun?.action_definition.versions ?? []);
  $: isLatestVersion = latestVersion != null && actionRun?.action_definition_revision === latestVersion.revision;
  $: status = actionRun ? getStatusForActionRun(actionRun) : null;

  function updateActionSettingsAndParameters(run: ActionRun) {
    const version =
      run.action_definition.versions.find(v => v.revision === run.action_definition_revision) ??
      run.action_definition.versions[0];

    actionSettings = getFormParameters(
      valueSchemaRecordToParametersMap(version?.settings_schema ?? {}),
      run.settings,
      [],
      undefined,
      getDefaultsFromSchema(version?.settings_schema ?? {}),
      undefined,
      'sequence',
      false,
      false,
    );

    actionParameters = getFormParameters(
      valueSchemaRecordToParametersMap(version?.parameter_schema ?? {}),
      run.parameters,
      [],
      undefined,
      getDefaultsFromSchema(version?.parameter_schema ?? {}),
      undefined,
      'sequence',
      false,
      false,
    );
  }

  function parseLogLines(logString: string): LogMessage[] {
    // Action server formats logs as: TIMESTAMP [LEVEL] message
    // Continuation lines (multi-line errors/stack traces) appear as: [LEVEL] text (indented, no timestamp)
    const serverLogPattern = /^(\S+)\s+\[(INFO|WARN|ERROR|DEBUG)]\s+(.*)$/;
    const continuationLevelPattern = /^\s*\[(INFO|WARN|ERROR|DEBUG)]\s+(.*)$/;
    const results: LogMessage[] = [];

    for (const line of logString.split('\n')) {
      if (!line.trim()) {
        continue;
      }

      const mainMatch = line.match(serverLogPattern);
      if (mainMatch) {
        const [, timestamp, rawLevel, message] = mainMatch;
        results.push({
          level: rawLevel.toLowerCase() as LogMessage['level'],
          message,
          timestamp,
          type: ErrorTypes.LOG,
        });
        continue;
      }

      // Continuation line — strip [LEVEL] prefix and merge into previous entry's trace
      const contMatch = line.match(continuationLevelPattern);
      const cleanLine = contMatch ? contMatch[2] : line.trim();

      if (results.length > 0) {
        const prev = results[results.length - 1];
        prev.trace = prev.trace ? `${prev.trace}\n${cleanLine}` : cleanLine;
      } else {
        results.push({
          level: 'info',
          message: cleanLine,
          timestamp: '',
          type: ErrorTypes.LOG,
        });
      }
    }

    return results;
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
        revision: actionRun.action_definition_revision,
        settings: actionRun.settings,
      });
    }
  }

  function onBack() {
    dispatch('back');
  }
</script>

{#if actionRun}
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <button
          class="shrink-0 rounded p-1 hover:bg-accent"
          on:click={onBack}
          use:tooltip={{ content: 'Back', placement: 'bottom' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div class="flex min-w-0 items-center gap-2">
          {#if actionDefinition}
            <button
              class="truncate text-lg text-muted-foreground hover:underline"
              on:click={() => dispatch('viewAction', { actionId: actionRun.action_definition_id })}
            >
              {actionDefinition.name}
            </button>
            <span class="shrink-0 text-sm text-muted-foreground">/</span>
          {/if}
          <span class="flex shrink-0 items-center justify-center"><StatusBadge {status} /></span>
          <h2 class="shrink-0 text-lg font-bold">Run #{actionRun.id}</h2>
        </div>
      </div>
      <div class="flex items-center gap-2">
        {#if actionDefinition && !actionDefinition.archived}
          <div
            use:permissionHandler={{ hasPermission, permissionError: 'You do not have permission to run an action' }}
          >
            <Button variant="outline" on:click={onRerun}>
              <RefreshCw size={12} class="mr-1" />
              Re-run
            </Button>
          </div>
        {/if}
        {#if status === Status['Pending'] || status === Status['Incomplete']}
          <button
            class="st-button secondary"
            style="font-size: 12px; height: 28px; padding: 0 12px;"
            on:click={onCancelRun}
          >
            <Ban size={12} class="mr-1" />
            Cancel
          </button>
        {/if}
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
      <span>
        Status: <span class="text-foreground">{actionRun.canceled ? 'Canceled' : capitalize(actionRun.status)}</span>
      </span>
      <span
        >Version: <span class="text-foreground"
          >{actionRun.action_definition_revision}{isLatestVersion ? ' (latest)' : ''}</span
        ></span
      >
    </div>

    <!-- Tabbed content -->
    <div class="flex-1 overflow-hidden">
      <Tabs.Root value="output" class="flex h-full flex-col">
        <Tabs.List
          class="flex h-[36px] shrink-0 items-center justify-start rounded-none border-b border-border bg-secondary/50 py-0"
        >
          <div class="flex items-center py-0.5">
            <Tabs.Trigger
              value="output"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-0.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none lg:px-1.5"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Output</div>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="parameters"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-0.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none lg:px-1.5"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Parameters</div>
            </Tabs.Trigger>
          </div>
        </Tabs.List>

        <!-- Output tab (errors, results, logs) -->
        <Tabs.Content value="output" class="mt-0 flex-1 overflow-y-auto">
          <div class="mx-auto flex max-w-5xl flex-col gap-4 p-6">
            {#if actionRun.error?.message}
              {@const errorLog = {
                level: 'error',
                message: actionRun.error.message,
                timestamp: actionRun.requested_at,
                trace: actionRun.error.stack,
                type: ErrorTypes.CAUGHT_ERROR,
              }}
              <div class="flex flex-col gap-3 rounded border border-destructive/30 bg-destructive/5 p-4">
                <h3 class="text-sm font-medium text-destructive">Error</h3>
                <div class="overflow-auto rounded bg-muted py-2 font-mono text-xs">
                  <ConsoleLog log={errorLog} showType={false} />
                </div>
              </div>
            {/if}
            <div class="flex flex-col gap-3 rounded border border-border p-4">
              <h3 class="text-sm font-medium">Results</h3>
              {#if actionRun.results?.data}
                <pre
                  class="max-h-[600px] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 font-mono text-xs">{JSON.stringify(
                    actionRun.results.data,
                    undefined,
                    2,
                  )}</pre>
              {:else}
                <p class="text-xs italic text-muted-foreground">No results data</p>
              {/if}
            </div>
            <div class="flex flex-col gap-3 rounded border border-border p-4">
              <h3 class="text-sm font-medium">Logs</h3>
              {#if actionRun.logs}
                {@const logMessages = parseLogLines(actionRun.logs)}
                <div class="max-h-[600px] overflow-auto rounded bg-muted py-2 font-mono text-xs">
                  {#each logMessages as log}
                    <ConsoleLog {log} showType={false} />
                  {/each}
                </div>
              {:else}
                <p class="text-xs italic text-muted-foreground">No logs</p>
              {/if}
            </div>
          </div>
        </Tabs.Content>

        <!-- Parameters tab -->
        <Tabs.Content value="parameters" class="mt-0 flex-1 overflow-y-auto">
          <div class="mx-auto flex max-w-2xl flex-col gap-4 p-6">
            <div class="flex flex-col gap-3 rounded border border-border p-4">
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
            <div class="flex flex-col gap-3 rounded border border-border p-4">
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
      </Tabs.Root>
    </div>
  </div>
{:else}
  <div class="flex h-full items-center justify-center text-xs text-muted-foreground">Loading action run...</div>
{/if}
