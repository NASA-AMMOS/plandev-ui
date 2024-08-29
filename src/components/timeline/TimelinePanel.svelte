<svelte:options immutable={true} />

<script lang="ts">
  import { activityDirectivesMap, selectActivity, selectedActivityDirectiveId } from '../../stores/activities';
  import { visibleConstraintResults } from '../../stores/constraints';
  import { maxTimeRange, plan, planReadOnly, viewTimeRange } from '../../stores/plan';
  import {
    resourceTypes,
    selectedSpanId,
    simulation,
    simulationDataset,
    spanUtilityMaps,
    spans,
    spansMap,
    yAxesWithScaleDomainsCache,
  } from '../../stores/simulation';
  import {
    timelineInteractionMode,
    timelineLockStatus,
    view,
    viewSetSelectedRow,
    viewTogglePanel,
    viewUpdateRow,
    viewUpdateTimeline,
  } from '../../stores/views';
  import type { ActivityDirectiveId } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ActivityOptions, Axis, MouseDown, Row, Timeline as TimelineType } from '../../types/timeline';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import Timeline from './Timeline.svelte';
  import TimelineViewControls from './TimelineViewControls.svelte';

  export let user: User | null;

  let hasUpdateDirectivePermission: boolean = false;
  let hasUpdateSimulationPermission: boolean = false;
  let timelineId: number = 0;
  let timeline: TimelineType | undefined;
  let timelines: TimelineType[] = [];
  let timelineRef: Timeline;
  let decimate = true;
  let interpolateHoverValue = false;
  let limitTooltipToLine = false;
  let showTimelineTooltip = true;

  $: if (user !== null && $plan !== null) {
    hasUpdateDirectivePermission = featurePermissions.activityDirective.canUpdate(user, $plan) && !$planReadOnly;
    hasUpdateSimulationPermission = featurePermissions.simulation.canUpdate(user, $plan) && !$planReadOnly;
  }

  $: timelines = $view?.definition.plan.timelines || [];
  $: timeline = timelines.find(timeline => {
    return timeline.id === timelineId;
  });

  function deleteActivityDirective(event: CustomEvent<ActivityDirectiveId>) {
    const { detail: activityDirectiveId } = event;
    if ($plan) {
      effects.deleteActivityDirective(activityDirectiveId, $plan, user);
    }
  }

  function openSelectedActivityPanel(event: CustomEvent) {
    const {
      detail: { selectedActivityDirectiveId, selectedSpanId },
    } = event;
    if (selectedActivityDirectiveId !== null || selectedSpanId !== null) {
      viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'ActivityFormPanel' } });
    }
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
    if (spans.length) {
      selectActivity(null, spans[0].span_id);
    } else if (activityDirectives.length) {
      selectActivity(activityDirectives[0].id, null);
    } else {
      selectActivity(null, null);
    }
  }

  function onToggleActivityComposition(event: CustomEvent<{ composition: ActivityOptions['composition']; row: Row }>) {
    const {
      detail: { row, composition },
    } = event;
    viewUpdateRow('activityOptions', { ...row.activityOptions, composition }, timelineId, row.id);
  }

  function editRow(row: Row) {
    // Open the timeline editor panel on the right.
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });

    // Set row to edit.
    viewSetSelectedRow(row.id);
  }

  function onEditRow(event: CustomEvent<Row>) {
    const { detail: row } = event;
    editRow(row);
  }

  function onDeleteRow(event: CustomEvent<Row>) {
    const { detail: row } = event;
    effects.deleteTimelineRow(row, timeline?.rows ?? [], timelineId);
  }

  function onDuplicateRow(event: CustomEvent<Row>) {
    const { detail: row } = event;
    if (timeline) {
      const newRow = effects.duplicateTimelineRow(row, timeline, timelines);
      if (newRow) {
        editRow(newRow);
      }
    }
  }

  function onInsertRow(event: CustomEvent<Row>) {
    const { detail: row } = event;
    if (timeline) {
      const newRow = effects.insertTimelineRow(row, timeline, timelines);
      if (newRow) {
        editRow(newRow);
      }
    }
  }

  function onUpdateYAxes(event: CustomEvent<{ axes: Axis[]; id: number }>) {
    const {
      detail: { axes, id },
    } = event;
    $yAxesWithScaleDomainsCache = { ...$yAxesWithScaleDomainsCache, [id]: axes };
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <div class="st-typography-medium timeline-title">Timeline</div>
    <PanelHeaderActions>
      <div class="header-actions timeline-icon-tray">
        <TimelineViewControls
          maxTimeRange={$maxTimeRange}
          viewTimeRange={$viewTimeRange}
          {decimate}
          {hasUpdateDirectivePermission}
          {interpolateHoverValue}
          {limitTooltipToLine}
          {showTimelineTooltip}
          on:toggleDecimation={({ detail }) => {
            decimate = detail;
          }}
          on:toggleInterpolateHoverValue={({ detail }) => {
            interpolateHoverValue = detail;
          }}
          on:toggleLimitTooltipToLine={({ detail }) => {
            limitTooltipToLine = detail;
          }}
          on:toggleTimelineTooltip={({ detail }) => {
            // TODO could be a more generic setting of an option
            showTimelineTooltip = detail;
          }}
          on:viewTimeRangeChanged={({ detail: newViewTimeRange }) => {
            // TODO unsure of cleaner way to accomplish this without pulling xScaleMax and the
            // zoom transform sync into TimelinePanel which feels out of scope for this component which
            // is primarily supposed to manage store interactions?
            timelineRef?.viewTimeRangeChanged(newViewTimeRange);
          }}
        />
      </div>
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Timeline
      bind:this={timelineRef}
      {decimate}
      {interpolateHoverValue}
      {limitTooltipToLine}
      {showTimelineTooltip}
      activityDirectivesMap={$activityDirectivesMap}
      constraintResults={$visibleConstraintResults}
      {hasUpdateDirectivePermission}
      {hasUpdateSimulationPermission}
      maxTimeRange={$maxTimeRange}
      planEndTimeDoy={$plan?.end_time_doy ?? ''}
      plan={$plan}
      planStartTimeYmd={$plan?.start_time ?? ''}
      resourceTypes={$resourceTypes}
      {timeline}
      timelineInteractionMode={$timelineInteractionMode}
      selectedActivityDirectiveId={$selectedActivityDirectiveId}
      selectedSpanId={$selectedSpanId}
      simulation={$simulation}
      simulationDataset={$simulationDataset}
      spanUtilityMaps={$spanUtilityMaps}
      spansMap={$spansMap}
      spans={$spans}
      timelineLockStatus={$timelineLockStatus}
      {user}
      viewTimeRange={$viewTimeRange}
      on:deleteActivityDirective={deleteActivityDirective}
      on:dblClick={openSelectedActivityPanel}
      on:jumpToActivityDirective={jumpToActivityDirective}
      on:jumpToSpan={jumpToSpan}
      on:mouseDown={onMouseDown}
      on:toggleActivityComposition={onToggleActivityComposition}
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
      on:editRow={onEditRow}
      on:deleteRow={onDeleteRow}
      on:duplicateRow={onDuplicateRow}
      on:insertRow={onInsertRow}
      on:updateYAxes={onUpdateYAxes}
    />
  </svelte:fragment>
</Panel>

<style>
  .timeline-title {
    padding: 0px 4px;
    user-select: none;
  }
  .header-actions {
    align-items: center;
    display: flex;
    gap: 4px;
    justify-content: center;
  }

  :global(.timeline-icon-tray .st-button.icon.toggle-button:not(.active)) {
    color: rgba(41, 49, 55, 0.3);
  }

  :global(.timeline-icon-tray .st-button.icon.toggle-button:not(.active) .directive-icon) {
    opacity: 0.3 !important;
  }

  :global(.timeline-icon-tray-divider) {
    align-items: center;
    background: black;
    display: flex;
    height: 16px;
    margin: 0px 4px;
    opacity: 0.1;
    width: 1px;
  }
</style>
