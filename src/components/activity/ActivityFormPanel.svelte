<svelte:options immutable={true} />

<script lang="ts">
  import LockIcon from '@nasa-jpl/stellar/icons/lock.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import UnlockIcon from '@nasa-jpl/stellar/icons/unlock.svg?component';
  import {
    activityDirectivesMap,
    activityMetadataDefinitions,
    selectActivity,
    selectedActivityDirective,
  } from '../../stores/activities';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import { activityEditingLocked, activityTypes, modelId, plan, setActivityEditingLocked } from '../../stores/plan';
  import { selectedSpan, simulationDatasetId, spanUtilityMaps, spansMap } from '../../stores/simulation';
  import { tags } from '../../stores/tags';
  import type { User } from '../../types/app';
  import type { SpanId } from '../../types/simulation';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import ActivityDirectiveForm from './ActivityDirectiveForm.svelte';
  import ActivitySpanForm from './ActivitySpanForm.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  const deletePermissionError = 'You do not have permission to delete this activity';

  let hasDeletePermission: boolean = false;

  $: if (user !== null && $plan !== null && $selectedActivityDirective !== null) {
    hasDeletePermission = featurePermissions.activityDirective.canDelete(user, $plan, $selectedActivityDirective);
  }

  function onSelectSpan(event: CustomEvent<SpanId>) {
    const { detail: spanId } = event;
    selectActivity(null, spanId);
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Selected Activity" />
    <PanelHeaderActions>
      {#if $selectedActivityDirective}
        <button
          class="st-button icon activity-header-lock"
          on:click={() => {
            setActivityEditingLocked(!$activityEditingLocked);
          }}
          use:tooltip={{
            content: `${$activityEditingLocked ? 'Unlock' : 'Lock'} activity editing`,
            placement: 'bottom',
          }}
        >
          {#if $activityEditingLocked}
            <LockIcon />
          {:else}
            <UnlockIcon />
          {/if}
        </button>

        <button
          class="st-button icon activity-header-delete"
          use:permissionHandler={{
            hasPermission: hasDeletePermission,
            permissionError: deletePermissionError,
          }}
          on:click|stopPropagation={() => {
            if ($selectedActivityDirective !== null && hasDeletePermission) {
              effects.deleteActivityDirective($selectedActivityDirective.plan_id, $selectedActivityDirective.id, user);
            }
          }}
          use:tooltip={{ content: 'Delete Activity', disabled: !hasDeletePermission, placement: 'top' }}
        >
          <TrashIcon />
        </button>
      {/if}
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivityDirective && $plan !== null}
      <ActivityDirectiveForm
        activityDirectivesMap={$activityDirectivesMap}
        activityDirective={$selectedActivityDirective}
        activityMetadataDefinitions={$activityMetadataDefinitions}
        activityTypes={$activityTypes}
        tags={$tags}
        editable={!$activityEditingLocked}
        modelId={$modelId}
        planStartTimeYmd={$plan.start_time}
        {user}
      />
    {:else if $selectedSpan && $plan !== null}
      <ActivitySpanForm
        activityTypes={$activityTypes}
        filteredExpansionSequences={$filteredExpansionSequences}
        modelId={$modelId}
        planStartTimeYmd={$plan.start_time}
        simulationDatasetId={$simulationDatasetId}
        span={$selectedSpan}
        spansMap={$spansMap}
        spanUtilityMaps={$spanUtilityMaps}
        {user}
        on:select={onSelectSpan}
      />
    {:else}
      <div class="p-2 st-typography-label">No Activity Selected</div>
    {/if}
  </svelte:fragment>
</Panel>

<style>
  .activity-header-delete,
  .activity-header-lock {
    border: 1px solid var(--st-gray-30);
  }

  .activity-header-delete {
    margin-left: 0.5rem;
  }
</style>
