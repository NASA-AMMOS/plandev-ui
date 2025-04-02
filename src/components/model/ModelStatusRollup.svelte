<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ModelLog, ModelSlim, ModelStatus } from '../../types/model';
  import { classNames } from '../../utilities/generic';
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

{#if mode === 'rollup' || mode === 'iconOnly'}
  <div
    aria-label="Model status"
    class="grid w-fit items-center gap-x-2 whitespace-nowrap {mode === 'iconOnly'
      ? 'grid-cols-[min-content]'
      : 'grid-cols-[min-content_auto]'}"
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
  <div
    class="grid gap-y-3 {flow === 'horizontal'
      ? 'grid-cols-[repeat(3,_min-content)] gap-x-2'
      : 'grid-rows-[repeat(3,_min-content)] gap-y-2'}"
  >
    <div
      use:tooltip={{
        content: activityLog?.error_message ?? activityLogTooltipMessages[activityLogStatus],
      }}
    >
      <Button
        variant="ghost"
        class={classNames(
          'grid w-fit cursor-pointer grid-cols-[min-content_min-content] items-center gap-x-2 whitespace-nowrap border-none p-1 font-normal hover:bg-gray-200 ',
          {
            'bg-400': selectedLog !== 'activity',
            'bg-white hover:bg-white': selectedLog === 'activity',
            'cursor-default select-text border-none bg-transparent p-0 hover:bg-transparent': !selectable,
          },
        )}
        on:click={selectActivityLog}
      >
        <ModelStatusIcon {showCompleteStatus} status={activityLogStatus} />
        Extract activity types
      </Button>
    </div>
    <div
      use:tooltip={{
        content: parameterLog?.error_message ?? parameterLogTooltipMessages[parameterLogStatus],
      }}
    >
      <Button
        variant="ghost"
        class={classNames(
          'grid w-fit cursor-pointer grid-cols-[min-content_min-content] items-center gap-x-2 whitespace-nowrap border-none p-1 font-normal hover:bg-gray-200 ',
          {
            'bg-400': selectedLog !== 'parameter',
            'bg-white hover:bg-white': selectedLog === 'parameter',
            'cursor-default select-text border-none bg-transparent p-0 hover:bg-transparent': !selectable,
          },
        )}
        on:click={selectParameterLog}
      >
        <ModelStatusIcon {showCompleteStatus} status={parameterLogStatus} />
        Extract resource types
      </Button>
    </div>
    <div
      use:tooltip={{
        content: resourceLog?.error_message ?? resourceLogTooltipMessages[resourceLogStatus],
      }}
    >
      <Button
        variant="ghost"
        class={classNames(
          'grid w-fit cursor-pointer grid-cols-[min-content_min-content] items-center gap-x-2 whitespace-nowrap border-none p-1 font-normal hover:bg-gray-200 ',
          {
            'bg-400': selectedLog !== 'resource',
            'bg-white hover:bg-white': selectedLog === 'resource',
            'cursor-default select-text border-none bg-transparent p-0 hover:bg-transparent': !selectable,
          },
        )}
        on:click={selectResourceLog}
      >
        <ModelStatusIcon {showCompleteStatus} status={resourceLogStatus} />
        Extract mission model parameters
      </Button>
    </div>
  </div>
{/if}
