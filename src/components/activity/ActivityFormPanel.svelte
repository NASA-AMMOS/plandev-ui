<svelte:options immutable={true} />

<script lang="ts">
  import LockIcon from '@nasa-jpl/stellar/icons/lock.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import UnlockIcon from '@nasa-jpl/stellar/icons/unlock.svg?component';
  import DirectiveIcon from '../../assets/timeline-directive.svg?component';
  import SpanIcon from '../../assets/timeline-span.svg?component';
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
    plan,
    planModelActivityTypes,
    planModelId,
    planReadOnly,
    setActivityEditingLocked,
  } from '../../stores/plan';
  import { selectedSpan, simulationDatasetId, spanUtilityMaps, spansMap } from '../../stores/simulation';
  import { tags } from '../../stores/tags';
  import type { ActivityDirective, ActivityDirectiveRevision } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { SpanId } from '../../types/simulation';
  import type { ViewGridSection } from '../../types/view';
  import { getSpanRootParent } from '../../utilities/activities';
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

  let directiveRootSpanId: number | null;
  let spanDirectiveId: number | null;
  let hasDeletePermission: boolean = false;
  let viewingActivityDirectiveChangelog: boolean = false;
  let highlightKeys: string[] = [];
  let previewRevision: ActivityDirectiveRevision | undefined;
  let selectedParameterName: string | null = null;

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

  $: if ($selectedActivityDirective && $spansMap) {
    directiveRootSpanId =
      $spansMap[$spanUtilityMaps.directiveIdToSpanIdMap[$selectedActivityDirective.id]]?.span_id ?? null;
  } else {
    directiveRootSpanId = null;
  }

  $: if ($selectedSpan && $spansMap) {
    const rootSpan = getSpanRootParent($spansMap, $selectedSpan.span_id);
    if (rootSpan) {
      spanDirectiveId = $spanUtilityMaps.spanIdToDirectiveIdMap[rootSpan.span_id] ?? null;
    } else {
      spanDirectiveId = null;
    }
  } else {
    spanDirectiveId = null;
  }

  function onSelectSpan(event: CustomEvent<SpanId | null>) {
    const { detail: spanId } = event;
    selectActivity(null, spanId);
  }

  function onJumpToDirectiveParameter(event: CustomEvent<{ directiveId: number | null; parameterName: string }>) {
    const {
      detail: { directiveId, parameterName },
    } = event;
    selectActivity(directiveId, null);
    selectedParameterName = parameterName;
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
    const activityType = $planModelActivityTypes.find(type => type.name === $selectedActivityDirective?.type);
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
      <div class="activity-header-buttons">
        {#if $selectedActivityDirective}
          {#if directiveRootSpanId !== null}
            <button
              class="st-button icon activity-header-button"
              on:click|stopPropagation={() => selectActivity(null, directiveRootSpanId)}
              use:tooltip={{ content: 'Jump to Simulated Activity', placement: 'top' }}
            >
              <SpanIcon />
            </button>
          {/if}

          <button
            class="st-button icon activity-header-button"
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
            class="st-button icon activity-header-button"
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
        {#if $selectedSpan && spanDirectiveId !== null}
          <button
            class="st-button icon activity-header-button"
            on:click|stopPropagation={() => {
              selectActivity(spanDirectiveId, null);
            }}
            use:tooltip={{ content: 'Jump to Directive', placement: 'top' }}
          >
            <DirectiveIcon />
          </button>
        {/if}
      </div>
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedActivityDirective && $plan !== null && viewingActivityDirectiveChangelog}
      <ActivityDirectiveChangelog
        activityDirective={$selectedActivityDirective}
        activityDirectivesMap={$activityDirectivesMap || {}}
        activityTypes={$planModelActivityTypes}
        planStartTimeYmd={$plan.start_time}
        on:closeChangelog={onToggleViewChangelog}
        on:previewRevision={onPreviewRevision}
        {user}
      />
    {:else if $selectedActivityDirective && $plan !== null}
      <ActivityDirectiveForm
        activityDirectivesMap={$activityDirectivesMap || {}}
        activityDirective={$selectedActivityDirective}
        activityMetadataDefinitions={$activityMetadataDefinitions}
        activityTypes={$planModelActivityTypes}
        tags={$tags}
        editable={!$activityEditingLocked && !previewRevision}
        modelId={$planModelId}
        planStartTimeYmd={$plan.start_time}
        revision={previewRevision}
        on:viewChangelog={onToggleViewChangelog}
        on:closeRevisionPreview={onCloseRevisionPreview}
        on:didFlash={() => (selectedParameterName = null)}
        {selectedParameterName}
        {highlightKeys}
        {user}
      />
    {:else if $selectedSpan && $plan !== null}
      <ActivitySpanForm
        activityTypes={$planModelActivityTypes}
        filteredExpansionSequences={$filteredExpansionSequences}
        simulationDatasetId={$simulationDatasetId}
        span={$selectedSpan}
        spansMap={$spansMap}
        spanUtilityMaps={$spanUtilityMaps}
        {user}
        on:select={onSelectSpan}
        on:jumpToDirectiveParameter={onJumpToDirectiveParameter}
      />
    {:else}
      <div class="st-typography-label p-2">No Activity Selected</div>
    {/if}
  </svelte:fragment>
</Panel>

<style>
  .activity-header-buttons {
    display: flex;
    gap: 8px;
  }
  .activity-header-button.icon {
    border: 1px solid var(--st-gray-30);
  }
</style>
