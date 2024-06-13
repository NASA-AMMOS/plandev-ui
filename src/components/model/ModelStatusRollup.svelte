<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ModelLog, ModelSlim, ModelStatus } from '../../types/model';
  import { getModelStatusRollup } from '../../utilities/model';
  import { tooltip } from '../../utilities/tooltip';
  import ModelStatusIcon from './ModelStatusIcon.svelte';

  type Mode = 'full' | 'rollup' | 'iconOnly';

  export let flow: 'horizontal' | 'vertical' = 'vertical';
  export let mode: Mode = 'full';
  export let model:
    | Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>
    | undefined;
  export let selectable: boolean = false;
  export let showCompleteStatus: boolean = true;
  export let selectedLog: 'activity' | 'parameter' | 'resource' | undefined = undefined;

  const dispatch = createEventDispatcher<{
    select: ModelLog | null;
  }>();
  const rollupTooltipMessages: Record<ModelStatus, string> = {
    complete: 'Model extraction complete',
    error: 'Model has extraction errors',
    extracting: 'Extracting model',
    none: '',
  };
  const activityLogTooltipMessages: Record<ModelStatus, string> = {
    complete: 'Activity type extraction complete',
    error: 'Activity type extraction has errors',
    extracting: 'Extracting activity types',
    none: '',
  };
  const parameterLogTooltipMessages: Record<ModelStatus, string> = {
    complete: 'Model parameter extraction complete',
    error: 'Model parameter extraction has errors',
    extracting: 'Extracting model parameters',
    none: '',
  };
  const resourceLogTooltipMessages: Record<ModelStatus, string> = {
    complete: 'Resource type extraction complete',
    error: 'Resource type extraction has errors',
    extracting: 'Extracting resource types',
    none: '',
  };

  let activityLog: ModelLog | null = null;
  let activityLogStatus: ModelStatus = 'none';
  let parameterLog: ModelLog | null = null;
  let parameterLogStatus: ModelStatus = 'none';
  let resourceLog: ModelLog | null = null;
  let resourceLogStatus: ModelStatus = 'none';
  let status: ModelStatus = 'none';

  $: ({
    modelStatus: status,
    activityLog,
    activityLogStatus,
    parameterLog,
    parameterLogStatus,
    resourceLog,
    resourceLogStatus,
  } = getModelStatusRollup(model));

  function selectActivityLog() {
    selectedLog = 'activity';
    dispatch('select', activityLog);
  }

  function selectParameterLog() {
    selectedLog = 'parameter';
    dispatch('select', parameterLog);
  }

  function selectResourceLog() {
    selectedLog = 'resource';
    dispatch('select', resourceLog);
  }
</script>

<div class="model-status-container">
  {#if mode === 'rollup' || mode === 'iconOnly'}
    <div
      class="model-status-rollup st-typography-body"
      class:icon-only={mode === 'iconOnly'}
      use:tooltip={{ content: status && rollupTooltipMessages[status] }}
    >
      <ModelStatusIcon {showCompleteStatus} {status} />
      {#if mode === 'rollup'}
        {#if status === 'extracting'}
          Extracting
        {:else if status === 'complete' && showCompleteStatus}
          Extracted
        {:else if status === 'error'}
          Errors extracting
        {/if}
      {/if}
    </div>
  {:else}
    <div class="model-status-logs-container" class:horizontal={flow === 'horizontal'}>
      <button
        class="model-status-button"
        class:selected={selectedLog === 'activity'}
        class:disabled={!selectable}
        on:click={selectActivityLog}
        use:tooltip={{
          content: activityLog?.error_message ?? activityLogTooltipMessages[activityLogStatus],
        }}
      >
        <ModelStatusIcon {showCompleteStatus} status={activityLogStatus} />
        Extract activity types
      </button>
      <button
        class="model-status-button"
        class:selected={selectedLog === 'parameter'}
        class:disabled={!selectable}
        on:click={selectParameterLog}
        use:tooltip={{
          content: parameterLog?.error_message ?? parameterLogTooltipMessages[parameterLogStatus],
        }}
      >
        <ModelStatusIcon {showCompleteStatus} status={parameterLogStatus} />
        Extract resource types
      </button>
      <button
        class="model-status-button"
        class:selected={selectedLog === 'resource'}
        class:disabled={!selectable}
        on:click={selectResourceLog}
        use:tooltip={{
          content: resourceLog?.error_message ?? resourceLogTooltipMessages[resourceLogStatus],
        }}
      >
        <ModelStatusIcon {showCompleteStatus} status={resourceLogStatus} />
        Extract mission model parameters
      </button>
    </div>
  {/if}
</div>

<style>
  .model-status-container {
    --model-status-gap: 8px;
  }

  .model-status-rollup {
    align-items: center;
    column-gap: var(--model-status-gap);
    display: grid;
    grid-template-columns: min-content auto;
    white-space: nowrap;
    width: fit-content;
  }

  .model-status-rollup.icon-only {
    grid-template-columns: min-content;
  }

  .model-status-logs-container:not(.horizontal) {
    display: grid;
    grid-template-rows: repeat(3, min-content);
    row-gap: 12px;
  }

  .model-status-logs-container.horizontal {
    column-gap: 8px;
    display: grid;
    grid-template-columns: repeat(3, min-content);
  }

  .model-status-logs-container .model-status-button {
    align-items: center;
    background: none;
    border: 0;
    border-radius: 8px;
    column-gap: var(--model-status-gap);
    cursor: pointer;
    display: grid;
    grid-template-columns: min-content min-content;
    padding: 6px;
    white-space: nowrap;
  }

  .model-status-logs-container .model-status-button:hover {
    background-color: var(--tab-hover-background-color, var(--st-gray-20));
  }

  .model-status-logs-container .model-status-button.selected {
    background: var(--st-white, #fff);
  }

  .model-status-logs-container .model-status-button.disabled {
    background-color: inherit;
    border: 0;
    color: var(--st-primary-text-color);
    cursor: inherit;
    padding: 0;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }
</style>
