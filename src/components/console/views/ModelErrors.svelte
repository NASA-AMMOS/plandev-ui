<svelte:options immutable={true} />

<script lang="ts">
  import type { ModelLog, ModelSlim } from '../../../types/model';
  import { getModelStatusRollup } from '../../../utilities/model';
  import ModelStatusRollup from '../../model/ModelStatusRollup.svelte';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import { ConsoleContextKey } from '../Console.svelte';

  export let model:
    | Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>
    | undefined;
  export let title: string;

  let selectedLog: 'activity' | 'parameter' | 'resource' | undefined = undefined;
  let selectedModelLog: ModelLog | null = null;

  $: {
    const { activityLog, activityLogStatus, parameterLog, parameterLogStatus, resourceLog, resourceLogStatus } =
      getModelStatusRollup(model);

    if (activityLogStatus === 'error') {
      selectedLog = 'activity';
      selectedModelLog = activityLog;
    } else if (parameterLogStatus === 'error') {
      selectedLog = 'parameter';
      selectedModelLog = parameterLog;
    } else if (resourceLogStatus === 'error') {
      selectedLog = 'resource';
      selectedModelLog = resourceLog;
    }
  }

  function onSelectCategory(event: CustomEvent<ModelLog | null>) {
    const { detail: value } = event;
    selectedModelLog = value;
  }
</script>

<TabPanel tabContextKey={ConsoleContextKey}>
  <div class="model-errors-container">
    <div class="console-header">
      <div class="console-title">{title}</div>
      <div class="model-statuses">
        <ModelStatusRollup {model} selectable {selectedLog} flow="horizontal" on:select={onSelectCategory} />
      </div>
    </div>
    <div class="errors">
      <div class="error">
        {#if selectedModelLog && !selectedModelLog.success}
          {#if selectedModelLog?.error_message}
            <div class="reason">
              {selectedModelLog?.error_message}
            </div>
          {/if}
          <div class="trace">
            <pre>{JSON.stringify(selectedModelLog?.error, undefined, 2)}</pre>
          </div>
        {:else}
          <div class="reason">Successful extraction</div>
        {/if}
      </div>
    </div>
  </div>
</TabPanel>

<style>
  .model-errors-container {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
    row-gap: 5px;
  }

  .console-header .console-title {
    color: var(--st-gray-60);
    font-size: 11px;
    font-weight: 700;
    line-height: 1rem;
    margin: 0.65rem 1rem;
    text-transform: uppercase;
  }

  .model-statuses {
    padding-left: 1rem;
  }

  .errors {
    overflow-y: auto;
  }

  .error {
    margin: 0 1rem 12px;
  }

  .trace pre {
    margin: 0;
    white-space: pre-wrap;
  }

  .reason,
  .trace {
    background-color: var(--st-primary-background-color);
    padding: 0.5rem;
  }
</style>
