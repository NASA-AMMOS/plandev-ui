<svelte:options immutable={true} />

<script lang="ts">
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import BracesAsteriskIcon from 'bootstrap-icons/icons/braces-asterisk.svg?component';
  import ColumnsIcon from 'bootstrap-icons/icons/columns.svg?component';
  import GearWideConnectedIcon from 'bootstrap-icons/icons/gear-wide-connected.svg?component';
  import { keyBy } from 'lodash-es';
  import { onDestroy, onMount } from 'svelte';
  import ActivityFormPanel from '../../../components/activity/ActivityFormPanel.svelte';
  import ActivityTablePanel from '../../../components/activity/ActivityTablePanel.svelte';
  import ActivityTypesPanel from '../../../components/activity/ActivityTypesPanel.svelte';
  import Nav from '../../../components/app/Nav.svelte';
  import NavButton from '../../../components/app/NavButton.svelte';
  import ConstraintsPanel from '../../../components/constraints/ConstraintsPanel.svelte';
  import ConstraintViolationsPanel from '../../../components/constraints/ConstraintViolationsPanel.svelte';
  import ExpansionPanel from '../../../components/expansion/ExpansionPanel.svelte';
  import SchedulingPanel from '../../../components/scheduling/SchedulingPanel.svelte';
  import SimulationPanel from '../../../components/simulation/SimulationPanel.svelte';
  import TimelineFormPanel from '../../../components/timeline/form/TimelineFormPanel.svelte';
  import TimelinePanel from '../../../components/timeline/TimelinePanel.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import IFrame from '../../../components/ui/IFrame.svelte';
  import SplitGrid from '../../../components/ui/SplitGrid.svelte';
  import ViewEditorPanel from '../../../components/view/ViewEditorPanel.svelte';
  import ViewsPanel from '../../../components/view/ViewsPanel.svelte';
  import { activitiesMap, resetActivityStores } from '../../../stores/activities';
  import { checkConstraintsStatus, resetConstraintStores } from '../../../stores/constraints';
  import {
    maxTimeRange,
    plan,
    planEndTimeMs,
    planStartTimeMs,
    resetPlanStores,
    viewTimeRange,
  } from '../../../stores/plan';
  import { resetResourceStores } from '../../../stores/resources';
  import { resetSchedulingStores, schedulingStatus } from '../../../stores/scheduling';
  import { modelParametersMap, resetSimulationStores, simulation, simulationStatus } from '../../../stores/simulation';
  import { view, viewLayout, viewSetLayout, viewUpdateLayout } from '../../../stores/views';
  import effects from '../../../utilities/effects';
  import { setQueryParam } from '../../../utilities/generic';
  import { getUnixEpochTime } from '../../../utilities/time';
  import type { PageData } from './$types';

  export let data: PageData;

  const gridComponentsByName: Record<string, unknown> = {
    ActivityFormPanel,
    ActivityTablePanel,
    ActivityTypesPanel,
    ConstraintViolationsPanel,
    ConstraintsPanel,
    ExpansionPanel,
    IFrame,
    SchedulingPanel,
    SimulationPanel,
    TimelineFormPanel,
    TimelinePanel,
    ViewEditorPanel,
    ViewsPanel,
  };

  $: if (data.initialPlan) {
    $activitiesMap = keyBy(data.initialPlan.activities, 'id');
    $modelParametersMap = data.initialPlan.model.parameters.parameters;
    $plan = data.initialPlan;
    simulation.updateValue(() => data.initialPlan.simulations[0]);

    $planEndTimeMs = getUnixEpochTime(data.initialPlan.end_time);
    $planStartTimeMs = getUnixEpochTime(data.initialPlan.start_time);
    $maxTimeRange = { end: $planEndTimeMs, start: $planStartTimeMs };
    $viewTimeRange = $maxTimeRange;
  }

  $: if (data.initialView) {
    $view = { ...data.initialView };
    $viewLayout = { ...data.initialView.definition.plan.layout };
  }

  onMount(() => {
    if ($view) {
      setQueryParam('viewId', `${$view.id}`);
    }
  });

  onDestroy(() => {
    resetActivityStores();
    resetConstraintStores();
    resetPlanStores();
    resetResourceStores();
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

  function onKeydown(event: KeyboardEvent): void {
    const { key, ctrlKey, metaKey } = event;
    if ((window.navigator.platform.match(/mac/i) ? metaKey : ctrlKey) && key === 's') {
      event.preventDefault();
      effects.simulate();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span class="plan-title" slot="title">{data.initialPlan.name}</span>

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
        status={$checkConstraintsStatus}
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
      <NavButton
        selected={$view.definition.plan.layout?.gridName === 'View'}
        title="View"
        on:click={() => viewSetLayout('View')}
      >
        <ColumnsIcon />
      </NavButton>
    </svelte:fragment>
  </Nav>

  <SplitGrid
    grid={$view?.definition.plan.layout}
    {gridComponentsByName}
    on:changeColumnSizes={changeColumnSizes}
    on:changeRowSizes={changeRowSizes}
  />
</CssGrid>
