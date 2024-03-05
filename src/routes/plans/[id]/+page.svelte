<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import VerticalCollapseIcon from '@nasa-jpl/stellar/icons/vertical_collapse_with_center_line.svg?component';
  import WaterfallIcon from '@nasa-jpl/stellar/icons/waterfall.svg?component';
  import GearWideConnectedIcon from 'bootstrap-icons/icons/gear-wide-connected.svg?component';
  import { keyBy } from 'lodash-es';
  import { onDestroy } from 'svelte';
  import Nav from '../../../components/app/Nav.svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Console from '../../../components/console/Console.svelte';
  import ConsoleTab from '../../../components/console/ConsoleTab.svelte';
  import ConsoleActivityErrors from '../../../components/console/views/ActivityErrors.svelte';
  import ConsoleGenericErrors from '../../../components/console/views/GenericErrors.svelte';
  import ActivityStatusMenu from '../../../components/menus/ActivityStatusMenu.svelte';
  import ExtensionMenu from '../../../components/menus/ExtensionMenu.svelte';
  import PlanMenu from '../../../components/menus/PlanMenu.svelte';
  import ViewMenu from '../../../components/menus/ViewMenu.svelte';
  import PlanMergeRequestsStatusButton from '../../../components/plan/PlanMergeRequestsStatusButton.svelte';
  import PlanNavButton from '../../../components/plan/PlanNavButton.svelte';
  import PlanSnapshotBar from '../../../components/plan/PlanSnapshotBar.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import PlanGrid from '../../../components/ui/PlanGrid.svelte';
  import ProgressLinear from '../../../components/ui/ProgressLinear.svelte';
  import StatusBadge from '../../../components/ui/StatusBadge.svelte';
  import { PlanStatusMessages } from '../../../enums/planStatusMessages';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { Status } from '../../../enums/status';
  import {
    activityDirectiveValidationStatuses,
    activityDirectives,
    activityDirectivesMap,
    resetActivityStores,
    selectActivity,
    selectedActivityDirectiveId,
  } from '../../../stores/activities';
  import {
    checkConstraintsStatus,
    constraintResponseMap,
    constraintsStatus,
    constraintsViolationStatus,
    resetConstraintStores,
    uncheckedConstraintCount,
  } from '../../../stores/constraints';
  import {
    activityErrorRollups,
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
    planDatasets,
    planEndTimeMs,
    planId,
    planLocked,
    planReadOnly,
    planStartTimeMs,
    planTags,
    resetPlanStores,
    viewTimeRange,
  } from '../../../stores/plan';
  import { planSnapshot, planSnapshotId } from '../../../stores/planSnapshots';
  import {
    enableScheduling,
    latestSchedulingRequest,
    satisfiedSchedulingGoalCount,
    schedulingAnalysisStatus,
    schedulingGoalCount,
  } from '../../../stores/scheduling';
  import {
    enableSimulation,
    externalResourceNames,
    externalResources,
    fetchingResourcesExternal,
    resetSimulationStores,
    resourceTypes,
    resourceTypesLoading,
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
  import type { ActivityErrorCounts } from '../../../types/errors';
  import type { Extension } from '../../../types/extension';
  import type { PlanSnapshot } from '../../../types/plan-snapshot';
  import type { View, ViewSaveEvent, ViewToggleEvent } from '../../../types/view';
  import effects from '../../../utilities/effects';
  import { getSearchParameterNumber, removeQueryParam, setQueryParam } from '../../../utilities/generic';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import { closeActiveModal, showPlanLockedModal } from '../../../utilities/modal';
  import { featurePermissions } from '../../../utilities/permissions';
  import {
    formatSimulationQueuePosition,
    getHumanReadableStatus,
    getSimulationExtent,
    getSimulationProgress,
    getSimulationProgressColor,
    getSimulationQueuePosition,
    getSimulationStatus,
    getSimulationTimestamp,
  } from '../../../utilities/simulation';
  import { statusColors } from '../../../utilities/status';
  import { pluralize } from '../../../utilities/text';
  import { getUnixEpochTime } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import type { PageData } from './$types';

  export let data: PageData;

  enum ConsoleTabs {
    ALL = 'all',
    ANCHOR = 'anchor',
    SCHEDULING = 'scheduling',
    SIMULATION = 'simulation',
    ACTIVITY = 'activity',
  }

  let activityErrorCounts: ActivityErrorCounts = {
    all: 0,
    extra: 0,
    invalidAnchor: 0,
    invalidParameter: 0,
    missing: 0,
    outOfBounds: 0,
    pending: 0,
    wrongType: 0,
  };
  let compactNavMode = false;
  let errorConsole: Console;
  let consoleHeightString = '36px';
  let hasCreateViewPermission: boolean = false;
  let hasUpdateViewPermission: boolean = false;
  let hasExpandPermission: boolean = false;
  let hasScheduleAnalysisPermission: boolean = false;
  let hasSimulatePermission: boolean = false;
  let hasCheckConstraintsPermission: boolean = false;
  let invalidActivityCount: number = 0;
  let planHasBeenLocked = false;
  let planSnapshotActivityDirectives: ActivityDirective[] = [];
  let simulationExtent: string | null;
  let selectedSimulationStatus: Status | null;
  let windowWidth = 0;
  let simulationDataAbortController: AbortController;
  let resourcesExternalAbortController: AbortController;
  let schedulingStatusText: string = '';

  $: ({ invalidActivityCount, ...activityErrorCounts } = $activityErrorRollups.reduce(
    (prevCounts, activityErrorRollup) => {
      let extra = prevCounts.extra + activityErrorRollup.errorCounts.extra;
      let invalidAnchor = prevCounts.invalidAnchor + activityErrorRollup.errorCounts.invalidAnchor;
      let invalidParameter = prevCounts.invalidParameter + activityErrorRollup.errorCounts.invalidParameter;
      let missing = prevCounts.missing + activityErrorRollup.errorCounts.missing;
      let outOfBounds = prevCounts.outOfBounds + activityErrorRollup.errorCounts.outOfBounds;
      let pending = prevCounts.pending + activityErrorRollup.errorCounts.pending;
      let wrongType = prevCounts.wrongType + activityErrorRollup.errorCounts.wrongType;

      let all = extra + invalidAnchor + invalidParameter + missing + outOfBounds + wrongType;
      return {
        all,
        extra,
        invalidActivityCount:
          activityErrorRollup.errorCounts.extra ||
          activityErrorRollup.errorCounts.invalidAnchor ||
          activityErrorRollup.errorCounts.invalidParameter ||
          activityErrorRollup.errorCounts.missing ||
          activityErrorRollup.errorCounts.outOfBounds ||
          activityErrorRollup.errorCounts.pending ||
          activityErrorRollup.errorCounts.wrongType
            ? prevCounts.invalidActivityCount + 1
            : prevCounts.invalidActivityCount,
        invalidAnchor,
        invalidParameter,
        missing,
        outOfBounds,
        pending,
        wrongType,
      };
    },
    {
      all: 0,
      extra: 0,
      invalidActivityCount: 0,
      invalidAnchor: 0,
      invalidParameter: 0,
      missing: 0,
      outOfBounds: 0,
      pending: 0,
      wrongType: 0,
    },
  ));
  $: hasCreateViewPermission = featurePermissions.view.canCreate(data.user);
  $: hasUpdateViewPermission = $view !== null ? featurePermissions.view.canUpdate(data.user, $view) : false;
  $: if ($plan) {
    hasCheckConstraintsPermission =
      featurePermissions.constraintPlanSpec.canCheck(data.user, $plan, $plan.model) && !$planReadOnly;
    hasExpandPermission =
      featurePermissions.expansionSequences.canExpand(data.user, $plan, $plan.model) && !$planReadOnly;
    hasScheduleAnalysisPermission =
      featurePermissions.schedulingGoals.canAnalyze(data.user, $plan, $plan.model) && !$planReadOnly;
    hasSimulatePermission = featurePermissions.simulation.canRun(data.user, $plan, $plan.model) && !$planReadOnly;
  }
  $: if (data.initialPlan) {
    $plan = data.initialPlan;
    $planEndTimeMs = getUnixEpochTime(data.initialPlan.end_time_doy);
    $planStartTimeMs = getUnixEpochTime(data.initialPlan.start_time_doy);
    $maxTimeRange = { end: $planEndTimeMs, start: $planStartTimeMs };

    const querySimulationDatasetId = $page.url.searchParams.get(SearchParameters.SIMULATION_DATASET_ID);
    if (querySimulationDatasetId) {
      $simulationDatasetId = parseInt(querySimulationDatasetId);
    } else if (data.initialPlanSnapshotId === null) {
      $simulationDatasetId = data.initialPlan.simulations[0]?.simulation_datasets[0]?.id ?? -1;
    }

    const queryActivityId = getSearchParameterNumber(SearchParameters.ACTIVITY_ID, $page.url.searchParams);
    const querySpanId = getSearchParameterNumber(SearchParameters.SPAN_ID, $page.url.searchParams);
    if (queryActivityId !== null || querySpanId !== null) {
      setTimeout(() => selectActivity(queryActivityId, querySpanId));
      removeQueryParam(SearchParameters.ACTIVITY_ID);
      removeQueryParam(SearchParameters.SPAN_ID);
    }

    let start = NaN;
    const startTimeStr = $page.url.searchParams.get(SearchParameters.START_TIME);
    if (startTimeStr) {
      start = new Date(startTimeStr).getTime();
      removeQueryParam(SearchParameters.START_TIME);
    }

    let end = NaN;
    const endTimeStr = $page.url.searchParams.get(SearchParameters.END_TIME);
    if (endTimeStr) {
      end = new Date(endTimeStr).getTime();
      removeQueryParam(SearchParameters.END_TIME);
    }

    viewTimeRange.set({
      end: !isNaN(end) ? end : $maxTimeRange.end,
      start: !isNaN(start) ? start : $maxTimeRange.start,
    });

    activityTypes.updateValue(() => data.initialActivityTypes);
    planTags.updateValue(() => data.initialPlanTags);

    // Asynchronously fetch resource types
    effects.getResourceTypes($plan.model_id, data.user).then(initialResourceTypes => {
      $resourceTypes = initialResourceTypes;
      $resourceTypesLoading = false;
    });
  }
  $: if (data.initialPlanSnapshotId !== null) {
    $planSnapshotId = data.initialPlanSnapshotId;
    $planReadOnly = true;
  }
  $: if ($planSnapshot !== null) {
    effects.getPlanSnapshotActivityDirectives($planSnapshot, data.user).then(directives => {
      if (directives !== null) {
        planSnapshotActivityDirectives = directives;
      }
    });

    const currentPlanSimulation = data.initialPlan.simulations[0]?.simulation_datasets.find(simulation => {
      return simulation.id === getSearchParameterNumber(SearchParameters.SIMULATION_DATASET_ID);
    });
    const latestPlanSnapshotSimulation = data.initialPlan.simulations[0]?.simulation_datasets.find(simulation => {
      return simulation.plan_revision === $planSnapshot?.revision;
    });

    if (!currentPlanSimulation && latestPlanSnapshotSimulation) {
      $simulationDatasetId = latestPlanSnapshotSimulation.id;
      setQueryParam(SearchParameters.SIMULATION_DATASET_ID, `${$simulationDatasetId}`);
    }
  }

  $: if (data.initialView) {
    initializeView({ ...data.initialView });
  }

  $: if ($plan && $planDatasets) {
    let datasetNames = [];

    for (const dataset of $planDatasets) {
      for (const profile of dataset.dataset.profiles) {
        datasetNames.push(profile.name);
      }
    }

    $externalResourceNames = [...new Set(datasetNames)];

    resourcesExternalAbortController?.abort();
    resourcesExternalAbortController = new AbortController();
    $fetchingResourcesExternal = true;
    $externalResources = [];
    effects
      .getResourcesExternal(
        $plan.id,
        $simulationDatasetId > -1 ? $simulationDatasetId : null,
        $plan.start_time,
        data.user,
        resourcesExternalAbortController.signal,
      )
      .then(({ aborted, resources }) => {
        if (!aborted) {
          $externalResources = resources;
          $fetchingResourcesExternal = false;
        }
      });
  }

  $: if ($planId > -1) {
    // Ensure there is no selected activity if the user came from another plan
    selectActivity(null, null);
  }

  $: if (
    $plan &&
    $simulationDataset !== null &&
    (getSimulationStatus($simulationDataset) === Status.Complete ||
      getSimulationStatus($simulationDataset) === Status.Complete)
  ) {
    const datasetId = $simulationDataset.dataset_id;
    simulationDataAbortController?.abort();
    simulationDataAbortController = new AbortController();
    effects.getSpans(datasetId, data.user, simulationDataAbortController.signal).then(newSpans => ($spans = newSpans));
  } else {
    simulationDataAbortController?.abort();
    $spans = [];
  }

  $: {
    $activityDirectivesMap =
      $planSnapshotId !== null ? keyBy(planSnapshotActivityDirectives, 'id') : keyBy($activityDirectives, 'id');
  }

  $: if ($plan && $planLocked) {
    planHasBeenLocked = true;
    showPlanLockedModal($plan.id);
  } else if (planHasBeenLocked) {
    closeActiveModal();
    planHasBeenLocked = false;
  }

  $: compactNavMode = windowWidth < 1100;

  $: if ($schedulingAnalysisStatus) {
    let newSchedulingStatusText = '';
    const satisfactionReport = `${$satisfiedSchedulingGoalCount} satisfied, ${
      $schedulingGoalCount - $satisfiedSchedulingGoalCount
    } unsatisfied`;
    if ($schedulingAnalysisStatus === Status.Complete) {
      newSchedulingStatusText = satisfactionReport;
    } else if ($schedulingAnalysisStatus === Status.Failed) {
      if ($latestSchedulingRequest && $latestSchedulingRequest.reason) {
        newSchedulingStatusText = 'Failed to run scheduling';
      } else {
        newSchedulingStatusText = satisfactionReport;
      }
    } else if ($schedulingAnalysisStatus === Status.Modified) {
      newSchedulingStatusText = 'Scheduling out-of-date';
    }
    schedulingStatusText = newSchedulingStatusText;
  }
  $: if ($simulationDatasetLatest) {
    simulationExtent = getSimulationExtent($simulationDatasetLatest);
    selectedSimulationStatus = getSimulationStatus($simulationDatasetLatest);
  }

  $: numConstraintsViolated = Object.values($constraintResponseMap).filter(
    response => response.results.violations?.length,
  ).length;

  $: numConstraintsWithErrors = Object.values($constraintResponseMap).filter(
    response => response.errors?.length,
  ).length;

  onDestroy(() => {
    resetActivityStores();
    resetConstraintStores();
    resetExpansionStores();
    resetPlanStores();
    resetSimulationStores();
    closeActiveModal();
  });

  function clearSnapshot() {
    $planSnapshotId = null;
    $planReadOnly = false;
    $simulationDatasetId = $simulationDatasetLatest?.id ?? -1;
  }

  function onClearAllErrors() {
    clearAllErrors();
  }

  function onClearSchedulingErrors() {
    clearSchedulingErrors();
  }

  function onCloseSnapshotPreview() {
    clearSnapshot();
    removeQueryParam(SearchParameters.SNAPSHOT_ID);
    removeQueryParam(SearchParameters.SIMULATION_DATASET_ID, 'PUSH');
  }

  function onConsoleResize(event: CustomEvent<string>) {
    const { detail } = event;
    consoleHeightString = detail;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      effects.simulate($plan, data.user);
    }
  }

  function onActivityValidationSelected(event: CustomEvent) {
    selectActivity(event.detail?.[0]?.id, null, true, true);
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

  async function onEditView(event: CustomEvent<View>) {
    const { detail: view } = event;
    if (view && hasUpdateViewPermission) {
      const success = await effects.editView(view, data.user);
      if (success) {
        resetOriginalView();
      }
    }
  }

  async function onRestoreSnapshot(event: CustomEvent<PlanSnapshot>) {
    const { detail: planSnapshot } = event;
    if ($plan) {
      const success = await effects.restorePlanSnapshot(planSnapshot, $plan, data.user);

      if (success) {
        clearSnapshot();
      }
    }
  }

  async function onCallExtension(event: CustomEvent<Extension>) {
    const payload = {
      planId: $planId,
      selectedActivityDirectiveId: $selectedActivityDirectiveId,
      simulationDatasetId: $simulationDatasetId,
      url: event.detail.url,
    };

    effects.callExtension(event.detail, payload, data.user);
  }

  async function onSaveView(event: CustomEvent<ViewSaveEvent>) {
    const { detail } = event;
    const { definition, id, name, owner } = detail;
    if (id != null && hasUpdateViewPermission) {
      const success = await effects.updateView(id, { definition, name, owner }, data.user);
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
<CssGrid
  class="plan-container"
  rows={$planSnapshot
    ? `var(--nav-header-height) min-content auto ${consoleHeightString}`
    : `var(--nav-header-height) auto ${consoleHeightString}`}
>
  <Nav user={data.user}>
    <div slot="title">
      <PlanMenu plan={data.initialPlan} user={data.user} />
    </div>
    <svelte:fragment slot="left">
      <PlanMergeRequestsStatusButton user={data.user} />
    </svelte:fragment>
    <svelte:fragment slot="right">
      <ActivityStatusMenu
        activityDirectiveValidationStatuses={$activityDirectiveValidationStatuses}
        {activityErrorCounts}
        {compactNavMode}
        {invalidActivityCount}
        on:viewActivityValidations={() => {
          errorConsole.openConsole(ConsoleTabs.ACTIVITY);
        }}
      />
      <PlanNavButton
        title={!compactNavMode ? 'Expansion' : ''}
        buttonText="Expand Activities"
        hasPermission={hasExpandPermission}
        permissionError={$planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to expand activities'}
        menuTitle="Expansion Status"
        disabled={$selectedExpansionSetId === null}
        status={$planExpansionStatus}
        on:click={() => {
          if ($selectedExpansionSetId != null && $plan) {
            effects.expand($selectedExpansionSetId, $simulationDatasetLatest?.id || -1, $plan, $plan.model, data.user);
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
        permissionError={$planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to run a simulation'}
        status={$simulationStatus}
        progress={$simulationProgress}
        disabled={!$enableSimulation}
        showStatusInMenu={false}
        on:click={() => effects.simulate($plan, data.user)}
      >
        <PlayIcon />
        <svelte:fragment slot="metadata">
          <div class="st-typography-body">
            <div class="simulation-header">
              {getHumanReadableStatus(getSimulationStatus($simulationDatasetLatest))}:
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
          {#if selectedSimulationStatus === Status.Pending || selectedSimulationStatus === Status.Incomplete}
            <button
              on:click={() => effects.cancelSimulation($simulationDatasetId, data.user)}
              class="st-button cancel-button"
              disabled={$planReadOnly}>Cancel</button
            >
          {/if}
        </svelte:fragment>
      </PlanNavButton>
      <PlanNavButton
        title={!compactNavMode ? 'Constraints' : ''}
        menuTitle="Constraint Status"
        buttonText="Check Constraints"
        hasPermission={hasCheckConstraintsPermission}
        disabled={$simulationStatus !== Status.Complete}
        statusBadgeText={($checkConstraintsStatus === Status.Complete || $checkConstraintsStatus === Status.Failed) &&
        numConstraintsViolated + numConstraintsWithErrors + $uncheckedConstraintCount > 0
          ? `${numConstraintsViolated + numConstraintsWithErrors + $uncheckedConstraintCount}`
          : undefined}
        buttonTooltipContent={$simulationStatus !== Status.Complete ? 'Completed simulation required' : ''}
        permissionError={$planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to run a constraint check'}
        status={$constraintsStatus}
        showStatusInMenu={false}
        on:click={() => $plan && effects.checkConstraints($plan, data.user)}
        indeterminate
      >
        <VerticalCollapseIcon />
        <svelte:fragment slot="metadata">
          <div class="st-typography-body constraints-status">
            {#if $checkConstraintsStatus}
              <div class="constraints-status-item">
                <StatusBadge status={$checkConstraintsStatus} indeterminate showTooltip={false} />
                Check constraints: {getHumanReadableStatus($checkConstraintsStatus)}
              </div>
              {#if $checkConstraintsStatus === Status.Complete || $checkConstraintsStatus === Status.Failed}
                <div class="constraints-status-item">
                  <StatusBadge status={$constraintsViolationStatus} showTooltip={false} />
                  {#if numConstraintsViolated > 0}
                    <div style:color="var(--st-error-red)">
                      {numConstraintsViolated} constraint{pluralize(numConstraintsViolated)}
                      {numConstraintsViolated !== 1 ? 'have' : 'has'} violations
                    </div>
                  {:else}
                    No constraint violations
                  {/if}
                </div>
                {#if $simulationStatus !== Status.Complete}
                  <div class="constraints-status-item">
                    <StatusBadge status={Status.Modified} showTooltip={false} />
                    Simulation out-of-date
                  </div>
                {/if}
                {#if numConstraintsWithErrors > 0}
                  <div class="constraints-status-item">
                    <StatusBadge status={Status.Failed} showTooltip={false} />
                    <div style:color="var(--st-error-red)">
                      {numConstraintsWithErrors} constraint{pluralize(numConstraintsWithErrors)}
                      {numConstraintsWithErrors !== 1 ? 'have' : 'has'} compile errors
                    </div>
                  </div>
                {/if}
                {#if $uncheckedConstraintCount > 0}
                  <div class="constraints-status-item">
                    <StatusBadge status={Status.Modified} showTooltip={false} />
                    {$uncheckedConstraintCount} unchecked constraint{pluralize($uncheckedConstraintCount)}
                  </div>
                {/if}
              {/if}
            {:else}
              <div>Constraints not checked</div>
            {/if}
          </div>
        </svelte:fragment>
      </PlanNavButton>
      <PlanNavButton
        title={!compactNavMode ? 'Scheduling' : ''}
        menuTitle="Scheduling Analysis Status"
        buttonText="Analyze Goal Satisfaction"
        disabled={!$enableScheduling}
        hasPermission={hasScheduleAnalysisPermission}
        permissionError={$planReadOnly
          ? PlanStatusMessages.READ_ONLY
          : 'You do not have permission to run a scheduling analysis'}
        status={$schedulingAnalysisStatus}
        statusText={schedulingStatusText}
        on:click={() => effects.schedule(true, $plan, data.user)}
        indeterminate
      >
        <CalendarIcon />
        <svelte:fragment slot="metadata">
          <div class="st-typography-body">
            {#if !$schedulingAnalysisStatus}
              Scheduling analysis not run
            {/if}
          </div>
          {#if $schedulingAnalysisStatus === Status.Pending || $schedulingAnalysisStatus === Status.Incomplete}
            <button
              on:click={() => effects.cancelSchedulingRequest($latestSchedulingRequest.analysis_id, data.user)}
              class="st-button cancel-button"
              disabled={$planReadOnly}>Cancel</button
            >
          {/if}
        </svelte:fragment>
      </PlanNavButton>
      <ExtensionMenu
        extensions={data.extensions}
        title={!compactNavMode ? 'Extensions' : ''}
        user={data.user}
        on:callExtension={onCallExtension}
      />
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
  {#if $planSnapshot}
    <PlanSnapshotBar
      numOfDirectives={planSnapshotActivityDirectives.length}
      snapshot={$planSnapshot}
      on:close={onCloseSnapshotPreview}
      on:restore={onRestoreSnapshot}
    />
  {/if}
  <PlanGrid
    {...$view?.definition.plan.grid}
    user={data.user}
    on:changeColumnSizes={onChangeColumnSizes}
    on:changeLeftRowSizes={onChangeLeftRowSizes}
    on:changeMiddleRowSizes={onChangeMiddleRowSizes}
    on:changeRightRowSizes={onChangeRightRowSizes}
  />

  <Console bind:this={errorConsole} on:resize={onConsoleResize}>
    <svelte:fragment slot="console-tabs">
      <div class="console-tabs">
        <div>
          <ConsoleTab tabId={ConsoleTabs.ALL} numberOfErrors={$allErrors?.length} title="All Errors">All</ConsoleTab>
        </div>
        <div class="separator">|</div>
        <div class="grouped-error-tabs">
          <ConsoleTab
            tabId={ConsoleTabs.ANCHOR}
            numberOfErrors={$anchorValidationErrors?.length}
            title="Anchor Validation Errors"
          >
            <ActivityIcon />
          </ConsoleTab>
          <ConsoleTab
            tabId={ConsoleTabs.SCHEDULING}
            numberOfErrors={$schedulingErrors?.length}
            title="Scheduling Errors"><CalendarIcon /></ConsoleTab
          >
          <ConsoleTab
            tabId={ConsoleTabs.SIMULATION}
            numberOfErrors={$simulationDatasetErrors?.length}
            title="Simulation Errors"
          >
            <GearWideConnectedIcon />
          </ConsoleTab>
          <ConsoleTab
            tabId={ConsoleTabs.ACTIVITY}
            numberOfErrors={activityErrorCounts.all}
            title="Activity Validation Errors"
          >
            <WaterfallIcon />
          </ConsoleTab>
        </div>
      </div>
    </svelte:fragment>

    <ConsoleGenericErrors errors={$allErrors} title="All Errors" on:clearMessages={onClearAllErrors} />
    <ConsoleGenericErrors errors={$anchorValidationErrors} title="Anchor Validation Errors" />
    <ConsoleGenericErrors
      errors={$schedulingErrors}
      title="Scheduling Errors"
      on:clearMessages={onClearSchedulingErrors}
    />
    <ConsoleGenericErrors errors={$simulationDatasetErrors} isClearable={false} title="Simulation Errors" />
    <ConsoleActivityErrors
      activityValidationErrorTotalRollup={activityErrorCounts}
      activityValidationErrorRollups={$activityErrorRollups}
      title="Activity Validation Errors"
      on:selectionChanged={onActivityValidationSelected}
    />
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

  .constraints-status {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .constraints-status-item {
    align-items: center;
    display: flex;
    gap: 8px;
  }
</style>
