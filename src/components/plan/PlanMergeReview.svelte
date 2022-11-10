<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import PlanWithUpArrow from '@nasa-jpl/stellar/icons/plan_with_up_arrow.svg?component';
  import { activityMetadataDefinitions } from '../../stores/activities';
  import { activityTypesMap } from '../../stores/plan';
  import { gqlSubscribable } from '../../stores/subscribable';
  import { deriveActivityFromMergeActivityDirective } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { changedKeys, getTarget } from '../../utilities/generic';
  import gql from '../../utilities/gql';
  import { tooltip } from '../../utilities/tooltip';
  import ActivityForm from '../activity/ActivityForm.svelte';
  import Nav from '../app/Nav.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import PlanMergeReviewUserInfo from './PlanMergeReviewUserInfo.svelte';

  export let initialConflictingActivities: PlanMergeConflictingActivity[] = [];
  export let initialMergeRequest: PlanMergeRequestSchema;
  export let initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [];
  export let initialPlan: Plan;

  const conflictingMergeActivities = gqlSubscribable<PlanMergeConflictingActivity[]>(
    gql.SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES,
    { merge_request_id: initialMergeRequest.id },
    initialConflictingActivities,
  );

  let additions: PlanMergeNonConflictingActivity[] = [];
  let computedSourceActivity: Activity | null;
  let computedTargetActivity: Activity | null;
  let conflicts: PlanMergeConflictingActivity[] = [];
  let deletions: PlanMergeNonConflictingActivity[] = [];
  let keysWithChanges: string[] = [];
  let modifications: PlanMergeNonConflictingActivity[] = [];
  let selectedActivityId: number | null;
  let selectedConflictingActivity: PlanMergeConflictingActivity | null;
  let selectedConflictingActivityResolution: PlanMergeResolution | null;
  let selectedMergeType: 'conflict' | 'add' | 'modify' | 'delete' | 'none' | null;
  let selectedNonConflictingActivity: PlanMergeNonConflictingActivity | null;
  let unresolvedConflictsCount: number = 0;

  let mergeComparisonSourceDiv: HTMLElement | null = null;
  let mergeComparisonTargetDiv: HTMLElement | null = null;
  let mergeComparisonScrollOrigin: 'source' | 'target' | null = null;

  $: if (initialNonConflictingActivities) {
    // Updated selectedNonConflictingActivity with the refeshed version if needed
    if (selectedNonConflictingActivity) {
      selectedNonConflictingActivity = initialNonConflictingActivities.find(
        merge => merge.activity_id === selectedNonConflictingActivity.activity_id,
      );
    }

    // Compute additions, deletions, and modifications
    additions = [];
    deletions = [];
    modifications = [];
    initialNonConflictingActivities
      .slice()
      .sort((a, b) => {
        return (a.source?.name || a.target?.name || '').localeCompare(b.source?.name || b.target?.name || '');
      })
      .forEach(activity => {
        if (activity.change_type === 'add') {
          additions.push(activity);
        } else if (activity.change_type === 'delete') {
          deletions.push(activity);
        } else if (activity.change_type === 'modify') {
          modifications.push(activity);
        }
      });
  }

  $: if ($conflictingMergeActivities) {
    // Sort conflicts by name
    conflicts = $conflictingMergeActivities.slice().sort((a, b) => {
      return a.merge_base.name.localeCompare(b.merge_base.name);
    });

    // Updated selectedConflictingActivity with the refeshed version if needed
    if (selectedConflictingActivity) {
      selectedConflictingActivity = $conflictingMergeActivities.find(
        activity => activity.activity_id === selectedConflictingActivity.activity_id,
      );
      if (selectedConflictingActivity) {
        selectedConflictingActivityResolution = selectedConflictingActivity.resolution;
      } else {
        selectedConflictingActivityResolution = null;
      }
    }

    // Reset comparison scroll positions
    resetMergeReviewComparisonScrollTops();
  } else {
    conflicts = [];
  }

  $: if (conflicts) {
    unresolvedConflictsCount = conflicts.filter(conflict => conflict.resolution === 'none').length;
  }

  $: if (selectedNonConflictingActivity) {
    selectedConflictingActivityResolution = null;
    selectedActivityId = selectedNonConflictingActivity.activity_id;
    selectedMergeType = selectedNonConflictingActivity.change_type;
    if (selectedNonConflictingActivity.change_type === 'delete') {
      computedTargetActivity = deriveActivityFromMergeActivityDirective(
        selectedNonConflictingActivity.target,
        initialPlan,
      );
      computedSourceActivity = null;
    } else if (selectedNonConflictingActivity.change_type === 'add') {
      computedSourceActivity = deriveActivityFromMergeActivityDirective(
        selectedNonConflictingActivity.source,
        initialPlan,
      );
      computedTargetActivity = null;
    } else {
      computedSourceActivity = deriveActivityFromMergeActivityDirective(
        selectedNonConflictingActivity.source,
        initialPlan,
      );
      computedTargetActivity = deriveActivityFromMergeActivityDirective(
        selectedNonConflictingActivity.target,
        initialPlan,
      );
    }

    // Reset comparison scroll positions
    resetMergeReviewComparisonScrollTops();
  }

  $: if (selectedConflictingActivity) {
    selectedActivityId = selectedConflictingActivity.activity_id;
    selectedMergeType = 'conflict';
    // Derive source and target activities
    if (selectedConflictingActivity.source) {
      computedSourceActivity = deriveActivityFromMergeActivityDirective(
        selectedConflictingActivity.source,
        initialPlan,
      );
    } else {
      computedSourceActivity = null;
    }
    if (selectedConflictingActivity.target) {
      computedTargetActivity = deriveActivityFromMergeActivityDirective(
        selectedConflictingActivity.target,
        initialPlan,
      );
    } else {
      computedTargetActivity = null;
    }
  }

  // If this is a PlanMergeConflictingActivity where both source and target
  // have modifications or it is a modified PlanMergeNonConflictingActivity we will compute the changed keys
  $: if (
    (selectedConflictingActivity &&
      selectedConflictingActivity.change_type_target === 'modify' &&
      selectedConflictingActivity.change_type_source === 'modify') ||
    (selectedNonConflictingActivity && selectedMergeType === 'modify')
  ) {
    keysWithChanges = changedKeys(computedSourceActivity, computedTargetActivity, [
      'arguments',
      'metadata',
      'created_at',
      'id',
      'snapshot_id',
      'last_modified_arguments_at',
      'last_modified_at',
      'source_scheduling_goal_id',
      'type',
    ])
      .concat(changedKeys(computedSourceActivity.arguments, computedTargetActivity.arguments))
      .concat(changedKeys(computedSourceActivity.metadata, computedTargetActivity.metadata));
  } else {
    keysWithChanges = [];
  }

  async function onApproveChanges() {
    const success = await effects.planMergeCommit(initialMergeRequest.id);
    if (success) {
      goto(`${base}/plans/${initialPlan.id}`);
    }
  }

  async function onDenyChanges() {
    const success = await effects.planMergeDeny(initialMergeRequest.id);
    if (success) {
      goto(`${base}/plans/${initialPlan.id}`);
    }
  }

  async function onCancel() {
    const success = await effects.planMergeCancel(initialMergeRequest.id);
    if (success) {
      goto(`${base}/plans/${initialPlan.id}`);
    }
  }

  function onResolveAll(e: Event) {
    const { value } = getTarget(e);
    const resolution = value as PlanMergeResolution;
    effects.planMergeResolveAllConflicts(initialMergeRequest.id, resolution);

    // Set resolutions for all conflicts
    if ($conflictingMergeActivities && $conflictingMergeActivities.length) {
      const conflictActivityIdMap = conflicts.reduce((map, conflict) => {
        map[conflict.activity_id] = true;
        return map;
      }, {});

      // Optimistically update our store with the new resolution values
      conflictingMergeActivities.updateValue((activities: PlanMergeConflictingActivity[]) => {
        return activities.map(activity => {
          if (conflictActivityIdMap[activity.activity_id]) {
            activity.resolution = resolution;
          }
          return activity;
        });
      });
    }

    // Set select value back to Resolve All default
    this.value = 'resolve_all';
  }

  async function onMergeReviewComparisonScroll(event: Event, origin: 'source' | 'target') {
    if (mergeComparisonScrollOrigin === origin) {
      const target = event.target as HTMLDivElement;
      const scrollTop = target.scrollTop;
      if (origin === 'source') {
        mergeComparisonTargetDiv.scrollTop = scrollTop;
      } else {
        mergeComparisonSourceDiv.scrollTop = scrollTop;
      }
    }
    mergeComparisonScrollOrigin = origin;
  }

  function resetMergeReviewComparisonScrollTops() {
    if (mergeComparisonTargetDiv && mergeComparisonSourceDiv) {
      mergeComparisonTargetDiv.scrollTop = 0;
      mergeComparisonSourceDiv.scrollTop = 0;
    }
  }

  async function resolveConflict(activityId: number, resolution: PlanMergeResolution) {
    await effects.planMergeResolveConflict(initialMergeRequest.id, activityId, resolution);

    conflictingMergeActivities.updateValue((activities: PlanMergeConflictingActivity[]) => {
      return activities.map(activity => {
        if (activity.activity_id === activityId) {
          activity.resolution = resolution;
        }
        return activity;
      });
    });
  }
