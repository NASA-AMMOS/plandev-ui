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
    const initialSchedulingDslTypes = await req.getSchedulingDslTypes(initialPlan.model.id);
    const initialView = await req.getView(url.searchParams);

    return {
      props: {
        initialPlan,
        initialSchedulingDslTypes,
        initialView,
      },
    };
  };
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { keyBy } from 'lodash-es';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Grid from '../../components/app/Grid.svelte';
  import { activitiesMap, activityActions } from '../../stores/activities';
  import { constraintActions, modelConstraints, planConstraints } from '../../stores/constraints';
  import { maxTimeRange, plan, planActions, planEndTimeMs, planStartTimeMs, viewTimeRange } from '../../stores/plan';
  import { resourceActions } from '../../stores/resources';
  import { schedulingActions, schedulingDslTypes, schedulingStatus } from '../../stores/scheduling';
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

  export let initialPlan: Plan | null;
  export let initialSchedulingDslTypes: string;
  export let initialView: View | null;

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

  $: if (initialSchedulingDslTypes) {
    $schedulingDslTypes = initialSchedulingDslTypes;
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

  function onKeydown(event: KeyboardEvent) {
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

  <Grid grid={$view?.plan.layout} />
</CssGrid>
