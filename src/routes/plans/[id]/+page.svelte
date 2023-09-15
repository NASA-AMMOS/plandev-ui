<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import VerticalCollapseIcon from '@nasa-jpl/stellar/icons/vertical_collapse_with_center_line.svg?component';
  import GearWideConnectedIcon from 'bootstrap-icons/icons/gear-wide-connected.svg?component';
  import { keyBy } from 'lodash-es';
  import { onDestroy } from 'svelte';
  import Nav from '../../../components/app/Nav.svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Console from '../../../components/console/Console.svelte';
  import ConsoleSection from '../../../components/console/ConsoleSection.svelte';
  import ConsoleTab from '../../../components/console/ConsoleTab.svelte';
  import PlanMenu from '../../../components/menus/PlanMenu.svelte';
  import ViewMenu from '../../../components/menus/ViewMenu.svelte';
  import PlanMergeRequestsStatusButton from '../../../components/plan/PlanMergeRequestsStatusButton.svelte';
  import PlanNavButton from '../../../components/plan/PlanNavButton.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import PlanGrid from '../../../components/ui/PlanGrid.svelte';
  import ProgressLinear from '../../../components/ui/ProgressLinear.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import {
    activityDirectives,
    activityDirectivesMap,
    resetActivityStores,
    selectActivity,
  } from '../../../stores/activities';
  import { checkConstraintsStatus, constraintResults, resetConstraintStores } from '../../../stores/constraints';
  import {
    allErrors,
    anchorValidationErrors,
    clearAllErrors,
    clearSchedulingErrors,
    schedulingErrors,
    simulationDatasetErrors,
  } from '../../../stores/errors';
  import { planExpansionStatus, resetExpansionStores, selectedExpansionSetId } from '../../../stores/expansion';
  import {
    activityTypes,
    maxTimeRange,
    plan,
    planEndTimeMs,
    planId,
    planLocked,
    planStartTimeMs,
    planTags,
    resetPlanStores,
    viewTimeRange,
  } from '../../../stores/plan';
  import { planSnapshot, planSnapshotId } from '../../../stores/planSnapshots';
  import {
    enableScheduling,
    latestAnalyses,
    resetSchedulingStores,
    satisfiedSchedulingGoalCount,
    schedulingGoalCount,
    schedulingStatus,
  } from '../../../stores/scheduling';
  import {
    enableSimulation,
    externalResources,
    resetSimulationStores,
    resourceTypes,
    resources,
    selectedSpanId,
    simulationDataset,
    simulationDatasetId,
    simulationDatasetLatest,
    simulationDatasetsAll,
    simulationProgress,
    simulationStatus,
    spans,
  } from '../../../stores/simulation';
  import {
    initializeView,
    resetOriginalView,
    resetView,
    view,
    viewTogglePanel,
    viewUpdateGrid,
  } from '../../../stores/views';
  import type { ActivityDirective } from '../../../types/activity';
  import type { ViewSaveEvent, ViewToggleEvent } from '../../../types/view';
  import effects from '../../../utilities/effects';
  import { removeQueryParam } from '../../../utilities/generic';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import { closeActiveModal, showPlanLockedModal } from '../../../utilities/modal';
  import { featurePermissions } from '../../../utilities/permissions';
  import {
    formatSimulationQueuePosition,
    getHumanReadableSimulationStatus,
    getSimulationExtent,
    getSimulationProgress,
    getSimulationProgressColor,
    getSimulationQueuePosition,
    getSimulationStatus,
    getSimulationTimestamp,
  } from '../../../utilities/simulation';
  import { Status, statusColors } from '../../../utilities/status';
  import { getUnixEpochTime } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import type { PageData } from './$types';

  export let data: PageData;

  let compactNavMode = false;
  let hasCreateViewPermission: boolean = false;
  let hasUpdateViewPermission: boolean = false;
  let hasExpandPermission: boolean = false;
  let hasScheduleAnalysisPermission: boolean = false;
  let hasSimulatePermission: boolean = false;
  let hasCheckConstraintsPermission: boolean = false;
  let planHasBeenLocked = false;
  let planSnapshotActivityDirectives: ActivityDirective[] = [];
  let schedulingAnalysisStatus: Status | null;
  let simulationExtent: string | null;
  let selectedSimulationStatus: string | null;
  let windowWidth = 0;

  $: hasCreateViewPermission = featurePermissions.view.canCreate(data.user);
  $: hasUpdateViewPermission = $view !== null ? featurePermissions.view.canUpdate(data.user, $view) : false;
  $: if ($plan) {
    hasCheckConstraintsPermission = featurePermissions.constraints.canCheck(data.user, $plan);
    hasExpandPermission = featurePermissions.expansionSequences.canExpand(data.user, $plan);
    hasScheduleAnalysisPermission = featurePermissions.schedulingGoals.canAnalyze(data.user);
    hasSimulatePermission = featurePermissions.simulation.canRun(data.user, $plan);
  }
  $: if (data.initialPlan) {
    $plan = data.initialPlan;
    $planEndTimeMs = getUnixEpochTime(data.initialPlan.end_time_doy);
    $planStartTimeMs = getUnixEpochTime(data.initialPlan.start_time_doy);
    $maxTimeRange = { end: $planEndTimeMs, start: $planStartTimeMs };

    const querySimulationDatasetId = $page.url.searchParams.get(SearchParameters.SIMULATION_DATASET_ID);
    if (querySimulationDatasetId) {
      $simulationDatasetId = parseInt(querySimulationDatasetId);
      removeQueryParam(SearchParameters.SIMULATION_DATASET_ID);
    } else {
      $simulationDatasetId = data.initialPlan.simulations[0]?.simulation_datasets[0]?.id ?? -1;
    }

    const queryActivityId = $page.url.searchParams.get(SearchParameters.ACTIVITY_ID);
    if (queryActivityId) {
      $selectedSpanId = parseInt(queryActivityId);
      removeQueryParam(SearchParameters.ACTIVITY_ID);
    }

    $viewTimeRange = $maxTimeRange;
    activityTypes.updateValue(() => data.initialActivityTypes);
    planTags.updateValue(() => data.initialPlanTags);

    // Asynchronously fetch resource types
    effects
      .getResourceTypes($plan.model_id, data.user)
      .then(initialResourceTypes => ($resourceTypes = initialResourceTypes));
  }
  $: if (data.initialPlanSnapshotId !== null) {
    $planSnapshotId = data.initialPlanSnapshotId;
  }
  $: if ($planSnapshot !== null) {
    effects.getPlanSnapshotActivityDirectives($planSnapshot, data.user).then(directives => {
      if (directives !== null) {
        planSnapshotActivityDirectives = directives;
      }
    });
  }

  $: if (data.initialView) {
    initializeView({ ...data.initialView });
  }

  $: if ($plan) {
    effects
      .getResourcesExternal($plan.id, $plan.start_time, data.user)
      .then(newResources => ($externalResources = newResources));
  }

  $: if ($planId > -1) {
    // Ensure there is no selected activity if the user came from another plan
    selectActivity(null, null);
  }

  $: if ($plan && $simulationDataset !== undefined) {
    if ($simulationDataset !== null) {
      const datasetId = $simulationDataset.dataset_id;
      const startTimeYmd = $simulationDataset?.simulation_start_time ?? $plan.start_time;
      effects.getResources(datasetId, startTimeYmd, data.user).then(newResources => ($resources = newResources));
      effects.getSpans(datasetId, data.user).then(newSpans => ($spans = newSpans));
    } else {
      $resources = [];
      $spans = [];
    }
  }

  $: {
    $activityDirectivesMap =
      $planSnapshotId !== null && planSnapshotActivityDirectives.length > 0
        ? keyBy(planSnapshotActivityDirectives, 'id')
        : keyBy($activityDirectives, 'id');
  }

  $: if ($plan && $planLocked) {
    planHasBeenLocked = true;
    showPlanLockedModal($plan.id);
  } else if (planHasBeenLocked) {
    closeActiveModal();
    planHasBeenLocked = false;
  }

  $: compactNavMode = windowWidth < 1100;
  $: schedulingAnalysisStatus = $schedulingStatus;
  $: if ($latestAnalyses) {
    if ($schedulingGoalCount !== $satisfiedSchedulingGoalCount) {
      schedulingAnalysisStatus = Status.PartialSuccess;
    }
  }

  $: if ($simulationDatasetLatest) {
    simulationExtent = getSimulationExtent($simulationDatasetLatest);
    selectedSimulationStatus = getSimulationStatus($simulationDatasetLatest);
  }

  onDestroy(() => {
    resetActivityStores();
    resetConstraintStores();
    resetExpansionStores();
    resetPlanStores();
    resetSchedulingStores();
    resetSimulationStores();
    closeActiveModal();
  });

  function onClearAllErrors() {
    clearAllErrors();
  }

  function onClearSchedulingErrors() {
    clearSchedulingErrors();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      effects.simulate(data.user);
    }
  }

  async function onCreateView(event: CustomEvent<ViewSaveEvent>) {
    const { detail } = event;
    const { definition } = detail;
    if (definition && hasCreateViewPermission) {
      const success = await effects.createView(definition, data.user);
      if (success) {
        resetOriginalView();
      }
    }
  }

  async function onEditView(event: CustomEvent<ViewSaveEvent>) {
    const { detail } = event;
    const { definition } = detail;
    if (definition && hasUpdateViewPermission) {
      const success = await effects.editView(definition, data.user);
      if (success) {
        resetOriginalView();
      }
    }
  }

  async function onSaveView(event: CustomEvent<ViewSaveEvent>) {
    const { detail } = event;
    const { definition, id, name } = detail;
    if (id != null && hasUpdateViewPermission) {
      const success = await effects.updateView(id, { definition, name }, data.user);
      if (success) {
        resetOriginalView();
      }
    }
  }

  function onToggleView(event: CustomEvent<ViewToggleEvent>) {
    const { detail } = event;
    viewTogglePanel(detail);
  }

  function onResetView() {
    resetView();
  }

  async function onUploadView() {
    if (hasCreateViewPermission) {
      const success = await effects.uploadView(data.user);
      if (success) {
        resetOriginalView();
      }
    }
  }

  function onChangeColumnSizes(event: CustomEvent<string>) {
    viewUpdateGrid({ columnSizes: event.detail });
  }

  function onChangeLeftRowSizes(event: CustomEvent<string>) {
    viewUpdateGrid({ leftRowSizes: event.detail });
  }

  function onChangeMiddleRowSizes(event: CustomEvent<string>) {
    viewUpdateGrid({ middleRowSizes: event.detail });
  }

  function onChangeRightRowSizes(event: CustomEvent<string>) {
    viewUpdateGrid({ rightRowSizes: event.detail });
  }
