<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import { keyBy } from 'lodash-es';
  import { onDestroy, onMount } from 'svelte';
  import ActivityForm from '../../components/activity/ActivityForm.svelte';
  import ActivityTable from '../../components/activity/ActivityTable.svelte';
  import ActivityTypes from '../../components/activity/ActivityTypes.svelte';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import ConstraintEditor from '../../components/constraint/ConstraintEditor.svelte';
  import Constraints from '../../components/constraint/Constraints.svelte';
  import ConstraintViolations from '../../components/constraint/ConstraintViolations.svelte';
  import Expansion from '../../components/expansion/Expansion.svelte';
  import Scheduling from '../../components/scheduling/Scheduling.svelte';
  import SchedulingEditor from '../../components/scheduling/SchedulingEditor.svelte';
  import Simulation from '../../components/simulation/Simulation.svelte';
  import TimelineForm from '../../components/timeline/form/TimelineForm.svelte';
  import Timeline from '../../components/timeline/Timeline.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import IFrame from '../../components/ui/IFrame.svelte';
  import SplitGrid from '../../components/ui/SplitGrid.svelte';
  import ViewEditor from '../../components/view/ViewEditor.svelte';
  import Views from '../../components/view/Views.svelte';
  import { activitiesMap, resetActivityStores } from '../../stores/activities';
  import {
    constraintsTsExtraLibs,
    modelConstraints,
    planConstraints,
    resetConstraintStores,
  } from '../../stores/constraints';
  import {
    maxTimeRange,
    plan,
    planEndTimeMs,
    planStartTimeMs,
    resetPlanStores,
    viewTimeRange,
  } from '../../stores/plan';
  import { resetResourceStores } from '../../stores/resources';
  import { resetSchedulingStores, schedulingStatus, schedulingTsExtraLibs } from '../../stores/scheduling';
  import {
    modelParametersMap,
    resetSimulationStores,
    simulation,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import { view, viewActions, viewLayout } from '../../stores/views';
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
        const initialConstraintsTsExtraLibs = await effects.getConstraintsTsExtraLibs(initialPlan.model.id);
        const initialSchedulingTsExtraLibs = await effects.getSchedulingTsExtraLibs(initialPlan.model.id);
        const initialView = await effects.getView(url.searchParams);

        return {
          props: {
            initialConstraintsTsExtraLibs,
            initialPlan,
            initialSchedulingTsExtraLibs,
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
  export let initialConstraintsTsExtraLibs: TypeScriptExtraLib[];
  export let initialPlan: Plan | null;
  export let initialSchedulingTsExtraLibs: TypeScriptExtraLib[];
  export let initialView: View | null;

  const gridComponentsByName: Record<string, unknown> = {
    ActivityForm,
    ActivityTable,
    ActivityTypes,
    ConstraintEditor,
    ConstraintViolations,
    Constraints,
    Expansion,
    IFrame,
    Scheduling,
    SchedulingEditor,
    Simulation,
    Timeline,
    TimelineForm,
    ViewEditor,
    Views,
  };

  $: if (initialConstraintsTsExtraLibs) {
    $constraintsTsExtraLibs = initialConstraintsTsExtraLibs;
  }

  $: if (initialPlan) {
    $activitiesMap = keyBy(initialPlan.activities, 'id');
    $modelConstraints = initialPlan.model.constraints;
    $modelParametersMap = initialPlan.model.parameters.parameters;
    $plan = initialPlan;
    $planConstraints = initialPlan.constraints;
    $simulation = initialPlan.simulations[0];

    $planEndTimeMs = getUnixEpochTime(initialPlan.endTime);
    $planStartTimeMs = getUnixEpochTime(initialPlan.startTime);
    $maxTimeRange = { end: $planEndTimeMs, start: $planStartTimeMs };
    $viewTimeRange = $maxTimeRange;

    simulationTemplates.setVariables({ modelId: initialPlan.model.id });
  }

  $: if (initialSchedulingTsExtraLibs) {
    $schedulingTsExtraLibs = initialSchedulingTsExtraLibs;
  }

  $: if (initialView) {
    $view = { ...initialView };
    $viewLayout = { ...initialView.plan.layout };
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
    viewActions.updateLayout(gridId, 'columnSizes', newSizes);
  }

  function changeRowSizes(event: CustomEvent<GridChangeSizesEvent>): void {
    const { detail } = event;
    const { gridId, newSizes } = detail;
    viewActions.updateLayout(gridId, 'rowSizes', newSizes);
  }

  function onKeydown(event: KeyboardEvent): void {
    const { key, metaKey } = event;

    if (metaKey && key === 's') {
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
        selected={$view.plan.layout?.gridName === 'Activities'}
        title="Activities"
        on:click={() => viewActions.setLayout('Activities')}
      />
      <NavButton
        icon="bi bi-braces-asterisk"
        selected={$view.plan.layout?.gridName === 'Constraints'}
        title="Constraints"
        on:click={() => viewActions.setLayout('Constraints')}
      />
      <NavButton
        icon="bi bi-calendar3"
        selected={$view.plan.layout?.gridName === 'Scheduling'}
        status={$schedulingStatus}
        title="Scheduling"
        on:click={() => viewActions.setLayout('Scheduling')}
      />
      <NavButton
        icon="bi bi-gear-wide-connected"
        selected={$view.plan.layout?.gridName === 'Simulation'}
        status={$simulationStatus}
        title="Simulation"
        on:click={() => viewActions.setLayout('Simulation')}
      />
      <NavButton
        icon="bi bi-columns"
        selected={$view.plan.layout?.gridName === 'View'}
        title="View"
        on:click={() => viewActions.setLayout('View')}
      />
    </svelte:fragment>
  </Nav>

  <SplitGrid
    grid={$view?.plan.layout}
    {gridComponentsByName}
    on:changeColumnSizes={changeColumnSizes}
    on:changeRowSizes={changeRowSizes}
  />
</CssGrid>
