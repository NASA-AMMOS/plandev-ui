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
  import Timeline from '../../components/timeline/Timeline.svelte';
  import SaveAsViewModal from '../../components/modals/SaveAsView.svelte';
  import ConstraintMenu from '../../components/menus/Constraint.svelte';
  import ViewMenu from '../../components/menus/View.svelte';
  import SimulationConfiguration from '../../components/simulation/SimulationConfiguration.svelte';
  import TimelineForm from '../../components/timeline/form/TimelineForm.svelte';
  import ConstraintEditor from '../../components/constraint/ConstraintEditor.svelte';
  import ConstraintList from '../../components/constraint/ConstraintList.svelte';
  import ConstraintViolations from '../../components/constraint/ConstraintViolations.svelte';
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
    createActivity,
    deleteActivity,
    updateActivity,
  } from '../../stores/activities';
  import {
    modelConstraints,
    planConstraints,
    selectedConstraint,
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
    simulation,
    simulationStatus,
    simulationTemplates,
  } from '../../stores/simulation';
  import {
    createView,
    setSelectedTimeline,
    updateRow,
    updateSectionSizes,
    updateTimeline,
    updateView,
    view,
    viewSectionIds,
    viewSectionSizes,
  } from '../../stores/views';
  import { Status } from '../../utilities/enums';
  import { setQueryParam, sleep } from '../../utilities/generic';
  import req from '../../utilities/requests';
  import { getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { offsetViolationWindows } from '../../utilities/violations';

  export let initialPlan: Plan | null;
  export let initialView: View | null;

  let constraintMenu: ConstraintMenu;
  let saveAsViewModal: SaveAsViewModal;
  let viewMenu: ViewMenu;

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

  function onCreateView(event: CustomEvent<string>) {
    const { detail: name } = event;
    const newView = { ...$view, name };
    createView(newView);
  }

  function onDeleteActivity(event: CustomEvent<number>) {
    const { detail: activityId } = event;
    deleteActivity(activityId);
    simulationStatus.update(Status.Dirty);
  }

  function onDropActivity(event: CustomEvent<DropActivity>) {
    const { id: planId } = initialPlan;
    const { detail } = event;
    const { activityTypeName: type, startTime } = detail;
    const activity: CreateActivity = {
      arguments: {},
      startTime,
      type,
    };
    createActivity(activity, planId, initialPlan.startTime);
    simulationStatus.update(Status.Dirty);
  }

  function onKeydown(event: KeyboardEvent) {
    const { key, metaKey } = event;

    if (metaKey && key === 'e') {
      event.preventDefault();
      viewEditorPanel.show();
    } else if (metaKey && key === 's') {
      event.preventDefault();
      runSimulation();
    }
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    const { detail } = event;
    const { points } = detail;

    if (points.length) {
      const [point] = points; // TODO: Multiselect points?
      if (point.type === 'activity') {
        selectActivity(point.id);
      }
    } else {
      const { timelineId, rowId, layerId, yAxisId } = detail;
      setSelectedTimeline(timelineId, rowId, layerId, yAxisId);
      selectedTimelinePanel.show();
    }
  }

  function onResetViewTimeRange() {
    $viewTimeRange = $maxTimeRange;
  }

  async function onSaveView() {
    updateView($view);
  }

  function onSectionsDragEnd(event: CustomEvent<{ newSizes: number[] }>) {
    const { detail } = event;
    const { newSizes } = detail;
    updateSectionSizes(newSizes);
  }

  function onUpdateActivity(event: CustomEvent<UpdateActivity>) {
    const { startTime } = initialPlan;
    const { detail: activity } = event;
    updateActivity(activity, startTime);
    simulationStatus.update(Status.Dirty);
  }

  function onUpdateRowHeight(
    event: CustomEvent<{
      newHeight: number;
      rowId: number;
      timelineId: number;
    }>,
  ) {
    const { detail } = event;
    const { newHeight, rowId, timelineId } = detail;
    updateRow('height', newHeight, timelineId, rowId);
  }

  function onUpdateRows(
    event: CustomEvent<{
      rows: Row[];
      timelineId: number;
    }>,
  ) {
    const { detail } = event;
    const { rows, timelineId } = detail;
    updateTimeline('rows', rows, timelineId);
  }

  function onUpdateStartTime(event: CustomEvent<UpdateActivity>) {
    const { detail } = event;
    const { id, startTime } = detail;
    $activitiesMap[id].children = [];
    $activitiesMap[id].startTime = startTime;
    simulationStatus.update(Status.Dirty);
  }

  function onViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    $viewTimeRange = event.detail;
  }

  async function runSimulation() {
    const { model, id: planId } = initialPlan;
    let tries = 0;
    simulationStatus.update(Status.Executing);

    do {
      const {
        activitiesMap: newActivitiesMap,
        constraintViolations,
        status,
        resources: newResources,
      } = await req.simulate(model.id, planId);

      if (status === 'complete') {
        $activitiesMap = newActivitiesMap;
        $resources = newResources;
        $violations = offsetViolationWindows(
          constraintViolations,
          $planStartTimeMs,
        );
        simulationStatus.update(Status.Complete);
        return;
      } else if (status === 'failed') {
        simulationStatus.update(Status.Failed);
        return;
      }

      await sleep();
      ++tries;
    } while (tries < 10); // Trying a max of 10 times.

    simulationStatus.update(Status.Incomplete);
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
        on:click={runSimulation}
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
        on:click|stopPropagation={() => {
          viewMenu.hide();
          constraintMenu.toggle();
        }}
        use:tooltip={{
          content: 'Constraints',
          placement: 'bottom',
        }}
      >
        <i class="bi bi-code" />
        <ConstraintMenu
          bind:this={constraintMenu}
          on:constraintCreate={() => {
            $selectedConstraint = null;
            constraintEditorPanel.show();
          }}
          on:constraintList={() => constraintListPanel.show()}
          on:constraintViolations={() => constraintViolationsPanel.show()}
        />
      </button>

      <button
        class="st-button icon header-button"
        on:click|stopPropagation={() => {
          constraintMenu.hide();
          viewMenu.toggle();
        }}
        use:tooltip={{
          content: 'Views',
          placement: 'bottom',
        }}
      >
        <i class="bi bi-columns" />
        <ViewMenu
          bind:this={viewMenu}
          currentView={$view}
          on:editView={() => viewEditorPanel.show()}
          on:manageViews={() => viewManagerPanel.show()}
          on:saveAsView={() => saveAsViewModal.show()}
          on:saveView={onSaveView}
        />
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
                activities={$activities}
                activitiesMap={$activitiesMap}
                constraintViolations={$violations}
                containerSize={$viewSectionSizes[i]}
                id={section.timeline.id}
                marginLeft={section.timeline.marginLeft ?? 50}
                marginRight={section.timeline.marginRight ?? 20}
                maxTimeRange={$maxTimeRange}
                resources={$resources}
                rows={section.timeline.rows}
                selectedActivity={$selectedActivity}
                verticalGuides={section.timeline.verticalGuides}
                viewTimeRange={$viewTimeRange}
                on:dragActivity={onUpdateStartTime}
                on:dragActivityEnd={onUpdateActivity}
                on:dropActivity={onDropActivity}
                on:mouseDown={onMouseDown}
                on:resetViewTimeRange={onResetViewTimeRange}
                on:updateRowHeight={onUpdateRowHeight}
                on:updateRows={onUpdateRows}
                on:viewTimeRangeChanged={onViewTimeRangeChanged}
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
              on:updateArguments={onUpdateActivity}
              on:updateStartTime={onUpdateActivity}
              on:delete={onDeleteActivity}
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

<SaveAsViewModal bind:this={saveAsViewModal} on:createView={onCreateView} />

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
