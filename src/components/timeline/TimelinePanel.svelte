<svelte:options immutable={true} />

<script lang="ts">
  import { activitiesByView, selectedActivity, selectedActivityId } from '../../stores/activities';
  import { constraintViolations } from '../../stores/constraints';
  import { maxTimeRange, planId, viewTimeRange } from '../../stores/plan';
  import { resourcesByViewLayerId } from '../../stores/simulation';
  import { timelineLockStatus, view, viewUpdateRow, viewUpdateTimeline } from '../../stores/views';
  import effects from '../../utilities/effects';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import Timeline from './Timeline.svelte';
  import TimelineLockControl from './TimelineLockControl.svelte';
  import TimelineViewControls from './TimelineViewControls.svelte';

  let timelineId: number = 0;
  let isDeletingDirective: boolean = false;

  $: timeline = $view?.definition.plan.timelines.find(timeline => timeline.id === timelineId);

  async function deleteActivityDirective() {
    if (!isDeletingDirective) {
      isDeletingDirective = true;
      await effects.deleteActivityDirective($planId, $selectedActivity.id);
      isDeletingDirective = false;
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <div />
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
      maxTimeRange={$maxTimeRange}
      {timeline}
      resourcesByViewLayerId={$resourcesByViewLayerId}
      selectedActivityId={$selectedActivityId}
      viewTimeRange={$viewTimeRange}
      on:delete={deleteActivityDirective}
      on:mouseDown={({ detail: newSelectedActivityId }) => {
        $selectedActivityId = newSelectedActivityId;
      }}
      on:toggleRowExpansion={({ detail: { expanded, rowId } }) =>
        viewUpdateRow('expanded', expanded, timelineId, rowId)}
      on:updateRowHeight={({ detail: { newHeight, rowId, wasAutoAdjusted } }) => {
        viewUpdateRow('height', newHeight, timelineId, rowId, wasAutoAdjusted);
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