</script>

<div class="flex">
  <Nav>
    <span class="" slot="title">Merge Review</span>
  </Nav>
  <div class="merge-review-content">
    <CssGrid columns="0.5fr 3px 1fr 3px 1fr 3px 1fr" class="merge-review-content-grid">
      <div class="merge-review-metadata">
        <PlanMergeReviewUserInfo
          label="Requested Merge"
          title="Created By"
          username={initialMergeRequest.requester_username}
        />
        <PlanMergeReviewUserInfo
          label="Plan Owner"
          title="Reviewed By"
          username={initialMergeRequest.reviewer_username}
        />
        <div class="merge-review-branch-metadata">
          <div class="st-typography-medium">Current Branch (Target)</div>
          <div class="merge-review-branch-metadata-content st-typography-body">
            <MergeIcon />
            {initialMergeRequest.plan_receiving_changes.name}
          </div>
        </div>
        <div class="merge-review-branch-metadata">
          <div class="st-typography-medium">Source Branch</div>
          <div class="merge-review-branch-metadata-content st-typography-body">
            <PlanWithUpArrow />
            {initialMergeRequest.plan_snapshot_supplying_changes.name}
          </div>
        </div>
        <div class="merge-review-stats">
          <div>
            <div class="merge-review-stat">
              <div class="st-typography-medium">Adds</div>
              <div class="st-typography-body">{additions.length}</div>
            </div>
            <div class="merge-review-stat">
              <div class="st-typography-medium">Modifies</div>
              <div class="st-typography-body">{modifications.length}</div>
            </div>
          </div>
          <div>
            <div class="merge-review-stat">
              <div class="st-typography-medium">Removes</div>
              <div class="st-typography-body">{deletions.length}</div>
            </div>
            <div class="merge-review-stat">
              <div class="st-typography-medium">Conflicts</div>
              <div class="st-typography-body">{conflicts.length}</div>
            </div>
          </div>
        </div>
      </div>
      <CssGridGutter track={1} type="column" />
      <div class="merge-review-changes">
        <div class="merge-review-subheader">
          <span class="st-typography-medium">
            Conflicts
            {#if unresolvedConflictsCount > 0}
              <span class="merge-review-conflicts-badge st-badge">{unresolvedConflictsCount}</span>
            {:else}
              <span class="merge-review-no-conflicts-badge"><CheckIcon />None</span>
            {/if}
          </span>
          <select class="st-select" value="resolve_all" on:change={onResolveAll}>
            <option value="resolve_all">Resolve All</option>
            <option value="source">Resolve All Using Source</option>
            <option value="target">Resolve All Using Target</option>
            <option value="none">Unresolve All</option>
          </select>
        </div>
        <div class="merge-review-changes-content">
          {#if conflicts.length}
            <fieldset>
              <details open style:cursor="pointer">
                <summary class="st-typography-bold">Conflicts</summary>
                <div class="details-body">
                  {#each conflicts as merge}
                    <button
                      on:click={() => {
                        selectedConflictingActivity = merge;
                        selectedNonConflictingActivity = null;
                      }}
                      class="st-button tertiary merge-review-activity-item"
                      class:active={selectedActivityId === merge.activity_id}
                    >
                      <!--
                        TODO use the merge base activity name here instead? Even if it's renamed?
                        Though I suppose we could be smart and choose the name of the chosen resolution?
                        E.g. if we resolve a conflict using the source activity we display the source activity name
                      -->
                      {merge.merge_base.name}
                      {#if merge.resolution !== 'none'}
                        <span class="merge-review-activity-item-resolution st-typography-medium st-chip">
                          {merge.resolution}
                        </span>
                      {/if}
                    </button>
                  {/each}
                </div>
              </details>
            </fieldset>
          {/if}
          {#if additions.length}
            <fieldset>
              <details open style:cursor="pointer">
                <summary class="st-typography-bold">New Activities</summary>
                <div class="details-body">
                  {#each additions as merge}
                    <button
                      on:click={() => {
                        selectedNonConflictingActivity = merge;
                        selectedConflictingActivity = null;
                      }}
                      class="st-button tertiary merge-review-activity-item"
                      class:active={selectedActivityId === merge.activity_id}>{merge.source.name}</button
                    >
                  {/each}
                </div>
              </details>
            </fieldset>
          {/if}
          {#if modifications.length}
            <fieldset>
              <details open style:cursor="pointer">
                <summary class="st-typography-bold">Modified Activities</summary>
                <div class="details-body">
                  {#each modifications as merge}
                    <button
                      on:click={() => {
                        selectedNonConflictingActivity = merge;
                        selectedConflictingActivity = null;
                      }}
                      class="st-button tertiary merge-review-activity-item"
                      class:active={selectedActivityId === merge.activity_id}>{merge.source.name}</button
                    >
                  {/each}
                </div>
              </details>
            </fieldset>
          {/if}
          {#if deletions.length}
            <fieldset>
              <details open style:cursor="pointer">
                <summary class="st-typography-bold">Removed Activities</summary>
                <div class="details-body">
                  {#each deletions as merge}
                    <button
                      on:click={() => {
                        selectedNonConflictingActivity = merge;
                        selectedConflictingActivity = null;
                      }}
                      class="st-button tertiary merge-review-activity-item"
                      class:active={selectedActivityId === merge.activity_id}
                    >
                      {merge.target.name}
                    </button>
                  {/each}
                </div>
              </details>
            </fieldset>
          {/if}
        </div>
      </div>
      <CssGridGutter track={3} type="column" />
      <div class="merge-review-comparison-target">
        <div class="merge-review-subheader">
          <span style="gap: 8px">
            <PlanWithUpArrow />
            <span class="st-typography-medium">{initialMergeRequest.plan_snapshot_supplying_changes.name}</span>
          </span>
          <span class="st-chip st-typography-medium">Source</span>
        </div>
        {#if selectedConflictingActivity}
          <div class="merge-review-button-container">
            <button
              class="st-button secondary w-100"
              class:selected={selectedConflictingActivityResolution === 'source'}
              on:click={() => {
                const activityId =
                  selectedConflictingActivity.change_type_source === 'delete'
                    ? selectedConflictingActivity.merge_base.id
                    : selectedConflictingActivity.source.id;
                const resolution = selectedConflictingActivity?.resolution === 'source' ? 'none' : 'source';
                resolveConflict(activityId, resolution);
              }}
            >
              {#if selectedConflictingActivity?.resolution === 'source'}
                <span>
                  <CheckIcon />
                </span>
              {/if}
              Keep Source Activity
            </button>
          </div>
        {/if}
        <div
          bind:this={mergeComparisonSourceDiv}
          class="merge-review-comparison-body"
          class:selected={selectedConflictingActivityResolution === 'source'}
          on:scroll={event => onMergeReviewComparisonScroll(event, 'source')}
        >
          {#if selectedConflictingActivity || selectedNonConflictingActivity}
            {#if selectedMergeType === 'add' || selectedMergeType === 'modify' || (selectedMergeType === 'conflict' && selectedConflictingActivity.change_type_source !== 'delete')}
              <ActivityForm
                activity={computedSourceActivity}
                activityMetadataDefinitions={$activityMetadataDefinitions}
                activityTypesMap={$activityTypesMap}
                editable={false}
                highlightKeys={keysWithChanges}
                modelId={initialPlan.model_id}
                showActivityName
                showDecomposition={false}
                showHeader={false}
                showSequencing={false}
              />
            {:else if (selectedMergeType === 'delete' && !computedSourceActivity) || (selectedMergeType === 'conflict' && selectedConflictingActivity.change_type_source === 'delete')}
              <div class="st-typography-label merge-review-comparison-empty-state">Activity Deleted</div>
            {:else}
              <div class="st-typography-label merge-review-comparison-empty-state">No Target Activity</div>
            {/if}
          {:else}
            <div class="st-typography-label merge-review-comparison-empty-state">No Activity Selected</div>
          {/if}
        </div>
      </div>
      <CssGridGutter track={5} type="column" />
      <div class="merge-review-comparison-request">
        <div class="merge-review-subheader">
          <span style="gap: 8px">
            <MergeIcon />
            <span class="st-typography-medium">{initialMergeRequest.plan_receiving_changes.name}</span>
          </span>
          <span class="st-chip st-typography-medium">Current Branch (Target)</span>
        </div>
        {#if selectedConflictingActivity}
          <div class="merge-review-button-container">
            <button
              class="st-button secondary w-100"
              class:selected={selectedConflictingActivityResolution === 'target'}
              on:click={() => {
                const activityId =
                  selectedConflictingActivity.change_type_target === 'delete'
                    ? selectedConflictingActivity.merge_base.id
                    : selectedConflictingActivity.target.id;
                const resolution = selectedConflictingActivity?.resolution === 'target' ? 'none' : 'target';
                resolveConflict(activityId, resolution);
              }}
            >
              {#if selectedConflictingActivity?.resolution === 'target'}
                <span>
                  <CheckIcon />
                </span>
              {/if}
              Keep Target Activity
            </button>
          </div>
        {/if}
        <div
          bind:this={mergeComparisonTargetDiv}
          class="merge-review-comparison-body"
          class:selected={selectedConflictingActivityResolution === 'target'}
          on:scroll={event => onMergeReviewComparisonScroll(event, 'target')}
        >
          {#if selectedConflictingActivity || selectedNonConflictingActivity}
            {#if selectedMergeType === 'modify' || (selectedMergeType === 'delete' && !computedSourceActivity) || (selectedMergeType === 'conflict' && selectedConflictingActivity.change_type_target !== 'delete')}
              <ActivityForm
                activity={computedTargetActivity}
                activityMetadataDefinitions={$activityMetadataDefinitions}
                activityTypesMap={$activityTypesMap}
                editable={false}
                highlightKeys={!!selectedConflictingActivity && keysWithChanges}
                modelId={initialPlan.model_id}
                showActivityName
                showDecomposition={false}
                showHeader={false}
                showSequencing={false}
              />
            {:else if (selectedMergeType === 'delete' && !computedTargetActivity) || (selectedMergeType === 'conflict' && selectedConflictingActivity.change_type_target === 'delete')}
              <div class="st-typography-label merge-review-comparison-empty-state">Activity Deleted</div>
            {:else}
              <div class="st-typography-label merge-review-comparison-empty-state">No Target Activity</div>
            {/if}
          {:else}
            <div class="st-typography-label merge-review-comparison-empty-state">No Activity Selected</div>
          {/if}
        </div>
      </div>
    </CssGrid>
  </div>
  <div class="merge-review-bottom-actions">
    <button class="st-button secondary" on:click={onCancel}>Cancel</button>
    <button class="st-button red" on:click={onDenyChanges}>Deny Changes</button>
    {#if unresolvedConflictsCount > 0}
      <span use:tooltip={{ content: 'Resolve all conflicts before approving', placement: 'top' }}>
        <button disabled class="st-button" on:click={onApproveChanges}>Approve Changes</button>
      </span>
    {:else}
      <button class="st-button" on:click={onApproveChanges}>Approve Changes</button>
    {/if}
  </div>
</div>

<style>
  .flex {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .merge-review-content {
    display: flex;
    flex: 1;
    flex-direction: row;
    overflow: hidden;
    width: 100%;
  }

  .merge-review-content > div:not(:last-child) {
    border-right: 1px solid var(--st-gray-20);
  }

  .merge-review-metadata {
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow: auto;
    padding: 16px;
  }

  .merge-review-branch-metadata {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .merge-review-branch-metadata-content {
    align-items: center;
    display: flex;
    gap: 8px;
    word-break: break-all;
  }

  .merge-review-branch-metadata-content :global(svg) {
    flex-shrink: 0;
  }

  .st-button.red {
    background: var(--st-error-red);
  }

  .merge-review-stats {
    display: flex;
    flex-direction: row;
    gap: 16px;
  }

  .merge-review-stats > div {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .merge-review-stat {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .merge-review-changes {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .merge-review-changes-content {
    height: 100%;
    overflow: auto;
  }

  .merge-review-subheader {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    gap: 16px;
    height: 48px;
    justify-content: space-between;
    padding: 16px 16px 8px;
  }

  .merge-review-subheader span {
    display: flex;
    gap: 4px;
  }

  .merge-review-subheader :global(.st-icon) {
    flex-shrink: 0;
  }

  .merge-review-conflicts-badge {
    background: var(--st-error-red);
    color: var(--st-white);
  }

  .merge-review-no-conflicts-badge {
    align-items: center;
    background-color: #0eaf0a;
    border-radius: 9999px;
    color: #fff;
    height: 16px;
    justify-content: center;
    padding: 0px 8px 0px 4px;
    user-select: none;
  }

  .st-chip {
    color: var(--st-gray-50);
  }

  fieldset {
    padding: 0;
  }

  summary {
    padding: 8px 16px;
  }

  .details-body {
    gap: 0;
    margin: 0;
  }

  .merge-review-activity-item {
    border-radius: 0;
    gap: 8px;
    height: 32px;
    justify-content: space-between;
    outline: none;
    padding: 0px 33px;
    text-align: left;
  }

  .merge-review-activity-item-resolution {
    text-transform: capitalize;
  }

  .st-chip {
    white-space: nowrap;
  }

  .merge-review-activity-item.active,
  .st-button.tertiary.merge-review-activity-item.active:hover {
    background: var(--st-primary-10);
  }

  .merge-review-comparison-target,
  .merge-review-comparison-request {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .merge-review-comparison-body {
    height: 100%;
    overflow: auto;
  }

  .merge-review-comparison-body.selected :global(.highlight .highlight-bg.active) {
    background: rgba(14, 175, 10, 0.24);
  }

  .merge-review-button-container {
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    padding: 8px;
    width: 100%;
  }

  .merge-review-button-container button.selected {
    background-color: var(--st-gray-60);
    color: var(--st-white);
    gap: 8px;
  }

  .merge-review-button-container button.selected span {
    align-items: center;
    background-color: #0eaf0a;
    border-radius: 9999px;
    color: #fff;
    display: inline-flex;
    height: 16px;
    justify-content: center;
    width: 16px;
  }

  .merge-review-comparison-empty-state {
    align-items: center;
    background: var(--st-gray-10);
    display: flex;
    flex: 1;
    height: 100%;
    justify-content: center;
    margin: 0px;
  }

  :global(.merge-review-content-grid) {
    width: 100%;
  }

  .merge-review-comparison-body :global(.activity-form input.st-input),
  .merge-review-comparison-body :global(.input .svelte-tags-input-layout) {
    background: var(--st-white) !important;
    opacity: 1;
  }

  .merge-review-bottom-actions {
    border-top: 1px solid var(--st-gray-20);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 8px;
  }
</style>
