<svelte:options immutable={true} />

<script lang="ts">
  import LockIcon from '@nasa-jpl/stellar/icons/lock.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import UnlockIcon from '@nasa-jpl/stellar/icons/unlock.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import {
    activityDirectivesMap,
    activityMetadataDefinitions,
    selectActivity,
    selectedActivityDirective,
    selectedActivityDirectiveId,
  } from '../../stores/activities';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import {
    activityEditingLocked,
    activityTypes,
    modelId,
    plan,
    planReadOnly,
    setActivityEditingLocked,
  } from '../../stores/plan';
  import { selectedSpan, simulationDatasetId, spanUtilityMaps, spansMap } from '../../stores/simulation';
  import { tags } from '../../stores/tags';
  import type { ActivityDirective, ActivityDirectiveRevision } from '../../types/activity';
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
  import ActivityDirectiveChangelog from './ActivityDirectiveChangelog.svelte';
  import ActivityDirectiveForm from './ActivityDirectiveForm.svelte';
  import ActivitySpanForm from './ActivitySpanForm.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let hasDeletePermission: boolean = false;
  let viewingActivityDirectiveChangelog: boolean = false;
  let highlightKeys: string[] = [];
  let previewRevision: ActivityDirectiveRevision | undefined;

  $: deletePermissionError = $planReadOnly
    ? PlanStatusMessages.READ_ONLY
    : 'You do not have permission to delete this activity';
  $: if (user !== null && $plan !== null && $selectedActivityDirective !== null) {
    hasDeletePermission =
      featurePermissions.activityDirective.canDelete(user, $plan, $selectedActivityDirective) && !$planReadOnly;
  }

  // Auto close the changelog and clear revision preview state whenever the selected activity changes
  $: if ($selectedActivityDirectiveId !== null) {
    viewingActivityDirectiveChangelog = false;
    highlightKeys = [];
    previewRevision = undefined;
  }

  function onSelectSpan(event: CustomEvent<SpanId>) {
    const { detail: spanId } = event;
    selectActivity(null, spanId);
  }

  function onToggleViewChangelog() {
    highlightKeys = [];
    previewRevision = undefined;
    viewingActivityDirectiveChangelog = !viewingActivityDirectiveChangelog;
  }

  function onPreviewRevision(event: CustomEvent<ActivityDirectiveRevision>) {
    if (!$selectedActivityDirective) {
      return;
    }

    const revision: ActivityDirectiveRevision = event.detail;
    const activityType = $activityTypes.find(type => type.name === $selectedActivityDirective?.type);
    const changedKeys: string[] = [];

    const potentialChanges: Array<keyof ActivityDirective & keyof ActivityDirectiveRevision> = [
      'anchor_id',
      'anchored_to_start',
      'start_offset',
    ];
    potentialChanges.forEach(key => {
      if ($selectedActivityDirective && $selectedActivityDirective[key] !== revision[key]) {
        changedKeys.push(key);
      }
    });

    if (activityType) {
      Object.keys(activityType.parameters).forEach(key => {
        if ($selectedActivityDirective?.arguments[key] !== revision.arguments[key]) {
          changedKeys.push(key);
        }
      });
    }

    highlightKeys = changedKeys;
    previewRevision = revision;
    viewingActivityDirectiveChangelog = false;
  }

  function onCloseRevisionPreview() {
    highlightKeys = [];
    previewRevision = undefined;
    viewingActivityDirectiveChangelog = false;
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
            if ($selectedActivityDirective !== null && $plan !== null && hasDeletePermission) {
              effects.deleteActivityDirective($selectedActivityDirective.id, $plan, user);
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
    {#if $selectedActivityDirective && $plan !== null && viewingActivityDirectiveChangelog}
      <ActivityDirectiveChangelog
        activityDirective={$selectedActivityDirective}
        activityDirectivesMap={$activityDirectivesMap}
        activityTypes={$activityTypes}
        modelId={$modelId}
        planStartTimeYmd={$plan.start_time}
        on:closeChangelog={onToggleViewChangelog}
        on:previewRevision={onPreviewRevision}
        {user}
      />
    {:else if $selectedActivityDirective && $plan !== null}
      <ActivityDirectiveForm
        activityDirectivesMap={$activityDirectivesMap}
        activityDirective={$selectedActivityDirective}
        activityMetadataDefinitions={$activityMetadataDefinitions}
        activityTypes={$activityTypes}
        tags={$tags}
        editable={!$activityEditingLocked && !previewRevision}
        modelId={$modelId}
        planStartTimeYmd={$plan.start_time}
        revision={previewRevision}
        on:viewChangelog={onToggleViewChangelog}
        on:closeRevisionPreview={onCloseRevisionPreview}
        {highlightKeys}
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
