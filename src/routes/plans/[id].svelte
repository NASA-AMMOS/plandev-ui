<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import { keyBy } from 'lodash-es';
  import { onDestroy, onMount } from 'svelte';
  import ActivityFormPanel from '../../components/activity/ActivityFormPanel.svelte';
  import ActivityTable from '../../components/activity/ActivityTable.svelte';
  import ActivityTypesPanel from '../../components/activity/ActivityTypesPanel.svelte';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import ConstraintsPanel from '../../components/constraints/ConstraintsPanel.svelte';
  import ConstraintViolationsPanel from '../../components/constraints/ConstraintViolationsPanel.svelte';
  import ExpansionPanel from '../../components/expansion/ExpansionPanel.svelte';
  import SchedulingPanel from '../../components/scheduling/SchedulingPanel.svelte';
  import SimulationPanel from '../../components/simulation/SimulationPanel.svelte';
  import TimelineFormPanel from '../../components/timeline/form/TimelineFormPanel.svelte';
  import Timeline from '../../components/timeline/Timeline.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import IFrame from '../../components/ui/IFrame.svelte';
  import SplitGrid from '../../components/ui/SplitGrid.svelte';
  import ViewEditorPanel from '../../components/view/ViewEditorPanel.svelte';
  import ViewsPanel from '../../components/view/ViewsPanel.svelte';
  import { activitiesMap, resetActivityStores } from '../../stores/activities';
  import { checkConstraintsStatus, resetConstraintStores } from '../../stores/constraints';
  import {
    maxTimeRange,
    plan,
    planEndTimeMs,
    planStartTimeMs,
    resetPlanStores,
    viewTimeRange,
  } from '../../stores/plan';
  import { resetResourceStores } from '../../stores/resources';
  import { resetSchedulingStores, schedulingStatus } from '../../stores/scheduling';
  import {
    modelParametersMap,
    resetSimulationStores,
    simulation,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import { view, viewLayout, viewSetLayout, viewUpdateLayout } from '../../stores/views';
  import effects from '../../utilities/effects';
  import { setQueryParam } from '../../utilities/generic';
  import { getUnixEpochTime } from '../../utilities/time';

  export const load: Load = async ({ params, session, url }) => {
    if (!session.user) {
      return {
        redirect: '/login',
        status: 302,
      };
    }

    const { id } = params;
    const planId = parseFloat(id);

    if (!Number.isNaN(planId)) {
      const initialPlan = await effects.getPlan(planId);

      if (initialPlan) {
        const initialView = await effects.getView(session.user.id, url.searchParams);

        return {
          props: {
            initialPlan,
            initialView,
          },
        };
      }
    }

    return {
      redirect: '/plans',
      status: 302,
    };
  };
</script>

<script lang="ts">
  export let initialPlan: Plan | null;
  export let initialView: View | null;

  const gridComponentsByName: Record<string, unknown> = {
    ActivityFormPanel,
    ActivityTable,
    ActivityTypesPanel,
    ConstraintViolationsPanel,
    ConstraintsPanel,
    ExpansionPanel,
    IFrame,
    SchedulingPanel,
    SimulationPanel,
    Timeline,
    TimelineFormPanel,
    ViewEditorPanel,
    ViewsPanel,
  };

  $: if (initialPlan) {
    $activitiesMap = keyBy(initialPlan.activities, 'id');
    $modelParametersMap = initialPlan.model.parameters.parameters;
    $plan = initialPlan;
    simulation.updateValue(() => initialPlan.simulations[0]);

    $planEndTimeMs = getUnixEpochTime(initialPlan.end_time);
    $planStartTimeMs = getUnixEpochTime(initialPlan.start_time);
    $maxTimeRange = { end: $planEndTimeMs, start: $planStartTimeMs };
    $viewTimeRange = $maxTimeRange;

    simulation.setVariables({ planId: initialPlan.id });
    simulationTemplates.setVariables({ modelId: initialPlan.model.id });
  }

  $: if (initialView) {
    $view = { ...initialView };
    $viewLayout = { ...initialView.definition.plan.layout };
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
    viewUpdateLayout(gridId, 'columnSizes', newSizes);
  }

  function changeRowSizes(event: CustomEvent<GridChangeSizesEvent>): void {
    const { detail } = event;
    const { gridId, newSizes } = detail;
    viewUpdateLayout(gridId, 'rowSizes', newSizes);
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key, ctrlKey, metaKey } = event;
    // `navigator.platform` is marked as deprecated, but the alternative `navigator.userAgentData.platform` is not yet widely available.
    // If this shows up as a hint in the check, it is safe to ignore
    if ((window.navigator.platform.match(/mac/i) ? metaKey : ctrlKey) && key === 's') {
      event.preventDefault();
      effects.simulate();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span class="plan-title" slot="title">{initialPlan.name}</span>

    <svelte:fragment slot="right">
      <NavButton
        icon="si si-activity"
        selected={$view.definition.plan.layout?.gridName === 'Activities'}
        title="Activities"
        on:click={() => viewSetLayout('Activities')}
      />
      <NavButton
        icon="bi bi-braces-asterisk"
        selected={$view.definition.plan.layout?.gridName === 'Constraints'}
        status={$checkConstraintsStatus}
        title="Constraints"
        on:click={() => viewSetLayout('Constraints')}
      />
      <NavButton
        icon="bi bi-calendar3"
        selected={$view.definition.plan.layout?.gridName === 'Scheduling'}
        status={$schedulingStatus}
        title="Scheduling"
        on:click={() => viewSetLayout('Scheduling')}
      />
      <NavButton
        icon="bi bi-gear-wide-connected"
        selected={$view.definition.plan.layout?.gridName === 'Simulation'}
        status={$simulationStatus}
        title="Simulation"
        on:click={() => viewSetLayout('Simulation')}
      />
      <NavButton
        icon="bi bi-columns"
        selected={$view.definition.plan.layout?.gridName === 'View'}
        title="View"
        on:click={() => viewSetLayout('View')}
      />
    </svelte:fragment>
  </Nav>

  <SplitGrid
    grid={$view?.definition.plan.layout}
    {gridComponentsByName}
    on:changeColumnSizes={changeColumnSizes}
    on:changeRowSizes={changeRowSizes}
  />
</CssGrid>
