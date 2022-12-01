<svelte:options immutable={true} />

<script lang="ts">
  import { activitiesByView, selectedActivityId } from '../../stores/activities';
  import { constraintViolations } from '../../stores/constraints';
  import { maxTimeRange, viewTimeRange } from '../../stores/plan';
  import { resourcesByViewLayerId } from '../../stores/simulation';
  import { timelineLockStatus, view, viewUpdateRow, viewUpdateTimeline } from '../../stores/views';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import Timeline from './Timeline.svelte';
  import TimelineLockControl from './TimelineLockControl.svelte';
  import TimelineViewControls from './TimelineViewControls.svelte';

  export let gridId: number;
  export let timelineId: number;

  $: timeline = $view?.definition.plan.timelines.find(timeline => timeline.id === timelineId);
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Timeline" />
    <PanelHeaderActions>
      <div class="header-actions">
        <TimelineViewControls
          maxTimeRange={$maxTimeRange}
          viewTimeRange={$viewTimeRange}
          on:viewTimeRangeChanged={({ detail: newViewTimeRange }) => {
            $viewTimeRange = newViewTimeRange;
          }}
        />
        <TimelineLockControl
          timelineLockStatus={$timelineLockStatus}
          on:lock={({ detail: lock }) => {
            $timelineLockStatus = lock;
          }}
          on:temporaryUnlock={({ detail: temporaryUnlock }) => {
            $timelineLockStatus = temporaryUnlock;
          }}
          on:unlock={({ detail: unlock }) => {
            $timelineLockStatus = unlock;
          }}
        />
      </div>
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Timeline
      activitiesByView={$activitiesByView}
      constraintViolations={$constraintViolations}
      {gridId}
      maxTimeRange={$maxTimeRange}
      {timeline}
      resourcesByViewLayerId={$resourcesByViewLayerId}
      selectedActivityId={$selectedActivityId}
      viewTimeRange={$viewTimeRange}
      on:mouseDown={({ detail: newSelectedActivityId }) => {
        $selectedActivityId = newSelectedActivityId;
      }}
      on:toggleRowExpansion={({ detail: { expanded, rowId } }) =>
        viewUpdateRow('expanded', expanded, timelineId, rowId)}
      on:updateRowHeight={({ detail: { newHeight, rowId } }) => {
        viewUpdateRow('height', newHeight, timelineId, rowId);
      }}
      on:updateRows={({ detail: rows }) => {
        viewUpdateTimeline('rows', rows, timelineId);
      }}
      on:updateVerticalGuides={({ detail: newVerticalGuides }) => {
        viewUpdateTimeline('verticalGuides', newVerticalGuides, timelineId);
      }}
      on:viewTimeRangeChanged={({ detail: newViewTimeRange }) => {
        $viewTimeRange = newViewTimeRange;
      }}
    />
  </svelte:fragment>
</Panel>

<style>
  .header-actions {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: center;
  }
</style>
