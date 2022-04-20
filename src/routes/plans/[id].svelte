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
  import ActivityTypes from '../../components/activity/ActivityTypes.svelte';
  import ActivityForm from '../../components/activity/ActivityForm.svelte';
  import ActivityTable from '../../components/activity/ActivityTable.svelte';
  import ConstraintMenu from '../../components/menus/ConstraintMenu.svelte';
  import ViewMenu from '../../components/menus/ViewMenu.svelte';
  import Simulation from '../../components/simulation/Simulation.svelte';
  import Timeline from '../../components/timeline/Timeline.svelte';
  import TimelineForm from '../../components/timeline/form/TimelineForm.svelte';
  import ConstraintEditor from '../../components/constraint/ConstraintEditor.svelte';
  import Constraints from '../../components/constraint/Constraints.svelte';
  import ConstraintViolations from '../../components/constraint/ConstraintViolations.svelte';
  import type Menu from '../../components/menus/Menu.svelte';
  import SchedulingEditor from '../../components/scheduling/SchedulingEditor.svelte';
  import Scheduling from '../../components/scheduling/Scheduling.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import IFrame from '../../components/ui/IFrame.svelte';
  import Split from '../../components/ui/Split.svelte';
  import StatusBadge from '../../components/ui/StatusBadge.svelte';
  import Nav from '../../components/app/Nav.svelte';
  import ViewEditor from '../../components/view/ViewEditor.svelte';
  import Views from '../../components/view/Views.svelte';
  import { activitiesMap, activityActions } from '../../stores/activities';
  import { constraintActions, modelConstraints, planConstraints } from '../../stores/constraints';
  import {
    activityTypesPanel,
    constraintEditorPanel,
    constraintsPanel,
    constraintViolationsPanel,
    panelActions,
    schedulingPanel,
    schedulingPanelEditor,
    selectedActivityPanel,
    selectedTimelinePanel,
    simulationPanel,
    viewEditorPanel,
    viewsPanel,
  } from '../../stores/panels';
  import { maxTimeRange, plan, planActions, planEndTimeMs, planStartTimeMs, viewTimeRange } from '../../stores/plan';
  import { resourceActions } from '../../stores/resources';
  import { schedulingActions, schedulingDslTypes, schedulingStatus } from '../../stores/scheduling';
  import {
    modelParametersMap,
    simulationActions,
    simulation,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import { updateSectionSizes, view, viewSectionIds, viewSectionSizes } from '../../stores/views';
  import { setQueryParam } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';

  export let initialPlan: Plan | null;
  export let initialSchedulingDslTypes: string;
  export let initialView: View | null;

  let constraintMenu: Menu;
  let viewMenu: Menu;

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
    $view = initialView;
  }

  onMount(() => {
    if ($view) {
      setQueryParam('viewId', `${$view.id}`);
    }
  });

  onDestroy(() => {
    activityActions.reset();
    constraintActions.reset();
    panelActions.reset();
    planActions.reset();
    resourceActions.reset();
    schedulingActions.reset();
    simulationActions.reset();
  });

  function onKeydown(event: KeyboardEvent) {
    const { key, metaKey } = event;

    if (metaKey && key === 'e') {
      event.preventDefault();
      viewEditorPanel.show();
    } else if (metaKey && key === 's') {
      event.preventDefault();
      simulationActions.runSimulation();
    }
  }

  function onSectionsDragEnd(event: CustomEvent<{ newSizes: number[] }>) {
    const { detail } = event;
    const { newSizes } = detail;
    updateSectionSizes(newSizes);
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid class="h-100 w-100" rows="42px auto">
  <Nav>
    <span slot="title">{initialPlan.name}</span>
    <div slot="left">
      <StatusBadge status={$simulationStatus} title="Simulation" />
      <StatusBadge status={$schedulingStatus} title="Scheduling" />
    </div>

    <div slot="right">
      <button
        class="st-button icon header-button"
        on:click={() => simulationActions.runSimulation()}
        use:tooltip={{ content: 'Run Simulation', placement: 'bottom' }}
      >
        <i class="bi bi-play-btn" />
      </button>

      <button
        class="st-button icon header-button"
        on:click={() => ($schedulingPanel = !$schedulingPanel)}
        use:tooltip={{ content: 'Scheduling', placement: 'bottom' }}
      >
        <i class="bi bi-calendar2-week" />
      </button>

      <button
        class="st-button icon header-button"
        on:click={() => simulationPanel.show()}
        use:tooltip={{ content: 'Simulation', placement: 'bottom' }}
      >
        <i class="bi bi-sliders" />
      </button>

      <button
        class="st-button icon header-button"
        on:click|stopPropagation={() => constraintMenu.toggle()}
        use:tooltip={{ content: 'Constraints', placement: 'bottom' }}
      >
        <i class="bi bi-code" />
        <ConstraintMenu bind:constraintMenu />
      </button>

      <button
        class="st-button icon header-button"
        on:click|stopPropagation={() => viewMenu.toggle()}
        use:tooltip={{ content: 'Views', placement: 'bottom' }}
      >
        <i class="bi bi-columns" />
        <ViewMenu bind:viewMenu />
      </button>

      <button
        class="st-button icon header-button"
        on:click={() => activityTypesPanel.show()}
        use:tooltip={{ content: 'Activity Types', placement: 'bottom' }}
      >
        <i class="bi bi-book" />
      </button>
    </div>
  </Nav>

  <Split
    let:initialized={horizontalSplitInitialized}
    direction="horizontal"
    ids={$schedulingPanel ? ['#left-panel', '#sections', '#right-panel'] : ['#sections', '#right-panel']}
    sizes={$schedulingPanel ? [20, 60, 20] : [75, 25]}
  >
    {#if $schedulingPanel}
      <Split
        id="left-panel"
        ids={$schedulingPanelEditor ? ['#top', '#bottom'] : ['#top']}
        sizes={$schedulingPanelEditor ? [40, 60] : [100, 0]}
      >
        <div id="top">
          <Scheduling />
        </div>
        {#if $schedulingPanelEditor}
          <div id="bottom">
            <SchedulingEditor />
          </div>
        {/if}
      </Split>
    {/if}

    <Split
      let:initialized={verticalSplitInitialized}
      id="sections"
      ids={$viewSectionIds}
      sizes={$viewSectionSizes}
      on:dragEnd={onSectionsDragEnd}
    >
      {#each $view.plan.sections as section, i (section.id)}
        <div class="section" id={`section-${section.id}`}>
          {#if horizontalSplitInitialized && verticalSplitInitialized}
            {#if section.iframe}
              <IFrame src={section.iframe.src} title="iframe-{section.id}" />
            {:else if section.table}
              <ActivityTable />
            {:else if section.timeline}
              <Timeline
                containerSize={$viewSectionSizes[i]}
                id={section.timeline.id}
                marginLeft={section.timeline.marginLeft ?? 50}
                marginRight={section.timeline.marginRight ?? 20}
                rows={section.timeline.rows}
                verticalGuides={section.timeline.verticalGuides}
              />
            {/if}
          {/if}
        </div>
      {/each}
    </Split>

    <div id="right-panel">
      {#if horizontalSplitInitialized}
        {#if $activityTypesPanel.visible}
          <ActivityTypes />
        {:else if $constraintEditorPanel.visible}
          <ConstraintEditor />
        {:else if $constraintsPanel.visible}
          <Constraints />
        {:else if $constraintViolationsPanel.visible}
          <ConstraintViolations />
        {:else if $selectedActivityPanel.visible}
          <ActivityForm />
        {:else if $selectedTimelinePanel.visible}
          <TimelineForm />
        {:else if $simulationPanel.visible}
          <Simulation />
        {:else if $viewEditorPanel.visible}
          <ViewEditor />
        {:else if $viewsPanel.visible}
          <Views />
        {/if}
      {/if}
    </div>
  </Split>
</CssGrid>

<style>
  .header-button {
    color: var(--st-gray-20);
    font-size: 1.4rem;
    margin-left: 0.5rem;
    position: relative;
  }

  .header-button:hover {
    background-color: transparent;
    color: var(--st-white);
  }

  #left-panel,
  #right-panel,
  #top {
    overflow-y: scroll;
  }

  .section {
    overflow-x: hidden;
    overflow-y: scroll;
  }
</style>
