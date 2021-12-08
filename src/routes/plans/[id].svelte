<script lang="ts" context="module">
  import type { LoadInput, LoadOutput } from '@sveltejs/kit';
  import type {
    ActivityType,
    ArgumentsMap,
    Constraint,
    CreateActivity,
    CreateConstraint,
    DropActivity,
    MouseDown,
    Row,
    TimeRange,
    UpdateActivity,
    View,
  } from '../../types';

  export async function load({
    fetch,
    page,
    session,
  }: LoadInput): Promise<LoadOutput> {
    if (!session.user) {
      return {
        redirect: '/login',
        status: 302,
      };
    }

    const { params, query } = page;
    const { id } = params;
    const planId = parseFloat(id);

    const initialPlan = await reqGetPlan(fetch, planId);
    const initialView = await reqGetView(fetch, query);

    return {
      props: {
        initialPlan,
        initialView,
      },
    };
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ActivityDictionary from '../../components/activity/ActivityDictionary.svelte';
  import ActivityForm from '../../components/activity/ActivityForm.svelte';
  import Timeline from '../../components/timeline/Timeline.svelte';
  import LoadViewModal from '../../components/modals/LoadView.svelte';
  import SaveAsViewModal from '../../components/modals/SaveAsView.svelte';
  import ConstraintMenu from '../../components/menus/Constraint.svelte';
  import ViewMenu from '../../components/menus/View.svelte';
  import SchedulingStatusBadge from '../../components/scheduling/SchedulingStatusBadge.svelte';
  import SimulationConfiguration from '../../components/simulation/SimulationConfiguration.svelte';
  import SimulationStatusBadge from '../../components/simulation/SimulationStatusBadge.svelte';
  import TimelineForm from '../../components/timeline/form/TimelineForm.svelte';
  import Card from '../../components/ui/Card.svelte';
  import Grid from '../../components/ui/Grid.svelte';
  import Split from '../../components/ui/Split.svelte';
  import Table from '../../components/ui/Table.svelte';
  import TopBar from '../../components/ui/TopBar.svelte';
  import CodeMirrorJsonEditor from '../../components/ui/CodeMirrorJsonEditor.svelte';
  import ConstraintEditor from '../../components/constraint/Editor.svelte';
  import ConstraintList from '../../components/constraint/List.svelte';
  import ConstraintViolations from '../../components/constraint/Violations.svelte';
  import {
    activities,
    activitiesMap,
    selectedActivityId,
    selectedActivity,
    createActivity,
    deleteActivity,
    updateActivity,
  } from '../../stores/activities';
  import {
    deleteConstraint,
    modelConstraints,
    planConstraints,
    selectedConstraint,
    violations,
    createConstraint,
    updateConstraint,
  } from '../../stores/constraints';
  import {
    activityDictionaryPanel,
    constraintEditorPanel,
    constraintListPanel,
    constraintViolationsPanel,
    selectedActivityPanel,
    selectedTimelinePanel,
    simulationConfigurationPanel,
    viewEditorPanel,
  } from '../../stores/panels';
  import { resources } from '../../stores/resources';
  import { SchedulingStatus, schedulingStatus } from '../../stores/scheduling';
  import {
    modelParametersMap,
    selectedSimulationId,
    simulationArgumentsMap,
    SimulationStatus,
    simulationStatus,
    updateSimulationArguments,
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
    viewText,
  } from '../../stores/views';
  import { keyBy, setQueryParam, sleep } from '../../utilities/generic';
  import {
    Plan,
    reqGetActivitiesForPlan,
    reqGetPlan,
    reqGetView,
    reqSchedule,
    reqSimulate,
  } from '../../utilities/requests';
  import { getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { offsetViolationWindows } from '../../utilities/violations';

  export let initialPlan: Plan | null;
  export let initialView: View | null;

  let constraintMenu: ConstraintMenu;
  let horizontalSplitInitialized: boolean = false;
  let loadViewModal: LoadViewModal;
  let saveAsViewModal: SaveAsViewModal;
  let viewMenu: ViewMenu;

  $: if (initialPlan) {
    const { activities, constraints, model, simulations } = initialPlan;
    const [simulation] = simulations;
    $activitiesMap = keyBy(activities);
    $modelConstraints = model.constraints;
    $modelParametersMap = model.parameters.parameters;
    $planConstraints = constraints;
    $selectedSimulationId = simulation.id;
    $simulationArgumentsMap = simulation.arguments;
  }
  $: if (initialView) {
    $view = initialView;
  }
  $: endTimeMs = getUnixEpochTime(initialPlan.endTime);
  $: maxTimeRange = { end: endTimeMs, start: startTimeMs };
  $: startTimeMs = getUnixEpochTime(initialPlan.startTime);
  $: viewTimeRange = { end: endTimeMs, start: startTimeMs };

  onMount(() => {
    if ($view) {
      setQueryParam('viewId', `${$view.id}`);
    }
  });

  onDestroy(() => {
    activityDictionaryPanel.show();
    simulationStatus.update(SimulationStatus.Clean);
    $activitiesMap = {};
    $modelConstraints = [];
    $modelParametersMap = {};
    $planConstraints = [];
    $resources = [];
    $schedulingStatus = SchedulingStatus.Clean;
    $selectedActivityId = null;
    $selectedSimulationId = null;
    $simulationArgumentsMap = {};
    $violations = [];
  });

  async function onCreateActivity(event: CustomEvent<ActivityType>) {
    const { detail: activityType } = event;
    const { id: planId, startTime } = initialPlan;
    const activity: CreateActivity = {
      arguments: {},
      startTime,
      type: activityType.name,
    };
    const { id, success } = await createActivity(activity, planId, startTime);
    if (success) {
      selectActivity(id);
      simulationStatus.update(SimulationStatus.Dirty);
    }
  }

  async function onCreateConstraint(event: CustomEvent<CreateConstraint>) {
    const { detail: newConstraint } = event;
    await createConstraint(newConstraint);
    simulationStatus.update(SimulationStatus.Dirty);
  }

  function onCreateView(event: CustomEvent<string>) {
    const { detail: name } = event;
    const newView = { ...$view, name };
    createView(newView);
  }

  function onDeleteActivity(event: CustomEvent<number>) {
    const { detail: activityId } = event;
    deleteActivity(activityId);
    simulationStatus.update(SimulationStatus.Dirty);
  }

  async function onDeleteConstraint(event: CustomEvent<number>) {
    const { detail: constraintId } = event;
    await deleteConstraint(constraintId);
    simulationStatus.update(SimulationStatus.Dirty);
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
    simulationStatus.update(SimulationStatus.Dirty);
  }

  function onEditConstraint(event: CustomEvent<Constraint>) {
    const { detail: constraint } = event;
    $selectedConstraint = constraint;
    constraintEditorPanel.show();
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
    viewTimeRange = maxTimeRange;
  }

  async function onSaveView() {
    updateView($view);
  }

  function onSectionsDragEnd(event: CustomEvent<{ newSizes: number[] }>) {
    const { detail } = event;
    const { newSizes } = detail;
    updateSectionSizes(newSizes);
  }

  function onSetView(event: CustomEvent<{ view: View }>) {
    const { detail } = event;
    const { view: newView } = detail;
    $view = newView;
    setQueryParam('viewId', `${newView.id}`);
  }

  function onUpdateActivity(event: CustomEvent<UpdateActivity>) {
    const { startTime } = initialPlan;
    const { detail: activity } = event;
    updateActivity(activity, startTime);
    simulationStatus.update(SimulationStatus.Dirty);
  }

  async function onUpdateConstraint(event: CustomEvent<Constraint>) {
    const { detail: updatedConstraint } = event;
    await updateConstraint(updatedConstraint);
    simulationStatus.update(SimulationStatus.Dirty);
  }

  function onUpdateSimulationArguments(
    event: CustomEvent<{
      newArgumentsMap: ArgumentsMap;
      newFiles: File[];
    }>,
  ) {
    const { detail } = event;
    const { newArgumentsMap, newFiles } = detail;
    updateSimulationArguments($selectedSimulationId, newArgumentsMap, newFiles);
    simulationStatus.update(SimulationStatus.Dirty);
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
    simulationStatus.update(SimulationStatus.Dirty);
  }

  function onViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    viewTimeRange = event.detail;
  }

  function onViewTextChanged(event: CustomEvent<string>): void {
    const { detail: json } = event;
    try {
      const newView = JSON.parse(json);
      $view = newView;
    } catch (e) {
      console.log(e);
    }
  }

  async function runScheduling() {
    $schedulingStatus = SchedulingStatus.Executing;
    const { id: planId } = initialPlan;
    const response = await reqSchedule(planId);

    if (response.status === 'complete') {
      const newActivities = await reqGetActivitiesForPlan(planId);
      simulationStatus.update(SimulationStatus.Dirty);
      $activitiesMap = keyBy(newActivities);
      $schedulingStatus = SchedulingStatus.Complete;
      $selectedActivityId = null;
    } else {
      console.log(response);
      if (response.status === 'failed') {
        $schedulingStatus = SchedulingStatus.Failed;
      } else {
        $schedulingStatus = SchedulingStatus.Unknown;
      }
    }
  }

  async function runSimulation() {
    const { model, id: planId } = initialPlan;
    let tries = 0;
    simulationStatus.update(SimulationStatus.Executing);

    do {
      const {
        activitiesMap: newActivitiesMap,
        constraintViolations,
        status,
        resources: newResources,
      } = await reqSimulate(model.id, planId);

      if (status === 'complete') {
        $activitiesMap = newActivitiesMap;
        $resources = newResources;
        $violations = offsetViolationWindows(constraintViolations, startTimeMs);
        simulationStatus.update(SimulationStatus.Complete);
        return;
      } else if (status === 'failed') {
        simulationStatus.update(SimulationStatus.Failed);
        return;
      }

      await sleep();
      ++tries;
    } while (tries < 10); // Trying a max of 10 times.

    simulationStatus.update(SimulationStatus.Incomplete);
  }

  function selectActivity(id: number): void {
    $selectedActivityId = id;
    selectedActivityPanel.show();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Grid rows="32px auto">
  <TopBar>
    <div class="header-left">
      Plan: {initialPlan.name}
      <SimulationStatusBadge simulationStatus={$simulationStatus} />
      <SchedulingStatusBadge schedulingStatus={$schedulingStatus} />
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
        on:click={runScheduling}
        use:tooltip={{
          content: 'Run Scheduling',
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
          viewMenu.menu.hide();
          constraintMenu.menu.toggle();
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
          constraintMenu.menu.hide();
          viewMenu.menu.toggle();
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
          on:editViewJson={() => viewEditorPanel.show()}
          on:loadView={() => loadViewModal.modal.show()}
          on:saveAsView={() => saveAsViewModal.modal.show()}
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
        <i class="si si-activity_dictionary" />
      </button>
    </div>
  </TopBar>
  <Split
    bind:initialized={horizontalSplitInitialized}
    direction="horizontal"
    ids={['#sections', '#right-panel']}
    sizes={[75, 25]}
  >
    <Split
      id="sections"
      ids={$viewSectionIds}
      sizes={$viewSectionSizes}
      on:dragEnd={onSectionsDragEnd}
    >
      {#each $view.plan.sections as section, i (section.id)}
        <div class="section" id={`section-${section.id}`}>
          {#if section.iframe && horizontalSplitInitialized}
            <iframe
              allow="fullscreen"
              class="h-100 w-100 border-0"
              src={section.iframe.src}
              title="iframe-{section.id}"
            />
          {:else if section.table && horizontalSplitInitialized}
            <Table
              columns={section.table.columns}
              data={$activities}
              selectedId={$selectedActivityId}
              on:select={event => selectActivity(event.detail.id)}
            />
          {:else if section.timeline && horizontalSplitInitialized}
            <Timeline
              activities={$activities}
              activitiesMap={$activitiesMap}
              constraintViolations={$violations}
              containerSize={$viewSectionSizes[i]}
              id={section.timeline.id}
              marginLeft={section.timeline.marginLeft ?? 50}
              marginRight={section.timeline.marginRight ?? 20}
              {maxTimeRange}
              resources={$resources}
              rows={section.timeline.rows}
              selectedActivity={$selectedActivity}
              verticalGuides={section.timeline.verticalGuides}
              {viewTimeRange}
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
        </div>
      {/each}
    </Split>
    <div id="right-panel">
      {#if $activityDictionaryPanel.visible}
        <ActivityDictionary
          activityTypes={initialPlan.model.activityTypes}
          on:createActivity={onCreateActivity}
        />
      {:else if $constraintEditorPanel.visible}
        <ConstraintEditor
          constraint={$selectedConstraint}
          modelId={initialPlan.model.id}
          planId={initialPlan.id}
          on:create={onCreateConstraint}
          on:update={onUpdateConstraint}
        />
      {:else if $constraintListPanel.visible}
        <ConstraintList
          modelConstraints={$modelConstraints}
          planConstraints={$planConstraints}
          on:delete={onDeleteConstraint}
          on:edit={onEditConstraint}
        />
      {:else if $constraintViolationsPanel.visible}
        <ConstraintViolations
          violations={$violations}
          on:selectWindow={onViewTimeRangeChanged}
        />
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
          <Card class="p-1 m-1">No Activity Selected</Card>
        {/if}
      {:else if $selectedTimelinePanel.visible}
        <TimelineForm />
      {:else if $simulationConfigurationPanel.visible}
        <SimulationConfiguration
          argumentsMap={$simulationArgumentsMap}
          parametersMap={$modelParametersMap}
          on:updateArguments={onUpdateSimulationArguments}
        />
      {:else if $viewEditorPanel.visible}
        <CodeMirrorJsonEditor
          text={$viewText}
          on:textChanged={onViewTextChanged}
        />
      {/if}
    </div>
  </Split>
</Grid>

<LoadViewModal
  bind:this={loadViewModal}
  currentView={$view}
  on:setView={onSetView}
/>

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

  #right-panel {
    overflow-y: scroll;
  }

  .section {
    overflow-x: hidden;
    overflow-y: scroll;
  }
</style>
