<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import MergeIcon from '@nasa-jpl/stellar/icons/merge.svg?component';
  import PlanWithUpArrow from '@nasa-jpl/stellar/icons/plan_with_up_arrow.svg?component';
  import { keyBy } from 'lodash-es';
  import { activityMetadataDefinitions } from '../../stores/activities';
  import { activityTypes, planReadOnlyMergeRequest } from '../../stores/plan';
  import { gqlSubscribable } from '../../stores/subscribable';
  import type { ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type {
    Plan,
    PlanMergeActivityDirective,
    PlanMergeActivityDirectiveSource,
    PlanMergeActivityDirectiveTarget,
    PlanMergeConflictingActivity,
    PlanMergeNonConflictingActivity,
    PlanMergeRequestSchema,
    PlanMergeRequestStatus,
    PlanMergeResolution,
  } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { changedKeys, getTarget } from '../../utilities/generic';
  import gql from '../../utilities/gql';
  import { showMergeReviewEndedModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import ActivityDirectiveForm from '../activity/ActivityDirectiveForm.svelte';
  import ActivityDirectiveSourceForm from '../activity/ActivityDirectiveSourceForm.svelte';
  import Nav from '../app/Nav.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import PlanMergeReviewUserInfo from './PlanMergeReviewUserInfo.svelte';

  export let initialConflictingActivities: PlanMergeConflictingActivity[] = [];
  export let initialMergeRequest: PlanMergeRequestSchema | null;
  export let initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [];
  export let initialPlan: Plan;
  export let user: User | null;

  const conflictingMergeActivities = gqlSubscribable<PlanMergeConflictingActivity[]>(
    gql.SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES,
    { merge_request_id: initialMergeRequest?.id },
    initialConflictingActivities,
    user,
  );
  const mergeRequestStatus = gqlSubscribable<PlanMergeRequestStatus>(
    gql.SUB_PLAN_MERGE_REQUEST_STATUS,
    {
      mergeRequestId: initialMergeRequest?.id,
    },
    initialMergeRequest?.status,
    user,
    ({ status }) => status,
  );

  let additions: PlanMergeNonConflictingActivity[] = [];
  let computedSourceActivity: PlanMergeActivityDirectiveSource | null;
  let computedTargetActivity: PlanMergeActivityDirectiveTarget | null;
  let conflicts: PlanMergeConflictingActivity[] = [];
  let deletions: PlanMergeNonConflictingActivity[] = [];
  let hasReviewPermission: boolean = false;
  let keysWithChanges: string[] = [];
  let mergeComparisonSourceDiv: HTMLElement | null = null;
  let mergeComparisonTargetDiv: HTMLElement | null = null;
  let mergeComparisonScrollOrigin: 'source' | 'target' | null = null;
  let modifications: PlanMergeNonConflictingActivity[] = [];
  let receivingPlanActivitiesMap: ActivityDirectivesMap = {};
  let selectedActivityId: number | null;
  let selectedConflictingActivity: PlanMergeConflictingActivity | null;
  let selectedConflictingActivityResolution: PlanMergeResolution | null;
  let selectedMergeType: 'conflict' | 'add' | 'modify' | 'delete' | 'none' | null;
  let selectedNonConflictingActivity: PlanMergeNonConflictingActivity | null;
  let unresolvedConflictsCount: number = 0;
  let userInitiatedMergeRequestResolution: boolean = false;

  $: if (initialPlan && initialMergeRequest) {
    const {
      plan_snapshot_supplying_changes: { plan: sourcePlan },
      plan_receiving_changes: targetPlan,
    } = initialMergeRequest;

    const { id: supplyingPlanId } = sourcePlan;

    hasReviewPermission = featurePermissions.planBranch.canReviewRequest(
      user,
      sourcePlan,
      targetPlan,
      initialPlan.model,
    );

    // build up the complete array of snapshotted receiving and supplying directives
    let { receivingPlanDirectives, supplyingPlanDirectives } = initialConflictingActivities.reduce(
      (
        previous: {
          receivingPlanDirectives: PlanMergeActivityDirective[];
          supplyingPlanDirectives: PlanMergeActivityDirective[];
        },
        conflictingActivity: PlanMergeConflictingActivity,
      ) => {
        const { source, target, change_type_source, change_type_target } = conflictingActivity;

        const receivingPlanDirectives =
          change_type_target === 'delete' || target === null
            ? [...previous.receivingPlanDirectives]
            : [...previous.receivingPlanDirectives, target];

        const supplyingPlanDirectives =
          change_type_source === 'delete' || source === null
            ? [...previous.supplyingPlanDirectives]
            : [...previous.supplyingPlanDirectives, { ...source, plan_id: supplyingPlanId }];

        return {
          receivingPlanDirectives,
          supplyingPlanDirectives,
        };
      },
      { receivingPlanDirectives: [], supplyingPlanDirectives: [] },
    );

    ({ receivingPlanDirectives, supplyingPlanDirectives } = initialNonConflictingActivities.reduce(
      (previous, nonConflictingActivity: PlanMergeNonConflictingActivity) => {
        const { source, target } = nonConflictingActivity;

        const receivingPlanDirectives = target
          ? [...previous.receivingPlanDirectives, target]
          : [...previous.receivingPlanDirectives];

        const supplyingPlanDirectives = source
          ? [...previous.supplyingPlanDirectives, { ...source, plan_id: supplyingPlanId }]
          : [...previous.supplyingPlanDirectives];

        return {
          receivingPlanDirectives,
          supplyingPlanDirectives,
        };
      },
      { receivingPlanDirectives, supplyingPlanDirectives },
    ));
    receivingPlanActivitiesMap = keyBy(receivingPlanDirectives, 'id');
  }

  $: if (initialNonConflictingActivities) {
    // Updated selectedNonConflictingActivity with the refreshed version if needed
    if (selectedNonConflictingActivity) {
      const { activity_id: activityId } = selectedNonConflictingActivity;
      const selectedActivity = initialNonConflictingActivities.find(merge => merge.activity_id === activityId);
      if (selectedActivity) {
        selectedNonConflictingActivity = selectedActivity;
      }
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

    // Updated selectedConflictingActivity with the refreshed version if needed
    if (selectedConflictingActivity) {
      selectedConflictingActivity =
        $conflictingMergeActivities.find(
          activity => activity.activity_id === selectedConflictingActivity?.activity_id,
        ) ?? null;
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
    const sourceTags = selectedNonConflictingActivity.source_tags.map(tag => ({ tag }));
    const targetTags = selectedNonConflictingActivity.target_tags.map(tag => ({ tag }));

    if (selectedNonConflictingActivity.change_type === 'delete') {
      computedTargetActivity =
        selectedNonConflictingActivity.target !== null
          ? { ...selectedNonConflictingActivity.target, tags: targetTags }
          : null;
      computedSourceActivity = null;
    } else if (selectedNonConflictingActivity.change_type === 'add') {
      computedSourceActivity =
        selectedNonConflictingActivity.source !== null
          ? { ...selectedNonConflictingActivity.source, tags: sourceTags }
          : null;
      computedTargetActivity = null;
    } else {
      computedTargetActivity =
        selectedNonConflictingActivity.target !== null
          ? { ...selectedNonConflictingActivity.target, tags: targetTags }
          : null;
      computedSourceActivity =
        selectedNonConflictingActivity.source !== null
          ? { ...selectedNonConflictingActivity.source, tags: sourceTags }
          : null;
    }

    // Reset comparison scroll positions
    resetMergeReviewComparisonScrollTops();
  }

  $: if (selectedConflictingActivity) {
    selectedActivityId = selectedConflictingActivity.activity_id;
    selectedMergeType = 'conflict';
    // Derive source and target activities
    if (selectedConflictingActivity.source) {
      computedSourceActivity = {
        ...selectedConflictingActivity.source,
        tags: selectedConflictingActivity.source_tags.map(tag => ({ tag })),
      };
    } else {
      computedSourceActivity = null;
    }
    if (selectedConflictingActivity.target) {
      computedTargetActivity = {
        ...selectedConflictingActivity.target,
        tags: selectedConflictingActivity.target_tags.map(tag => ({ tag })),
      };
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
    if (computedSourceActivity && computedTargetActivity) {
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
    }
  } else {
    keysWithChanges = [];
  }

  $: if ($mergeRequestStatus !== 'in-progress' && !userInitiatedMergeRequestResolution) {
    showMergeReviewEndedModal(initialPlan.id, $mergeRequestStatus);
  }

  async function onApproveChanges() {
    if (initialMergeRequest !== null) {
      const success = await effects.planMergeCommit(
        initialMergeRequest.id,
        initialMergeRequest.plan_snapshot_supplying_changes.plan,
        initialMergeRequest.plan_receiving_changes,
        user,
      );
      if (success) {
        $planReadOnlyMergeRequest = false;
        userInitiatedMergeRequestResolution = true;
        goto(`${base}/plans/${initialPlan.id}`);
      }
    }
  }

  async function onDenyChanges() {
    if (initialMergeRequest !== null) {
      const success = await effects.planMergeDeny(
        initialMergeRequest.id,
        initialMergeRequest.plan_snapshot_supplying_changes.plan,
        initialMergeRequest.plan_receiving_changes,
        user,
      );
      if (success) {
        $planReadOnlyMergeRequest = false;
        userInitiatedMergeRequestResolution = true;
        goto(`${base}/plans/${initialPlan.id}`);
      }
    }
  }

  async function onCancel() {
    if (initialMergeRequest !== null) {
      const success = await effects.planMergeCancel(
        initialMergeRequest.id,
        initialMergeRequest.plan_snapshot_supplying_changes.plan,
        initialMergeRequest.plan_receiving_changes,
        user,
      );
      if (success) {
        $planReadOnlyMergeRequest = false;
        userInitiatedMergeRequestResolution = true;
        goto(`${base}/plans/${initialPlan.id}`);
      }
    }
  }

  function onResolveAll(e: Event) {
    const { value } = getTarget(e);
    const resolution = value as PlanMergeResolution;
    if (initialMergeRequest !== null) {
      effects.planMergeResolveAllConflicts(
        initialMergeRequest.id,
        resolution,
        initialMergeRequest.plan_snapshot_supplying_changes.plan,
        initialMergeRequest.plan_receiving_changes,
        user,
      );

      // Set resolutions for all conflicts
      if ($conflictingMergeActivities && $conflictingMergeActivities.length) {
        const conflictActivityIdMap = conflicts.reduce((map: Record<number, true>, conflict) => {
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
    }

    // Set select value back to Resolve All default
    (e.target as HTMLSelectElement).value = 'resolve_all';
  }

  async function onMergeReviewComparisonScroll(event: Event, origin: 'source' | 'target') {
    if (mergeComparisonScrollOrigin === origin) {
      const target = event.target as HTMLDivElement;
      const scrollTop = target.scrollTop;
      if (origin === 'source' && mergeComparisonTargetDiv !== null) {
        mergeComparisonTargetDiv.scrollTop = scrollTop;
      } else if (mergeComparisonSourceDiv !== null) {
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
    if (initialMergeRequest !== null) {
      await effects.planMergeResolveConflict(
        initialMergeRequest.id,
        activityId,
        resolution,
        initialMergeRequest.plan_snapshot_supplying_changes.plan,
        initialMergeRequest.plan_receiving_changes,
        user,
      );

      conflictingMergeActivities.updateValue((activities: PlanMergeConflictingActivity[]) => {
        return activities.map(activity => {
          if (activity.activity_id === activityId) {
            activity.resolution = resolution;
          }
          return activity;
        });
      });
    }
  }
</script>

<div class="flex">
  <Nav {user}>
    <span class="" slot="title"
      >Merge Review:
      <a href={`${base}/plans/${initialMergeRequest?.plan_receiving_changes.id}`} class="link">
        {initialMergeRequest?.plan_receiving_changes.name}
      </a>
      from
      <a href={`${base}/plans/${initialMergeRequest?.plan_snapshot_supplying_changes.plan.id}`} class="link">
        {initialMergeRequest?.plan_snapshot_supplying_changes.plan.name}
      </a>
    </span>
  </Nav>
  <div class="merge-review-content">
    <CssGrid columns="0.5fr 3px 1fr 3px 1fr 3px 1fr" class="merge-review-content-grid">
      <div class="merge-review-metadata">
        <PlanMergeReviewUserInfo
          label="Requested Merge"
          title="Created By"
          username={initialMergeRequest?.requester_username}
        />
        <PlanMergeReviewUserInfo
          label="Plan Owner"
          title="Reviewed By"
          username={initialMergeRequest?.reviewer_username}
        />
        <div class="merge-review-branch-metadata">
          <div class="st-typography-medium">Current Branch (Target)</div>
          <div class="merge-review-branch-metadata-content st-typography-body">
            <MergeIcon />
            {initialMergeRequest?.plan_receiving_changes.name}
          </div>
        </div>
        <div class="merge-review-branch-metadata">
          <div class="st-typography-medium">Source Branch</div>
          <div class="merge-review-branch-metadata-content st-typography-body">
            <PlanWithUpArrow />
            {initialMergeRequest?.plan_snapshot_supplying_changes.plan.name}
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
          <select
            class="st-select"
            value="resolve_all"
            on:change={onResolveAll}
            use:permissionHandler={{
              hasPermission: hasReviewPermission,
              permissionError: 'You do not have permission to resolve conflicts on this request',
            }}
          >
            <option value="resolve_all">Resolve All</option>
            <option value="source">Resolve All Using Source</option>
            <option value="target">Resolve All Using Target</option>
            <option value="none">Unresolve All</option>
          </select>
        </div>
        <div class="merge-review-changes-content">
          {#if conflicts.length}
            <fieldset>
              <Collapse title="Conflicts" titleClassName="st-typography-bold">
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
                      <span class="merge-review-activity-item-resolution st-typography-medium section-title">
                        {merge.resolution}
                      </span>
                    {/if}
                  </button>
                {/each}
              </Collapse>
            </fieldset>
          {/if}
          {#if additions.length}
            <fieldset>
              <Collapse title="New Activities" titleClassName="st-typography-bold">
                {#each additions as merge}
                  <button
                    on:click={() => {
                      selectedNonConflictingActivity = merge;
                      selectedConflictingActivity = null;
                    }}
                    class="st-button tertiary merge-review-activity-item"
                    class:active={selectedActivityId === merge.activity_id}>{merge?.source?.name}</button
                  >
                {/each}
              </Collapse>
            </fieldset>
          {/if}
          {#if modifications.length}
            <fieldset>
              <Collapse title="Modified Activities" titleClassName="st-typography-bold">
                {#each modifications as merge}
                  <button
                    on:click={() => {
                      selectedNonConflictingActivity = merge;
                      selectedConflictingActivity = null;
                    }}
                    class="st-button tertiary merge-review-activity-item"
                    class:active={selectedActivityId === merge.activity_id}>{merge?.source?.name}</button
                  >
                {/each}
              </Collapse>
            </fieldset>
          {/if}
          {#if deletions.length}
            <fieldset>
              <Collapse title="Removed Activities">
                {#each deletions as merge}
                  <button
                    on:click={() => {
                      selectedNonConflictingActivity = merge;
                      selectedConflictingActivity = null;
                    }}
                    class="st-button tertiary merge-review-activity-item"
                    class:active={selectedActivityId === merge.activity_id}
                  >
                    {merge?.target?.name}
                  </button>
                {/each}
              </Collapse>
            </fieldset>
          {/if}
        </div>
      </div>
      <CssGridGutter track={3} type="column" />
      <div class="merge-review-comparison-target">
        <div class="merge-review-subheader">
          <span style="gap: 8px">
            <PlanWithUpArrow />
            <span class="st-typography-medium">{initialMergeRequest?.plan_snapshot_supplying_changes.plan.name}</span>
          </span>
          <span class="section-title st-typography-medium">Source</span>
        </div>
        {#if selectedConflictingActivity}
          <div class="merge-review-button-container">
            <button
              class="st-button secondary w-100"
              class:selected={selectedConflictingActivityResolution === 'source'}
              on:click={() => {
                const activityId =
                  selectedConflictingActivity?.change_type_source === 'delete'
                    ? selectedConflictingActivity.merge_base.id
                    : selectedConflictingActivity?.source?.id;
                const resolution = selectedConflictingActivity?.resolution === 'source' ? 'none' : 'source';
                if (activityId !== undefined) {
                  resolveConflict(activityId, resolution);
                }
              }}
              use:permissionHandler={{
                hasPermission: hasReviewPermission,
                permissionError: 'You do not have permission to resolve this conflict',
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
            {#if selectedMergeType === 'add' || selectedMergeType === 'modify' || (selectedMergeType === 'conflict' && selectedConflictingActivity?.change_type_source !== 'delete')}
              <ActivityDirectiveSourceForm
                {computedSourceActivity}
                activityMetadataDefinitions={$activityMetadataDefinitions}
                activityTypes={$activityTypes}
                highlightKeys={keysWithChanges}
                modelId={initialPlan.model_id}
                planId={initialPlan.id}
                planStartTimeYmd={initialPlan.start_time}
                {user}
              />
            {:else if (selectedMergeType === 'delete' && !computedSourceActivity) || (selectedMergeType === 'conflict' && selectedConflictingActivity?.change_type_source === 'delete')}
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
            <span class="st-typography-medium">{initialMergeRequest?.plan_receiving_changes.name}</span>
          </span>
          <span class="section-title st-typography-medium">Current Branch (Target)</span>
        </div>
        {#if selectedConflictingActivity}
          <div class="merge-review-button-container">
            <button
              class="st-button secondary w-100"
              class:selected={selectedConflictingActivityResolution === 'target'}
              on:click={() => {
                const activityId =
                  selectedConflictingActivity?.change_type_target === 'delete'
                    ? selectedConflictingActivity?.merge_base.id
                    : selectedConflictingActivity?.target?.id;
                const resolution = selectedConflictingActivity?.resolution === 'target' ? 'none' : 'target';
                if (activityId !== undefined) {
                  resolveConflict(activityId, resolution);
                }
              }}
              use:permissionHandler={{
                hasPermission: hasReviewPermission,
                permissionError: 'You do not have permission to resolve this conflict',
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
            {#if (selectedMergeType === 'modify' || (selectedMergeType === 'delete' && !computedSourceActivity) || (selectedMergeType === 'conflict' && selectedConflictingActivity?.change_type_target !== 'delete')) && computedTargetActivity !== null}
              <ActivityDirectiveForm
                activityDirective={computedTargetActivity}
                activityDirectivesMap={receivingPlanActivitiesMap}
                activityMetadataDefinitions={$activityMetadataDefinitions}
                activityTypes={$activityTypes}
                editable={false}
                highlightKeys={selectedConflictingActivity !== null ? keysWithChanges : []}
                modelId={initialPlan.model_id}
                planStartTimeYmd={initialPlan.start_time}
                showActivityName
                showHeader={false}
                {user}
              />
            {:else if (selectedMergeType === 'delete' && !computedTargetActivity) || (selectedMergeType === 'conflict' && selectedConflictingActivity?.change_type_target === 'delete')}
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
    <button
      class="st-button secondary"
      use:permissionHandler={{
        hasPermission: hasReviewPermission,
        permissionError: 'You do not have permission to cancel this request',
      }}
      on:click={onCancel}
    >
      Cancel Review
    </button>
    <button
      class="st-button red"
      use:permissionHandler={{
        hasPermission: hasReviewPermission,
        permissionError: 'You do not have permission to deny this request',
      }}
      on:click={onDenyChanges}
    >
      Deny Changes
    </button>
    {#if unresolvedConflictsCount > 0}
      <span use:tooltip={{ content: 'Resolve all conflicts before approving', placement: 'top' }}>
        <button
          disabled
          class="st-button"
          use:permissionHandler={{
            hasPermission: hasReviewPermission,
            permissionError: 'You do not have permission to approve this request',
          }}
          on:click={onApproveChanges}
        >
          Approve Changes
        </button>
      </span>
    {:else}
      <button
        class="st-button"
        use:permissionHandler={{
          hasPermission: hasReviewPermission,
          permissionError: 'You do not have permission to approve this request',
        }}
        on:click={onApproveChanges}
      >
        Approve Changes
      </button>
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

  .merge-review-changes-content :global(.collapse > button.collapse-header) {
    padding: 8px 16px;
  }

  .merge-review-changes-content :global(.collapse .content) {
    gap: 0;
    margin: 0;
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

  .section-title {
    color: var(--st-gray-50);
  }

  fieldset {
    padding: 0;
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

  .section-title {
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
  .merge-review-comparison-body :global(.tags) {
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

  .link {
    color: var(--st-white);
    font-size: 14px;
    opacity: 0.7;
    text-decoration: none;
  }

  .link:hover {
    opacity: 1;
  }
</style>
