<svelte:options immutable={true} />

<script lang="ts">
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import BracesAsteriskIcon from 'bootstrap-icons/icons/braces-asterisk.svg?component';
  import ColumnsIcon from 'bootstrap-icons/icons/columns.svg?component';
  import GearWideConnectedIcon from 'bootstrap-icons/icons/gear-wide-connected.svg?component';
  import { onDestroy } from 'svelte';
  import ActivityFormPanel from '../../../components/activity/ActivityFormPanel.svelte';
  import ActivityTablePanel from '../../../components/activity/ActivityTablePanel.svelte';
  import ActivityTypesPanel from '../../../components/activity/ActivityTypesPanel.svelte';
  import Nav from '../../../components/app/Nav.svelte';
  import NavButton from '../../../components/app/NavButton.svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Console from '../../../components/console/Console.svelte';
  import ConsoleSection from '../../../components/console/ConsoleSection.svelte';
  import ConsoleTab from '../../../components/console/ConsoleTab.svelte';
  import ConstraintsPanel from '../../../components/constraints/ConstraintsPanel.svelte';
  import ConstraintViolationsPanel from '../../../components/constraints/ConstraintViolationsPanel.svelte';
  import ExpansionPanel from '../../../components/expansion/ExpansionPanel.svelte';
  import PlanMenu from '../../../components/menus/PlanMenu.svelte';
  import ViewMenu from '../../../components/menus/ViewMenu.svelte';
  import PlanMergeRequestsStatusButton from '../../../components/plan/PlanMergeRequestsStatusButton.svelte';
  import SchedulingConditionsPanel from '../../../components/scheduling/SchedulingConditionsPanel.svelte';
  import SchedulingGoalsPanel from '../../../components/scheduling/SchedulingGoalsPanel.svelte';
  import SimulationPanel from '../../../components/simulation/SimulationPanel.svelte';
  import TimelineEditorPanel from '../../../components/timeline/form/TimelineEditorPanel.svelte';
  import TimelineFormPanel from '../../../components/timeline/form/TimelineFormPanel.svelte';
  import TimelinePanel from '../../../components/timeline/TimelinePanel.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import IFramePanel from '../../../components/ui/IFramePanel.svelte';
  import SplitGrid from '../../../components/ui/SplitGrid.svelte';
  import ViewEditorPanel from '../../../components/view/ViewEditorPanel.svelte';
  import ViewsPanel from '../../../components/view/ViewsPanel.svelte';
  import { activitiesMap, activityDirectives, resetActivityStores } from '../../../stores/activities';
  import { resetConstraintStores } from '../../../stores/constraints';
  import {
    allErrors,
    clearAllErrors,
    clearSchedulingErrors,
    schedulingErrors,
    simulationDatasetErrors,
  } from '../../../stores/errors';
  import {
    activityTypes,
    maxTimeRange,
    plan,
    planEndTimeMs,
    planLocked,
    planStartTimeMs,
    resetPlanStores,
    viewTimeRange,
  } from '../../../stores/plan';
  import { resetSchedulingStores, schedulingStatus } from '../../../stores/scheduling';
  import {
    externalResources,
    resetSimulationStores,
    resources,
    simulationDataset,
    simulationDatasetId,
    simulationStatus,
    spans,
  } from '../../../stores/simulation';
  import { view, viewSetLayout, viewUpdateLayout } from '../../../stores/views';
  import type { GridChangeSizesEvent } from '../../../types/grid';
  import { createActivitiesMap } from '../../../utilities/activities';
  import effects from '../../../utilities/effects';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import { closeActiveModal, showPlanLockedModal } from '../../../utilities/modal';
  import { getUnixEpochTime } from '../../../utilities/time';
  import type { PageData } from './$types';

  export let data: PageData;

  const gridComponentsByName: Record<string, any> = {
    ActivityFormPanel,
    ActivityTablePanel,
    ActivityTypesPanel,
    ConstraintViolationsPanel,
    ConstraintsPanel,
    ExpansionPanel,
    IFramePanel,
    SchedulingConditionsPanel,
    SchedulingGoalsPanel,
    SimulationPanel,
    TimelineEditorPanel,
    TimelineFormPanel,
    TimelinePanel,
    ViewEditorPanel,
    ViewsPanel,
  };

  let planHasBeenLocked = false;

  $: if (data.initialPlan) {
    $plan = data.initialPlan;
    $planEndTimeMs = getUnixEpochTime(data.initialPlan.end_time_doy);
    $planStartTimeMs = getUnixEpochTime(data.initialPlan.start_time_doy);
    $maxTimeRange = { end: $planEndTimeMs, start: $planStartTimeMs };
    $simulationDatasetId = data.initialPlan.simulations[0]?.simulation_datasets[0]?.id ?? -1;
    $viewTimeRange = $maxTimeRange;
    activityTypes.updateValue(() => data.initialActivityTypes);
  }

  $: if (data.initialView) {
    $view = { ...data.initialView };
  }

  $: if ($plan) {
    effects
      .getResourcesExternal($plan.id, $plan.start_time, $plan.duration)
      .then(newResources => ($externalResources = newResources));
  }

  $: if ($plan && $simulationDataset !== undefined) {
    if ($simulationDataset !== null) {
      const datasetId = $simulationDataset.dataset_id;
      effects
        .getResources(datasetId, $plan.start_time, $plan.duration)
        .then(newResources => ($resources = newResources));
      effects.getSpans(datasetId).then(newSpans => ($spans = newSpans));
    } else {
      $resources = [];
      $spans = [];
    }
  }

  $: $activitiesMap = createActivitiesMap($plan, $activityDirectives, $spans);

  $: if ($planLocked) {
    planHasBeenLocked = true;
    showPlanLockedModal($plan.id);
  } else if (planHasBeenLocked) {
    closeActiveModal();
    planHasBeenLocked = false;
  }

  onDestroy(() => {
    resetActivityStores();
    resetConstraintStores();
    resetPlanStores();
    resetSchedulingStores();
    resetSimulationStores();
  });

  function changeColumnSizes(event: CustomEvent<GridChangeSizesEvent>): void {
    const { detail } = event;
    const { gridId, newSizes } = detail;
    viewUpdateLayout(gridId, { columnSizes: newSizes });
  }

  function changeRowSizes(event: CustomEvent<GridChangeSizesEvent>): void {
    const { detail } = event;
    const { gridId, newSizes } = detail;
    viewUpdateLayout(gridId, { rowSizes: newSizes });
  }

  function onClearAllErrors() {
    clearAllErrors();
  }

  function onClearSchedulingErrors() {
    clearSchedulingErrors();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      effects.simulate();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={data.initialPlan.name} title="Plans" />

<CssGrid class="plan-container" rows="var(--nav-header-height) auto 36px">
  <Nav>
    <div slot="title">
      <PlanMenu plan={data.initialPlan} />
    </div>
    <svelte:fragment slot="left">
      <PlanMergeRequestsStatusButton />
    </svelte:fragment>
    <svelte:fragment slot="right">
      <NavButton
        selected={$view.definition.plan.layout?.gridName === 'Activities'}
        title="Activities"
        on:click={() => viewSetLayout('Activities')}
      >
        <ActivityIcon />
      </NavButton>
      <NavButton
        selected={$view.definition.plan.layout?.gridName === 'Constraints'}
        title="Constraints"
        on:click={() => viewSetLayout('Constraints')}
      >
        <BracesAsteriskIcon />
      </NavButton>
      <NavButton
        selected={$view.definition.plan.layout?.gridName === 'Scheduling'}
        status={$schedulingStatus}
        title="Scheduling"
        on:click={() => viewSetLayout('Scheduling')}
      >
        <CalendarIcon />
      </NavButton>
      <NavButton
        selected={$view.definition.plan.layout?.gridName === 'Simulation'}
        status={$simulationStatus}
        title="Simulation"
        on:click={() => viewSetLayout('Simulation')}
      >
        <GearWideConnectedIcon />
      </NavButton>
      <NavButton title="View">
        <ColumnsIcon />
        <ViewMenu slot="menu" />
      </NavButton>
    </svelte:fragment>
  </Nav>

  <SplitGrid
    grid={$view?.definition.plan.layout}
    {gridComponentsByName}
    on:changeColumnSizes={changeColumnSizes}
    on:changeRowSizes={changeRowSizes}
  />
  <Console>
    <svelte:fragment slot="console-tabs">
      <div class="console-tabs">
        <div>
          <ConsoleTab numberOfErrors={$allErrors?.length} title="All Errors">All</ConsoleTab>
        </div>
        <div class="separator">|</div>
        <div class="grouped-error-tabs">
          <ConsoleTab numberOfErrors={$schedulingErrors?.length} title="Scheduling Errors"><CalendarIcon /></ConsoleTab>
          <ConsoleTab numberOfErrors={$simulationDatasetErrors?.length} title="Simulation Errors">
            <GearWideConnectedIcon />
          </ConsoleTab>
        </div>
      </div>
    </svelte:fragment>

    <ConsoleSection errors={$allErrors} title="All Errors" on:clearMessages={onClearAllErrors} />
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
</style>
