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
    const initialView = await req.getView(url.searchParams);

    return {
      props: {
        initialPlan,
        initialView,
      },
    };
  };
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { keyBy } from 'lodash-es';
  import ActivityDictionary from '../../components/activity/ActivityDictionary.svelte';
  import ActivityForm from '../../components/activity/ActivityForm.svelte';
  import ConstraintMenu from '../../components/menus/ConstraintMenu.svelte';
  import ViewMenu from '../../components/menus/ViewMenu.svelte';
  import SimulationConfiguration from '../../components/simulation/SimulationConfiguration.svelte';
  import Timeline from '../../components/timeline/Timeline.svelte';
  import TimelineForm from '../../components/timeline/form/TimelineForm.svelte';
  import ConstraintEditor from '../../components/constraint/ConstraintEditor.svelte';
  import ConstraintList from '../../components/constraint/ConstraintList.svelte';
  import ConstraintViolations from '../../components/constraint/ConstraintViolations.svelte';
  import type Menu from '../../components/menus/Menu.svelte';
  import SchedulingGoalEditor from '../../components/scheduling/SchedulingGoalEditor.svelte';
  import SchedulingGoalList from '../../components/scheduling/SchedulingGoalList.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Split from '../../components/ui/Split.svelte';
  import StatusBadge from '../../components/ui/StatusBadge.svelte';
  import Table from '../../components/ui/Table.svelte';
  import TopBar from '../../components/ui/TopBar.svelte';
  import ViewEditor from '../../components/view/ViewEditor.svelte';
  import ViewManager from '../../components/view/ViewManager.svelte';
  import {
    activities,
    activitiesMap,
    selectActivity,
    selectedActivityId,
    selectedActivity,
  } from '../../stores/activities';
  import {
    modelConstraints,
    planConstraints,
    violations,
  } from '../../stores/constraints';
  import {
    activityDictionaryPanel,
    constraintEditorPanel,
    constraintListPanel,
    constraintViolationsPanel,
    schedulingPanel,
    schedulingPanelEditor,
    selectedActivityPanel,
    selectedTimelinePanel,
    simulationConfigurationPanel,
    viewEditorPanel,
    viewManagerPanel,
  } from '../../stores/panels';
  import {
    maxTimeRange,
    plan,
    planEndTimeMs,
    planStartTimeMs,
    viewTimeRange,
  } from '../../stores/plan';
  import { resources } from '../../stores/resources';
  import { schedulingStatus } from '../../stores/scheduling';
  import {
    modelParametersMap,
    runSimulation,
    simulation,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import {
    updateSectionSizes,
    view,
    viewSectionIds,
    viewSectionSizes,
  } from '../../stores/views';
  import { Status } from '../../utilities/enums';
  import { setQueryParam } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';

  export let initialPlan: Plan | null;
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

  $: if (initialView) {
    $view = initialView;
  }

  onMount(() => {
    if ($view) {
      setQueryParam('viewId', `${$view.id}`);
    }
  });

  onDestroy(() => {
    activityDictionaryPanel.show();
    simulationStatus.update(Status.Clean);
    $activitiesMap = {};
    $modelConstraints = [];
    $modelParametersMap = {};
    $planConstraints = [];
    $resources = [];
    $schedulingStatus = Status.Clean;
    $selectedActivityId = null;
    $simulation = null;
    $violations = [];
  });

  function onKeydown(event: KeyboardEvent) {
    const { key, metaKey } = event;

    if (metaKey && key === 'e') {
      event.preventDefault();
      viewEditorPanel.show();
    } else if (metaKey && key === 's') {
      event.preventDefault();
      runSimulation($plan);
    }
  }

  function onSectionsDragEnd(event: CustomEvent<{ newSizes: number[] }>) {
    const { detail } = event;
    const { newSizes } = detail;
    updateSectionSizes(newSizes);
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid rows="32px auto">
  <TopBar>
    <div class="header-left">
      Plan: {initialPlan.name}
      <StatusBadge status={$simulationStatus} title="Simulation" />
      <StatusBadge status={$schedulingStatus} title="Scheduling" />
    </div>
    <div>
      <button
        class="st-button icon header-button"
        on:click={() => runSimulation($plan)}
        use:tooltip={{
          content: 'Run Simulation',
          placement: 'bottom',
        }}
      >
        <i class="bi bi-play-btn" />
      </button>

      <button
        class="st-button icon header-button"
        on:click={() => ($schedulingPanel = !$schedulingPanel)}
        use:tooltip={{
          content: 'Scheduling',
          placement: 'bottom',
        }}
      >
        <i class="bi bi-calendar2-week" />
      </button>

      <button
        class="st-button icon header-button"
        on:click={() => simulationConfigurationPanel.show()}
        use:tooltip={{
          content: 'Simulation Configuration',
          placement: 'bottom',
        }}
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
        on:click={() => activityDictionaryPanel.show()}
        use:tooltip={{
          content: 'Activity Dictionary',
          placement: 'bottom',
        }}
      >
        <i class="bi bi-book" />
      </button>
    </div>
  </TopBar>

  <Split
    let:initialized={horizontalSplitInitialized}
    direction="horizontal"
    ids={$schedulingPanel
      ? ['#left-panel', '#sections', '#right-panel']
      : ['#sections', '#right-panel']}
    sizes={$schedulingPanel ? [20, 60, 20] : [75, 25]}
  >
    {#if $schedulingPanel}
      <Split
        id="left-panel"
        ids={$schedulingPanelEditor ? ['#top', '#bottom'] : ['#top']}
        sizes={$schedulingPanelEditor ? [40, 60] : [100, 0]}
      >
        <div id="top">
          <SchedulingGoalList />
        </div>
        {#if $schedulingPanelEditor}
          <div id="bottom">
            <SchedulingGoalEditor />
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
              <iframe
                allow="fullscreen"
                class="h-100 w-100 border-0"
                src={section.iframe.src}
                title="iframe-{section.id}"
              />
            {:else if section.table}
              <Table
                columnDefs={[
                  { field: 'id', name: 'ID', sortable: true },
                  { field: 'type', name: 'Type', sortable: true },
                  { field: 'startTime', name: 'Start Time', sortable: true },
                  { field: 'duration', name: 'Duration', sortable: true },
                ]}
                rowData={$activities}
                rowSelectionMode="single"
                selectedRowId={$selectedActivityId}
                on:rowClick={({ detail }) => selectActivity(detail.id)}
              />
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
        {#if $activityDictionaryPanel.visible}
          <ActivityDictionary />
        {:else if $constraintEditorPanel.visible}
          <ConstraintEditor />
        {:else if $constraintListPanel.visible}
          <ConstraintList />
        {:else if $constraintViolationsPanel.visible}
          <ConstraintViolations />
        {:else if $selectedActivityPanel.visible}
          {#if $selectedActivity}
            <ActivityForm
              activitiesMap={$activitiesMap}
              activityTypes={initialPlan.model.activityTypes}
              argumentsMap={$selectedActivity.arguments}
              modelId={initialPlan.model.id}
              {...$selectedActivity}
            />
          {:else}
            <div class="p-1">No Activity Selected</div>
          {/if}
        {:else if $selectedTimelinePanel.visible}
          <TimelineForm />
        {:else if $simulationConfigurationPanel.visible}
          <SimulationConfiguration modelId={initialPlan.model.id} />
        {:else if $viewEditorPanel.visible}
          <ViewEditor />
        {:else if $viewManagerPanel.visible}
          <ViewManager />
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

  .header-left {
    display: grid;
    grid-auto-flow: column;
    gap: 0.5rem;
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
