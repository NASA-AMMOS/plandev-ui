<svelte:options immutable={true} />

<script lang="ts">
  import {
    activityDirectivesByView,
    activityDirectivesMap,
    selectActivity,
    selectedActivityDirectiveId,
  } from '../../stores/activities';
  import { visibleConstraintViolations } from '../../stores/constraints';
  import { maxTimeRange, plan, planId, viewTimeRange } from '../../stores/plan';
  import {
    resourcesByViewLayerId,
    selectedSpanId,
    simulation,
    simulationDataset,
    spanUtilityMaps,
    spans,
    spansMap,
  } from '../../stores/simulation';
  import { timelineLockStatus, view, viewUpdateRow, viewUpdateTimeline } from '../../stores/views';
  import type { ActivityDirectiveId } from '../../types/activity';
  import type { MouseDown } from '../../types/timeline';
  import effects from '../../utilities/effects';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import Timeline from './Timeline.svelte';
  import TimelineLockControl from './TimelineLockControl.svelte';
  import TimelineViewControls from './TimelineViewControls.svelte';

  let timelineId: number = 0;

  $: timeline = $view?.definition.plan.timelines.find(timeline => timeline.id === timelineId);

  function deleteActivityDirective(event: CustomEvent<ActivityDirectiveId>) {
    const { detail: activityDirectiveId } = event;
    effects.deleteActivityDirective($planId, activityDirectiveId);
  }

  function jumpToActivityDirective(event: CustomEvent<ActivityDirectiveId>) {
    const { detail: activityDirectiveId } = event;
    selectActivity(activityDirectiveId, null);
  }

  function jumpToSpan(event: CustomEvent<ActivityDirectiveId>) {
    const { detail: spanId } = event;
    selectActivity(null, spanId);
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    const { detail } = event;
    const { activityDirectives, spans } = detail;
    if (activityDirectives.length) {
      selectActivity(activityDirectives[0].id, null);
    } else if (spans.length) {
      selectActivity(null, spans[0].id);
    } else {
      selectActivity(null, null);
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
      activityDirectivesByView={$activityDirectivesByView}
      activityDirectivesMap={$activityDirectivesMap}
      constraintViolations={$visibleConstraintViolations}
      maxTimeRange={$maxTimeRange}
      planEndTimeDoy={$plan.end_time_doy}
      planId={$planId}
      planStartTimeYmd={$plan.start_time}
      {timeline}
      resourcesByViewLayerId={$resourcesByViewLayerId}
      selectedActivityDirectiveId={$selectedActivityDirectiveId}
      selectedSpanId={$selectedSpanId}
      simulation={$simulation}
      simulationDataset={$simulationDataset}
      spanUtilityMaps={$spanUtilityMaps}
      spansMap={$spansMap}
      spans={$spans}
      timelineLockStatus={$timelineLockStatus}
      viewTimeRange={$viewTimeRange}
      on:deleteActivityDirective={deleteActivityDirective}
      on:jumpToActivityDirective={jumpToActivityDirective}
      on:jumpToSpan={jumpToSpan}
      on:mouseDown={onMouseDown}
      on:toggleRowExpansion={({ detail: { expanded, rowId } }) => {
        viewUpdateRow('expanded', expanded, timelineId, rowId);
      }}
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
