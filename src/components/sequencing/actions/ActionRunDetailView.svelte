<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Tabs } from '@nasa-jpl/stellar-svelte';
  import { capitalize } from 'lodash-es';
  import { ArrowLeft, Ban, Download, RefreshCw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import { Status } from '../../../enums/status';
  import { actionDefinitionsByWorkspace } from '../../../stores/actions';
  import { gqlSubscribable } from '../../../stores/subscribable';
  import { workspaceId } from '../../../stores/workspaces';
  import type { ActionDefinition, ActionDefinitionVersion, ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { ArgumentsMap, FormParameter } from '../../../types/parameter';
  import {
    getActionDefinitionForRun,
    getDefaultsFromSchema,
    getLatestRunnableVersion,
    getStatusForActionRun,
    parseActionLogLines,
    type ParsedActionLog,
    valueSchemaRecordToParametersMap,
  } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import { downloadJSON } from '../../../utilities/generic';
  import gql from '../../../utilities/gql';
  import { getFormParameters } from '../../../utilities/parameters';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { formatMS } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import Parameters from '../../parameters/Parameters.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import ActionRunLogs from './ActionRunLogs.svelte';

  const dispatch = createEventDispatcher<{
    back: void;
    rerun: { actionDefinitionId: number; parameters: ArgumentsMap; revision: number; settings: ArgumentsMap };
    viewAction: { actionId: number };
  }>();

  export let actionRunId: number;
  export let hasRunPermission: boolean;
  export let user: User | null;

  const actionRunIdStore = writable(actionRunId);
  const actionRunSubscription = gqlSubscribable<ActionRun | null>(
    gql.SUB_ACTION_RUN,
    { actionRunId: actionRunIdStore },
    null,
  );

  let actionSettings: FormParameter[] = [];
  let actionParameters: FormParameter[] = [];
  let actionRun: ActionRun | null = null;
  let actionDefinition: ActionDefinition | null = null;
  let latestVersion: ActionDefinitionVersion | null = null;
  let isLatestVersion: boolean = false;
  let parsedLogs: ParsedActionLog[] = [];
  let status: Status | null = null;

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
  $: parsedLogs = actionRun?.logs ? parseActionLogLines(actionRun.logs) : ([] as ParsedActionLog[]);
  $: errorEntry =
    actionRun?.error?.message != null
      ? ({
          level: 'error',
          message: actionRun.error.message,
          timestamp: actionRun.requested_at,
          trace: actionRun.error.stack,
        } satisfies ParsedActionLog)
      : null;

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

  function onDownloadRun() {
    if (!actionRun) {
      return;
    }
    downloadJSON(
      {
        canceled: actionRun.canceled,
        duration: actionRun.duration,
        error: actionRun.error,
        id: actionRun.id,
        logs: parsedLogs,
        parameters: actionRun.parameters,
        requestedAt: actionRun.requested_at,
        requestedBy: actionRun.requested_by,
        results: actionRun.results,
        settings: actionRun.settings,
        status: actionRun.status,
      },
      `${actionRun.action_definition.name}-${actionRun.id}.json`,
    );
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
          <span class="flex shrink-0 items-center justify-center">
            <StatusBadge {status} />
          </span>
          <h2 class="shrink-0 text-lg font-bold">Run #{actionRun.id}</h2>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" on:click={onDownloadRun}>
          <Download size={12} class="mr-1" />
          Download
        </Button>
        {#if actionDefinition && !actionDefinition.archived}
          <div
            use:permissionHandler={{
              hasPermission: hasRunPermission,
              permissionError: 'You do not have permission to run an action',
            }}
          >
            <Button variant="outline" on:click={onRerun}>
              <RefreshCw size={12} class="mr-1" />
              Re-run
            </Button>
          </div>
        {/if}
        {#if status === Status['Pending'] || status === Status['Incomplete']}
          <div
            use:permissionHandler={{
              hasPermission: hasRunPermission,
              permissionError: 'You do not have permission to run an action',
            }}
          >
            <Button variant="outline" on:click={onCancelRun}>
              <Ban size={12} class="mr-1" />
              Cancel
            </Button>
          </div>
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
        Status: <span class="text-foreground">{capitalize(status ?? 'unknown')}</span>
      </span>
      <span>
        Version: <span class="text-foreground">
          {actionRun.action_definition_revision}{isLatestVersion ? ' (latest)' : ''}
        </span>
      </span>
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
            {#if errorEntry}
              <div
                class="flex flex-col gap-3 rounded border border-destructive/30 bg-destructive/5 p-4"
                data-testid="action-run-error-log"
              >
                <h3 class="text-sm font-medium text-destructive">Error</h3>
                <ActionRunLogs logs={[errorEntry]} />
              </div>
            {/if}
            <div class="flex flex-col gap-3 rounded border border-border p-4">
              <h3 class="text-sm font-medium">Results</h3>
              {#if actionRun.results?.data}
                <pre
                  data-testid="action-run-results"
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
              {#if parsedLogs.length}
                <ActionRunLogs logs={parsedLogs} />
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