</script>

<svelte:window on:keydown={onKeydown} bind:innerWidth={windowWidth} />

<PageTitle subTitle={data.initialPlan.name} title="Plans" />

<CssGrid class="plan-container" rows="var(--nav-header-height) auto 36px">
  <Nav user={data.user}>
    <div slot="title">
      <PlanMenu plan={data.initialPlan} user={data.user} />
    </div>
    <svelte:fragment slot="left">
      <PlanMergeRequestsStatusButton user={data.user} />
    </svelte:fragment>
    <svelte:fragment slot="right">
      <PlanNavButton
        title={!compactNavMode ? 'Expansion' : ''}
        buttonText="Expand Activities"
        hasPermission={hasExpandPermission}
        permissionError="You do not have permission to expand activities"
        menuTitle="Expansion Status"
        disabled={$selectedExpansionSetId === null}
        status={$planExpansionStatus}
        on:click={() => {
          if ($selectedExpansionSetId != null) {
            effects.expand($selectedExpansionSetId, $simulationDatasetLatest?.id || -1, data.user);
          }
        }}
      >
        <PlanIcon />
        <svelte:fragment slot="metadata">
          <div>Expansion Set ID: {$selectedExpansionSetId || 'None'}</div>
        </svelte:fragment>
      </PlanNavButton>
      <PlanNavButton
        title={!compactNavMode ? 'Simulation' : ''}
        menuTitle="Simulation Status"
        buttonText="Simulate"
        buttonTooltipContent={$simulationStatus === Status.Complete || $simulationStatus === Status.Failed
          ? 'Simulation up-to-date'
          : ''}
        hasPermission={hasSimulatePermission}
        permissionError="You do not have permission to run a simulation"
        status={$simulationStatus}
        progress={$simulationProgress}
        disabled={!$enableSimulation}
        showStatusInMenu={false}
        on:click={() => effects.simulate(data.user)}
      >
        <PlayIcon />
        <svelte:fragment slot="metadata">
          <div class="st-typography-body">
            <div class="simulation-header">
              {getHumanReadableSimulationStatus(getSimulationStatus($simulationDatasetLatest))}:
              {#if selectedSimulationStatus === Status.Pending && $simulationDatasetLatest}
                <div style="color: var(--st-gray-50)">
                  {formatSimulationQueuePosition(
                    getSimulationQueuePosition($simulationDatasetLatest, $simulationDatasetsAll),
                  )}
                </div>
              {:else}
                {getSimulationProgress($simulationDatasetLatest).toFixed()}%
                {#if simulationExtent && $simulationDatasetLatest}
                  <div
                    use:tooltip={{ content: 'Simulation Time', placement: 'top' }}
                    style={`color: ${
                      selectedSimulationStatus === Status.Failed ? statusColors.red : 'var(--st-gray-50)'
                    }`}
                  >
                    {getSimulationTimestamp($simulationDatasetLatest)}
                  </div>
                {/if}
              {/if}
            </div>
          </div>
          <div style="width: 240px;">
            <ProgressLinear
              color={getSimulationProgressColor($simulationDatasetLatest?.status || null)}
              progress={getSimulationProgress($simulationDatasetLatest)}
            />
          </div>
          <div>Simulation Dataset ID: {$simulationDatasetLatest?.id}</div>
          {#if selectedSimulationStatus === Status.Pending}
            <button
              on:click={() => effects.cancelPendingSimulation($simulationDatasetId, data.user)}
              class="st-button cancel-button">Cancel</button
            >
          {/if}
        </svelte:fragment>
      </PlanNavButton>
      <PlanNavButton
        title={!compactNavMode ? 'Constraints' : ''}
        menuTitle="Constraint Status"
        buttonText="Check Constraints"
        hasPermission={hasCheckConstraintsPermission}
        permissionError="You do not have permission to run a constraint check"
        status={$checkConstraintsStatus}
        on:click={() => effects.checkConstraints(data.user)}
      >
        <VerticalCollapseIcon />
        <svelte:fragment slot="metadata">
          <div>Constraint violations: {$constraintResults.filter(result => result.violations.length).length}</div>
        </svelte:fragment>
      </PlanNavButton>
      <PlanNavButton
        title={!compactNavMode ? 'Scheduling' : ''}
        menuTitle="Scheduling Analysis Status"
        buttonText="Analyze Goal Satisfaction"
        disabled={!$enableScheduling}
        hasPermission={hasScheduleAnalysisPermission}
        permissionError="You do not have permission to run a scheduling analysis"
        status={schedulingAnalysisStatus}
        statusText={schedulingAnalysisStatus === Status.PartialSuccess || schedulingAnalysisStatus === Status.Complete
          ? `${$satisfiedSchedulingGoalCount} satisfied, ${
              $schedulingGoalCount - $satisfiedSchedulingGoalCount
            } unsatisfied`
          : ''}
        on:click={() => effects.schedule(true, data.user)}
      >
        <CalendarIcon />
      </PlanNavButton>
      <ViewMenu
        hasCreatePermission={hasCreateViewPermission}
        hasUpdatePermission={hasUpdateViewPermission}
        user={data.user}
        on:createView={onCreateView}
        on:editView={onEditView}
        on:saveView={onSaveView}
        on:toggleView={onToggleView}
        on:resetView={onResetView}
        on:uploadView={onUploadView}
      />
    </svelte:fragment>
  </Nav>

  <PlanGrid
    {...$view?.definition.plan.grid}
    user={data.user}
    on:changeColumnSizes={onChangeColumnSizes}
    on:changeLeftRowSizes={onChangeLeftRowSizes}
    on:changeMiddleRowSizes={onChangeMiddleRowSizes}
    on:changeRightRowSizes={onChangeRightRowSizes}
  />

  <Console>
    <svelte:fragment slot="console-tabs">
      <div class="console-tabs">
        <div>
          <ConsoleTab numberOfErrors={$allErrors?.length} title="All Errors">All</ConsoleTab>
        </div>
        <div class="separator">|</div>
        <div class="grouped-error-tabs">
          <ConsoleTab numberOfErrors={$anchorValidationErrors?.length} title="Anchor Validation Errors">
            <ActivityIcon />
          </ConsoleTab>
          <ConsoleTab numberOfErrors={$schedulingErrors?.length} title="Scheduling Errors"><CalendarIcon /></ConsoleTab>
          <ConsoleTab numberOfErrors={$simulationDatasetErrors?.length} title="Simulation Errors">
            <GearWideConnectedIcon />
          </ConsoleTab>
        </div>
      </div>
    </svelte:fragment>

    <ConsoleSection errors={$allErrors} title="All Errors" on:clearMessages={onClearAllErrors} />
    <ConsoleSection errors={$anchorValidationErrors} title="Anchor Validation Errors" />
    <ConsoleSection errors={$schedulingErrors} title="Scheduling Errors" on:clearMessages={onClearSchedulingErrors} />
    <ConsoleSection errors={$simulationDatasetErrors} isClearable={false} title="Simulation Errors" />
  </Console>
</CssGrid>

<style>
  :global(.plan-container) {
    height: 100%;
  }

  .console-tabs {
    align-items: center;
    column-gap: 1rem;
    display: grid;
    grid-template-columns: min-content min-content auto;
  }

  .grouped-error-tabs {
    display: flex;
  }

  .separator {
    color: var(--st-gray-30);
  }

  .simulation-header {
    display: flex;
    justify-content: space-between;
  }

  .cancel-button {
    background: rgba(219, 81, 57, 0.04);
    border: 1px solid var(--st-utility-red);
    color: var(--st-utility-red);
  }

  .cancel-button:hover {
    background: rgba(219, 81, 57, 0.08);
  }
</style>
