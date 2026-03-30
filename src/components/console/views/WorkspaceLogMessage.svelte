<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BaseError } from '../../../types/errors';
  import { ErrorTypes } from '../../../utilities/errors';

  export let log: BaseError;

  const dispatch = createEventDispatcher<{
    gotoLine: { column: number; line: number };
    viewRun: { runId: number };
  }>();

  function handleActionRunClick(event: MouseEvent, actionRunId: number) {
    event.stopPropagation();
    dispatch('viewRun', { runId: actionRunId });
  }

  function handleGotoLine(event: MouseEvent, line: number, column: number) {
    event.stopPropagation();
    dispatch('gotoLine', { column, line });
  }
</script>

{#if log.type === ErrorTypes.WORKSPACE_LINT_ERROR && typeof log.data?.line === 'number' && log.data?.filePath}
  {@const location = `${log.data.filePath}:${log.data.line}:${log.data.column ?? 0}`}
  {@const messagePrefix = `${location} - `}
  {@const messageBody = log.message?.startsWith(messagePrefix) ? log.message.slice(messagePrefix.length) : log.message}
  <button
    class="mr-1 cursor-pointer text-left text-amber-700 underline decoration-amber-400/50 underline-offset-2 hover:text-amber-900 hover:decoration-amber-600"
    on:click={e => handleGotoLine(e, log.data?.line, log.data?.column ?? 0)}
  >
    {location}
  </button>
  {messageBody}
{:else if log.type === ErrorTypes.WORKSPACE_ACTION_RUN && log.data?.actionRunId && log.data?.actionName}
  <button
    class="inline-flex cursor-pointer items-center gap-0.5 text-violet-700 underline decoration-violet-400/50 underline-offset-2 hover:text-violet-900 hover:decoration-violet-600"
    on:click={e => handleActionRunClick(e, log.data?.actionRunId)}
  >
    {log.data.actionName}•
    <span>Run #{log.data.actionRunId}</span>
  </button>
  {#if log.data.status === 'failed'}
    <span class="ml-0.5"> failed</span>
  {:else}
    <span class="ml-0.5 text-muted-foreground"> {log.data.status}</span>
  {/if}
{:else}
  {log.message ?? ''}
{/if}
