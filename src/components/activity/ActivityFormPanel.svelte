<svelte:options immutable={true} />

<script lang="ts">
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import {
    activitiesMap,
    activityMetadataDefinitions,
    allActivityTags,
    selectedActivity,
    selectedActivityId,
  } from '../../stores/activities';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import { activityTypes, modelId } from '../../stores/plan';
  import { simulationDatasetId } from '../../stores/simulation';
  import type { ActivityUniqueId } from '../../types/activity';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivityForm from './ActivityForm.svelte';

  export let gridSection: ViewGridSection;

  // Activity vars.
  let id: number | null = null;
  let parentUniqueId: ActivityUniqueId | null = null;
  let plan_id: number | null = null;

  // Other vars.
  let isChild: boolean;

  $: if ($selectedActivity) {
    id = $selectedActivity.id;
    parentUniqueId = $selectedActivity.parentUniqueId;
    plan_id = $selectedActivity.plan_id;
  } else {
    id = null;
    parentUniqueId = null;
    plan_id = null;
  }

  $: isChild = parentUniqueId !== null;

  function selectActivity(event: CustomEvent<ActivityUniqueId>) {
    const { detail: newSelectedActivityId } = event;
    $selectedActivityId = newSelectedActivityId;
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Selected Activity" />
    <button
      class="st-button icon activity-header-delete"
      disabled={isChild || !$selectedActivity}
      on:click|stopPropagation={() => effects.deleteActivityDirective(plan_id, id)}
      use:tooltip={{ content: 'Delete Activity', placement: 'top' }}
    >
      <TrashIcon />
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivity}
      <ActivityForm
        activitiesMap={$activitiesMap}
        activity={$selectedActivity}
        activityMetadataDefinitions={$activityMetadataDefinitions}
        activityTypes={$activityTypes}
        allActivityTags={$allActivityTags}
        filteredExpansionSequences={$filteredExpansionSequences}
        modelId={$modelId}
        simulationDatasetId={$simulationDatasetId}
        on:selectActivity={selectActivity}
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
