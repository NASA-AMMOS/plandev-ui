<svelte:options immutable={true} />

<script lang="ts">
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import {
    activityDirectivesMap,
    activityMetadataDefinitions,
    allActivityDirectiveTags,
    selectActivity,
    selectedActivityDirective,
  } from '../../stores/activities';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import { activityTypes, modelId, plan } from '../../stores/plan';
  import { selectedSpan, simulationDatasetId, spansMap, spanUtilityMaps } from '../../stores/simulation';
  import type { SpanId } from '../../types/simulation';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivityDirectiveForm from './ActivityDirectiveForm.svelte';
  import ActivitySpanForm from './ActivitySpanForm.svelte';

  export let gridSection: ViewGridSection;

  function onSelectSpan(event: CustomEvent<SpanId>) {
    const { detail: spanId } = event;
    selectActivity(null, spanId);
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Selected Activity" />
    {#if $selectedActivityDirective}
      <button
        class="st-button icon activity-header-delete"
        on:click|stopPropagation={() =>
          effects.deleteActivityDirective($selectedActivityDirective.plan_id, $selectedActivityDirective.id)}
        use:tooltip={{ content: 'Delete Activity', placement: 'top' }}
      >
        <TrashIcon />
      </button>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivityDirective}
      <ActivityDirectiveForm
        activityDirectivesMap={$activityDirectivesMap}
        activityDirective={$selectedActivityDirective}
        activityMetadataDefinitions={$activityMetadataDefinitions}
        activityTypes={$activityTypes}
        allActivityDirectiveTags={$allActivityDirectiveTags}
        modelId={$modelId}
        planStartTimeYmd={$plan.start_time}
      />
    {:else if $selectedSpan}
      <ActivitySpanForm
        activityTypes={$activityTypes}
        filteredExpansionSequences={$filteredExpansionSequences}
        modelId={$modelId}
        planStartTimeYmd={$plan.start_time}
        simulationDatasetId={$simulationDatasetId}
        span={$selectedSpan}
        spansMap={$spansMap}
        spanUtilityMaps={$spanUtilityMaps}
        on:select={onSelectSpan}
      />
    {:else}
      <div class="p-2 st-typography-label">No Activity Selected</div>
    {/if}
  </svelte:fragment>
</Panel>

<style>
  .activity-header-delete {
    border: 1px solid var(--st-gray-30);
  }
</style>
