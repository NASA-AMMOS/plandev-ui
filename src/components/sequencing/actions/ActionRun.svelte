<svelte:options immutable={true} />

<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { actionsMap } from '../../../stores/actions';
  import { workspaces } from '../../../stores/sequencing';
  import type { Action, ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { Workspace } from '../../../types/sequencing';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import ActionRunCard from './ActionRunCard.svelte';

  export let user: User | null;
  export let actionRun: ActionRun | undefined = undefined;

  let action: Action | undefined = undefined;
  let workspace: Workspace | undefined;
  let workspaceId: number | null = null;

  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });

  $: if (actionRun) {
    action = $actionsMap[actionRun.actionId];
  }
</script>

<div style:overflow-x="hidden">
  <a
    href={`/sequencing/actions${workspace ? `?${SearchParameters.WORKSPACE_ID}=${workspace.id}` : ''}`}
    class="st-typography-medium"
    style=" align-items: center; border-bottom: 1px solid var(--st-gray-20);display: flex; gap: 8px; padding: 8px;"
  >
    <ArrowLeftIcon />
    Back to workspace actions
  </a>

  <div class="action-run">
    {#if !actionRun}
      <div>No action run found</div>
    {/if}
    {#if actionRun}
      <ActionRunCard {actionRun} {user} interactable={false} />
      <div>
        <div class="st-typography-medium" style="padding: 16px 0px 8px 0px">Results</div>
        {#if actionRun.response.results?.data}
          <div class="logs">
            <pre>{JSON.stringify(actionRun.response.results.data, undefined, 2)}</pre>
          </div>
        {:else}
          <div class="logs"><div style="opacity: 0.5">No data</div></div>
        {/if}
        <div class="st-typography-medium" style="padding: 16px 0px 8px 0px">Errors</div>
        {#if actionRun.response.errors}
          <div class="logs">
            <pre>Message: {JSON.stringify(actionRun.response.errors.message, undefined, 2)}</pre>
            <pre>Stack: {JSON.stringify(actionRun.response.errors.stack, undefined, 2)}</pre>
          </div>
        {:else}
          <div class="logs"><div style="opacity: 0.5">No errors</div></div>
        {/if}
        <div class="st-typography-medium" style="padding: 16px 0px 8px 0px">Console Logs</div>
        {#if actionRun.response.results?.data}
          <div class="logs">
            <div style="margin-bottom: 16px;">
              <div style="margin-bottom: 8px;" class="st-typography-bold">Log</div>
              {#each actionRun.response.console.log as entry}
                <pre style="margin: 0;">{JSON.stringify(entry, undefined, 2)}</pre>
              {/each}
              {#if actionRun.response.console.log.length < 1}
                <div style="opacity: 0.5">No output</div>
              {/if}
            </div>
            <div style="margin-bottom: 16px;">
              <div style="margin-bottom: 8px;" class="st-typography-bold">Info</div>
              {#each actionRun.response.console.info as entry}
                <pre style="margin: 0;">{JSON.stringify(entry, undefined, 2)}</pre>
              {/each}
              {#if actionRun.response.console.info.length < 1}
                <div style="opacity: 0.5">No output</div>
              {/if}
            </div>
            <div style="margin-bottom: 16px;">
              <div style="margin-bottom: 8px;" class="st-typography-bold">Warn</div>
              {#each actionRun.response.console.warn as entry}
                <pre style="margin: 0;">{JSON.stringify(entry, undefined, 2)}</pre>
              {/each}
              {#if actionRun.response.console.warn.length < 1}
                <div style="opacity: 0.5">No output</div>
              {/if}
            </div>
            <div style="margin-bottom: 16px;">
              <div style="margin-bottom: 8px;" class="st-typography-bold">Error</div>
              {#each actionRun.response.console.error as entry}
                <pre style="margin: 0;">{JSON.stringify(entry, undefined, 2)}</pre>
              {/each}
              {#if actionRun.response.console.error.length < 1}
                <div style="opacity: 0.5">No output</div>
              {/if}
            </div>
            <div style="margin-bottom: 16px;">
              <div style="margin-bottom: 8px;" class="st-typography-bold">Debug</div>
              {#each actionRun.response.console.debug as entry}
                <pre style="margin: 0;">{JSON.stringify(entry, undefined, 2)}</pre>
              {/each}
              {#if actionRun.response.console.debug.length < 1}
                <div style="opacity: 0.5">No output</div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="logs"><div style="opacity: 0.5">No logs</div></div>
        {/if}
        <div class="st-typography-medium" style="padding: 16px 0px 8px 0px">Action JS</div>
        {#if action?.actionJS}
          <div class="code">
            <MonacoEditor
              automaticLayout={true}
              fixedOverflowWidgets={true}
              language="typescript"
              lineNumbers="on"
              minimap={{ enabled: false }}
              readOnly
              scrollBeyondLastLine={false}
              tabSize={2}
              value={action?.actionJS}
            />
          </div>
        {:else}
          No actionJS
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .action-run {
    overflow-x: hidden;
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
  }

  .code {
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    height: 400px;
    overflow: hidden;
  }
</style>
