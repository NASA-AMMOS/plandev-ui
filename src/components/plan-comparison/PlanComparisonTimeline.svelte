<svelte:options immutable={true} />

<script lang="ts">
  import {
    comparisonSelectedResources,
    showAddedActivities,
    showDeletedActivities,
    showModifiedActivities,
    showUnchangedActivities,
  } from '../../stores/planComparison';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { ActivityMetadata } from '../../types/activity-metadata';
  import type { User } from '../../types/app';
  import type { DropdownOptions, SelectedDropdownOptionValue } from '../../types/dropdown';
  import type { ExternalEventId } from '../../types/external-event';
  import type { ActivityComparisonResult, ComparisonActivity, ComparisonSource } from '../../types/plan-comparison';
  import type { ResourceType, SimulationDataset } from '../../types/simulation';
  import type { Row, Timeline as TimelineType, TimeRange } from '../../types/timeline';
  import { createTimelineResourceLayer, TimelineInteractionMode, TimelineLockStatus } from '../../utilities/timeline';
  import Timeline from '../timeline/Timeline.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';

  export let leftSource: ComparisonSource | null;
  export let rightSource: ComparisonSource | null;
  export let leftActivities: ComparisonActivity[];
  export let rightActivities: ComparisonActivity[];
  export let leftSimulationDataset: SimulationDataset | null;
  export let rightSimulationDataset: SimulationDataset | null;
  export let results: ActivityComparisonResult[];
  export let planStartTime: string;
  export let planDuration: string;
  // Resource types available for selection
  export let resourceTypes: ResourceType[] = [];
  export let user: User | null = null;

  // Colors for different change types
  const COLORS = {
    added: '#00C853',
    deleted: '#FF3B30',
    modified: '#FFA500',
    unchanged: '#f9f9f9', // Light gray to dim unchanged activities
  };

  // Parse plan times
  $: planStart = planStartTime ? new Date(planStartTime).getTime() : Date.now();
  $: planEnd = planStart + parseDurationToMs(planDuration);

  function parseDurationToMs(duration: string): number {
    if (!duration) {
      return 24 * 60 * 60 * 1000; // Default 24 hours
    }
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
    return 24 * 60 * 60 * 1000;
  }

  // View time range (shared between both timelines for synchronization)
  let viewTimeRange: TimeRange = { end: 0, start: 0 };
  let maxTimeRange: TimeRange = { end: 0, start: 0 };

  // Initialize time ranges when plan data changes
  $: if (planStart && planEnd && viewTimeRange.start === 0) {
    maxTimeRange = { end: planEnd, start: planStart };
    viewTimeRange = { end: planEnd, start: planStart };
  }

  // Convert ComparisonActivity to ActivityDirective
  function toActivityDirective(activity: ComparisonActivity, planStartMs: number): ActivityDirective {
    const offsetMs = parseDurationToMs(activity.start_offset);
    return {
      anchor_id: activity.anchor_id,
      anchored_to_start: activity.anchored_to_start,
      arguments: activity.arguments,
      created_at: '',
      created_by: '',
      id: activity.id,
      last_modified_arguments_at: '',
      last_modified_at: '',
      metadata: activity.metadata as ActivityMetadata,
      name: activity.name,
      plan_id: 0,
      source_scheduling_goal_id: null,
      start_offset: activity.start_offset,
      start_time_ms: planStartMs + offsetMs,
      tags: activity.tags.map(tag => ({ tag })),
      type: activity.type,
    };
  }

  // Convert ComparisonActivity[] to ActivityDirectivesMap
  function toActivityDirectivesMap(activities: ComparisonActivity[], planStartMs: number): ActivityDirectivesMap {
    const map: ActivityDirectivesMap = {};
    for (const activity of activities) {
      map[activity.id] = toActivityDirective(activity, planStartMs);
    }
    return map;
  }

  // Build color maps based on comparison results
  function buildColorMap(
    comparisonResults: ActivityComparisonResult[],
    side: 'left' | 'right',
  ): Record<ActivityDirectiveId, string> {
    const colorMap: Record<ActivityDirectiveId, string> = {};

    for (const result of comparisonResults) {
      if (result.changeType === 'added') {
        if (side === 'right') {
          colorMap[result.activity.id] = COLORS.added;
        }
      } else if (result.changeType === 'deleted') {
        if (side === 'left') {
          colorMap[result.activity.id] = COLORS.deleted;
        }
      } else if (result.changeType === 'matched') {
        const activityId = side === 'left' ? result.leftActivity.id : result.rightActivity.id;
        if (result.changedFields.length > 0) {
          colorMap[activityId] = COLORS.modified;
        } else {
          colorMap[activityId] = COLORS.unchanged;
        }
      }
    }

    return colorMap;
  }

  // Get the set of activity IDs to hide based on visibility toggles
  function getHiddenActivityIds(
    comparisonResults: ActivityComparisonResult[],
    side: 'left' | 'right',
    showAdded: boolean,
    showDeleted: boolean,
    showModified: boolean,
    showUnchanged: boolean,
  ): Set<number> {
    const hiddenIds = new Set<number>();

    for (const result of comparisonResults) {
      if (result.changeType === 'added' && !showAdded) {
        if (side === 'right') {
          hiddenIds.add(result.activity.id);
        }
      } else if (result.changeType === 'deleted' && !showDeleted) {
        if (side === 'left') {
          hiddenIds.add(result.activity.id);
        }
      } else if (result.changeType === 'matched') {
        const isModified = result.changedFields.length > 0;
        const activityId = side === 'left' ? result.leftActivity.id : result.rightActivity.id;
        if (isModified && !showModified) {
          hiddenIds.add(activityId);
        } else if (!isModified && !showUnchanged) {
          hiddenIds.add(activityId);
        }
      }
    }

    return hiddenIds;
  }

  // Filter activity directives map to exclude hidden activities
  function filterActivityDirectivesMap(map: ActivityDirectivesMap, hiddenIds: Set<number>): ActivityDirectivesMap {
    const filtered: ActivityDirectivesMap = {};
    for (const [id, directive] of Object.entries(map)) {
      if (!hiddenIds.has(Number(id))) {
        filtered[Number(id)] = directive;
      }
    }
    return filtered;
  }

  // Create activity directives maps
  $: leftActivityDirectivesMapFull = toActivityDirectivesMap(leftActivities, planStart);
  $: rightActivityDirectivesMapFull = toActivityDirectivesMap(rightActivities, planStart);

  // Get hidden IDs based on visibility toggles
  $: leftHiddenIds = getHiddenActivityIds(
    results,
    'left',
    $showAddedActivities,
    $showDeletedActivities,
    $showModifiedActivities,
    $showUnchangedActivities,
  );
  $: rightHiddenIds = getHiddenActivityIds(
    results,
    'right',
    $showAddedActivities,
    $showDeletedActivities,
    $showModifiedActivities,
    $showUnchangedActivities,
  );

  // Filter the maps
  $: leftActivityDirectivesMap = filterActivityDirectivesMap(leftActivityDirectivesMapFull, leftHiddenIds);
  $: rightActivityDirectivesMap = filterActivityDirectivesMap(rightActivityDirectivesMapFull, rightHiddenIds);

  // Create color maps for standalone mode
  $: leftIdToColorMaps = {
    directives: buildColorMap(results, 'left'),
    external_events: {} as Record<ExternalEventId, string>,
    spans: {} as Record<number, string>,
  };
  $: rightIdToColorMaps = {
    directives: buildColorMap(results, 'right'),
    external_events: {} as Record<ExternalEventId, string>,
    spans: {} as Record<number, string>,
  };

  // Get selected resource types based on selected resource names
  $: selectedResourceTypes = resourceTypes.filter(rt => $comparisonSelectedResources.includes(rt.name));

  // Convert resource types to dropdown options
  $: resourceDropdownOptions = resourceTypes.map(rt => ({
    display: rt.name,
    value: rt.name,
  })) as DropdownOptions;

  // Handle resource selection change from dropdown
  function handleResourceSelectionChange(event: CustomEvent<SelectedDropdownOptionValue[]>) {
    const selectedValues = event.detail.filter((v): v is string => v !== null);
    comparisonSelectedResources.set(selectedValues);
  }

  // Create timeline configuration with activity row and optional resource rows
  function createTimelineConfig(selectedTypes: ResourceType[]): TimelineType {
    const rows: Row[] = [];
    let rowId = 1;
    let layerId = 1;

    // Activity row
    const activityRow: Row = {
      autoAdjustHeight: true,
      discreteOptions: {
        activityOptions: {
          composition: 'directives',
          hierarchyMode: 'flat',
        },
        displayMode: 'grouped',
        height: 20,
        labelVisibility: 'auto',
      },
      expanded: true,
      height: 200,
      horizontalGuides: [],
      id: rowId++,
      layers: [
        {
          chartType: 'activity',
          filter: {
            activity: {},
          },
          id: layerId++,
          name: 'Activities',
          yAxisId: null,
        },
      ],
      name: 'Activities',
      yAxes: [],
    };
    rows.push(activityRow);

    // Resource rows - use createTimelineResourceLayer for proper chart type mapping
    // We need a fake timelines array to generate IDs
    const fakeTimelines: TimelineType[] = [{ id: 1, marginLeft: 230, marginRight: 16, rows: [], verticalGuides: [] }];

    for (const resourceType of selectedTypes) {
      const { layer, yAxis } = createTimelineResourceLayer(fakeTimelines, resourceType);

      if (layer) {
        // Override the generated IDs with our sequential IDs
        layer.id = layerId++;
        yAxis.id = rowId;
        layer.yAxisId = rowId;

        const resourceRow: Row = {
          autoAdjustHeight: false,
          discreteOptions: {
            activityOptions: {
              composition: 'directives',
              hierarchyMode: 'flat',
            },
            displayMode: 'grouped',
            height: 20,
            labelVisibility: 'auto',
          },
          expanded: true,
          height: 120,
          horizontalGuides: [],
          id: rowId++,
          layers: [layer],
          name: resourceType.name,
          yAxes: [yAxis],
        };
        rows.push(resourceRow);
      }
    }

    return {
      id: 1,
      marginLeft: 230,
      marginRight: 16,
      rows,
      verticalGuides: [],
    };
  }

  $: timeline = createTimelineConfig(selectedResourceTypes);

  // Handle view time range changes - keep both timelines synced
  // Cursor time state for syncing between timelines
  let leftCursorTime: Date | null = null;
  let leftCursorRowIndex: number | null = null;
  let leftCursorYOffset: number | null = null;
  let rightCursorTime: Date | null = null;
  let rightCursorRowIndex: number | null = null;
  let rightCursorYOffset: number | null = null;

  // Vertical scroll state for syncing between timelines
  let leftScrollTop: number | null = null;
  let rightScrollTop: number | null = null;

  function handleLeftViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    viewTimeRange = event.detail;
  }

  function handleRightViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    viewTimeRange = event.detail;
  }

  function handleLeftCursorTimeChanged(
    event: CustomEvent<{ rowIndex: number | null; time: Date | null; yOffset: number | null }>,
  ) {
    leftCursorTime = event.detail.time;
    leftCursorRowIndex = event.detail.rowIndex;
    leftCursorYOffset = event.detail.yOffset;
  }

  function handleRightCursorTimeChanged(
    event: CustomEvent<{ rowIndex: number | null; time: Date | null; yOffset: number | null }>,
  ) {
    rightCursorTime = event.detail.time;
    rightCursorRowIndex = event.detail.rowIndex;
    rightCursorYOffset = event.detail.yOffset;
  }

  function handleLeftVerticalScrollChanged(event: CustomEvent<number>) {
    leftScrollTop = event.detail;
  }

  function handleRightVerticalScrollChanged(event: CustomEvent<number>) {
    rightScrollTop = event.detail;
  }
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
  <div class="flex items-center justify-between pr-2">
    <div class="flex gap-4 px-2 py-2">
      <button
        class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-opacity hover:bg-accent {$showAddedActivities
          ? ''
          : 'opacity-40'}"
        on:click={() => showAddedActivities.update(v => !v)}
        title="Toggle added activities"
      >
        <span class="h-3 w-3 rounded-sm bg-green-500"></span> Added
      </button>
      <button
        class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-opacity hover:bg-accent {$showDeletedActivities
          ? ''
          : 'opacity-40'}"
        on:click={() => showDeletedActivities.update(v => !v)}
        title="Toggle deleted activities"
      >
        <span class="h-3 w-3 rounded-sm bg-red-500"></span> Deleted
      </button>
      <button
        class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-opacity hover:bg-accent {$showModifiedActivities
          ? ''
          : 'opacity-40'}"
        on:click={() => showModifiedActivities.update(v => !v)}
        title="Toggle modified activities"
      >
        <span class="h-3 w-3 rounded-sm bg-orange-500"></span> Modified
      </button>
      <button
        class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-opacity hover:bg-accent {$showUnchangedActivities
          ? ''
          : 'opacity-40'}"
        on:click={() => showUnchangedActivities.update(v => !v)}
        title="Toggle unchanged activities"
      >
        <span class="h-3 w-3 rounded-sm bg-gray-500"></span> Unchanged
      </button>

      <!-- Resource selector dropdown -->
      {#if resourceTypes.length > 0}
        <div class="resource-dropdown-container ml-4 border-l border-border pl-4">
          <SearchableDropdown
            allowMultiple={true}
            options={resourceDropdownOptions}
            selectedOptionValues={$comparisonSelectedResources}
            selectedOptionLabel="Resources ({$comparisonSelectedResources.length})"
            placeholder="Select resources"
            searchPlaceholder="Search resources"
            scrollToSelection={false}
            on:change={handleResourceSelectionChange}
          >
            <div slot="dropdown-header" class="flex w-full items-center justify-between">
              <span class="text-xs text-muted-foreground">Select resources to display</span>
              {#if $comparisonSelectedResources.length > 0}
                <button
                  class="text-xs text-primary hover:underline"
                  on:click|stopPropagation={() => comparisonSelectedResources.set([])}
                >
                  Clear all
                </button>
              {/if}
            </div>
          </SearchableDropdown>
        </div>
      {/if}
    </div>
    <div class="text-[11px] text-muted-foreground">
      <span>Scroll to zoom | Shift+Scroll to scroll vertically | Drag to pan</span>
    </div>
  </div>

  <div class="flex min-h-0 flex-1 gap-2">
    <!-- Left Timeline -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="border-b border-border bg-muted p-2 font-medium">{leftSource?.name ?? 'Left'}</div>
      <div class="relative flex-1 overflow-hidden border border-border bg-background">
        <Timeline
          standaloneMode={true}
          standaloneIdToColorMaps={leftIdToColorMaps}
          activityDirectivesMap={leftActivityDirectivesMap}
          {maxTimeRange}
          {viewTimeRange}
          {timeline}
          planEndTimeDoy=""
          planStartTimeYmd={planStartTime}
          plan={null}
          resourceTypes={[]}
          selectedActivityDirectiveId={null}
          selectedExternalEventId={null}
          selectedSpanId={null}
          simulation={null}
          simulationDataset={leftSimulationDataset}
          spanUtilityMaps={{ directiveIdToSpanIdMap: {}, spanIdToChildIdsMap: {}, spanIdToDirectiveIdMap: {} }}
          spansMap={{}}
          spans={[]}
          timelineInteractionMode={TimelineInteractionMode.Navigate}
          timelineLockStatus={TimelineLockStatus.Unlocked}
          {user}
          hasUpdateDirectivePermission={false}
          hasUpdateSimulationPermission={false}
          decimate={true}
          interpolateHoverValue={false}
          showTimelineTooltip={true}
          limitTooltipToLine={false}
          externalCursorTime={rightCursorTime}
          externalCursorRowIndex={rightCursorRowIndex}
          externalCursorYOffset={rightCursorYOffset}
          externalScrollTop={rightScrollTop}
          tooltipId="tooltip-left"
          on:viewTimeRangeChanged={handleLeftViewTimeRangeChanged}
          on:cursorTimeChanged={handleLeftCursorTimeChanged}
          on:verticalScrollChanged={handleLeftVerticalScrollChanged}
        />
      </div>
    </div>

    <!-- Divider -->
    <div class="w-0.5 bg-border"></div>

    <!-- Right Timeline -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="border-b border-border bg-muted p-2 font-medium">{rightSource?.name ?? 'Right'}</div>
      <div class="relative flex-1 overflow-hidden border border-border bg-background">
        <Timeline
          standaloneMode={true}
          standaloneIdToColorMaps={rightIdToColorMaps}
          activityDirectivesMap={rightActivityDirectivesMap}
          {maxTimeRange}
          {viewTimeRange}
          {timeline}
          planEndTimeDoy=""
          planStartTimeYmd={planStartTime}
          plan={null}
          resourceTypes={[]}
          selectedActivityDirectiveId={null}
          selectedExternalEventId={null}
          selectedSpanId={null}
          simulation={null}
          simulationDataset={rightSimulationDataset}
          spanUtilityMaps={{ directiveIdToSpanIdMap: {}, spanIdToChildIdsMap: {}, spanIdToDirectiveIdMap: {} }}
          spansMap={{}}
          spans={[]}
          timelineInteractionMode={TimelineInteractionMode.Navigate}
          timelineLockStatus={TimelineLockStatus.Unlocked}
          {user}
          hasUpdateDirectivePermission={false}
          hasUpdateSimulationPermission={false}
          decimate={true}
          interpolateHoverValue={false}
          showTimelineTooltip={true}
          limitTooltipToLine={false}
          externalCursorTime={leftCursorTime}
          externalCursorRowIndex={leftCursorRowIndex}
          externalCursorYOffset={leftCursorYOffset}
          externalScrollTop={leftScrollTop}
          tooltipId="tooltip-right"
          on:viewTimeRangeChanged={handleRightViewTimeRangeChanged}
          on:cursorTimeChanged={handleRightCursorTimeChanged}
          on:verticalScrollChanged={handleRightVerticalScrollChanged}
        />
      </div>
    </div>
  </div>
</div>
