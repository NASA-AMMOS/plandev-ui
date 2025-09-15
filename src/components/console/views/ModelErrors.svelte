<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import type { ModelLog, ModelSlim } from '../../../types/model';
  import { getModelStatusRollup } from '../../../utilities/model';
  import ModelStatusRollup from '../../model/ModelStatusRollup.svelte';

  export let model:
    | Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>
    | undefined;
  export let title: string;

  let selectedLog: 'activity' | 'parameter' | 'resource' | undefined = undefined;
  let selectedModelLog: ModelLog | null = null;
  let hasErrors = false;

  $: {
    const { activityLog, activityLogStatus, parameterLog, parameterLogStatus, resourceLog, resourceLogStatus } =
      getModelStatusRollup(model);

    hasErrors = activityLogStatus === 'error' || parameterLogStatus === 'error' || resourceLogStatus === 'error';

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

<Tabs.Content value="model" class="mt-0 h-full w-full">
  <div class="grid h-full grid-rows-[min-content_auto] gap-y-[5px] p-3">
    <div class="flex flex-col">
      <div class="my-2.5 text-[11px] font-bold uppercase leading-4 text-[var(--st-gray-60)]">{title}</div>
      <ModelStatusRollup {model} selectable {selectedLog} flow="horizontal" on:select={onSelectCategory} />
    </div>
    {#if hasErrors}
      <div class="overflow-y-auto text-xs">
        <div class="mx-4 mb-3">
          {#if selectedModelLog && !selectedModelLog.success}
            {#if selectedModelLog?.error_message}
              <div class="bg-[var(--st-primary-background-color)] p-2">
                {selectedModelLog?.error_message}
              </div>
            {/if}
            <div class="bg-[var(--st-primary-background-color)] p-2">
              <pre class="m-0 whitespace-pre-wrap">{JSON.stringify(selectedModelLog?.error, undefined, 2)}</pre>
            </div>
          {:else}
            <div class="bg-[var(--st-primary-background-color)] p-2">Successful extraction</div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex h-full">
        <div
          class="flex flex-1 items-center justify-center rounded border border-dashed border-muted bg-background/50 p-4"
        >
          <div class="text-center">
            <span class="select-none text-xs font-medium text-muted-foreground">No reported errors</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Tabs.Content>
