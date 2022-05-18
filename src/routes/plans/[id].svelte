<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';

  export const load: Load = async ({ params, session, url }) => {
    if (!session.user) {
      return {
        redirect: '/login',
        status: 302,
      };
    }

    const { id } = params;
    const planId = parseFloat(id);

    const initialPlan = await req.getPlan(planId);
    const initialConstraintsTsExtraLibs = await req.getConstraintsTsExtraLibs(initialPlan.model.id);
    const initialSchedulingTsExtraLibs = await req.getSchedulingTsExtraLibs(initialPlan.model.id);
    const initialView = await req.getView(url.searchParams);

    return {
      props: {
        initialConstraintsTsExtraLibs,
        initialPlan,
        initialSchedulingTsExtraLibs,
        initialView,
      },
    };
  };
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { keyBy } from 'lodash-es';
  import ActivityForm from '../../components/activity/ActivityForm.svelte';
  import ActivityTable from '../../components/activity/ActivityTable.svelte';
  import ActivityTypes from '../../components/activity/ActivityTypes.svelte';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import ConstraintEditor from '../../components/constraint/ConstraintEditor.svelte';
  import Constraints from '../../components/constraint/Constraints.svelte';
  import ConstraintViolations from '../../components/constraint/ConstraintViolations.svelte';
  import SchedulingEditor from '../../components/scheduling/SchedulingEditor.svelte';
  import Scheduling from '../../components/scheduling/Scheduling.svelte';
  import Simulation from '../../components/simulation/Simulation.svelte';
  import Timeline from '../../components/timeline/Timeline.svelte';
  import TimelineForm from '../../components/timeline/form/TimelineForm.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import IFrame from '../../components/ui/IFrame.svelte';
  import SplitGrid from '../../components/ui/SplitGrid.svelte';
  import ViewEditor from '../../components/view/ViewEditor.svelte';
  import Views from '../../components/view/Views.svelte';
  import { activitiesMap, activityActions } from '../../stores/activities';
  import {
    constraintActions,
    constraintsTsExtraLibs,
    modelConstraints,
    planConstraints,
  } from '../../stores/constraints';
  import { maxTimeRange, plan, planActions, planEndTimeMs, planStartTimeMs, viewTimeRange } from '../../stores/plan';
  import { resourceActions } from '../../stores/resources';
  import { schedulingActions, schedulingStatus, schedulingTsExtraLibs } from '../../stores/scheduling';
  import {
    modelParametersMap,
    simulationActions,
    simulation,
    simulationTemplates,
    simulationStatus,
  } from '../../stores/simulation';
  import { viewActions, view, viewLayout } from '../../stores/views';
  import { setQueryParam } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { getUnixEpochTime } from '../../utilities/time';

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
    activityActions.reset();
    constraintActions.reset();
    planActions.reset();
    resourceActions.reset();
    schedulingActions.reset();
    simulationActions.reset();
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
      simulationActions.runSimulation();
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
