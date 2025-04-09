<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { TIME_MS } from '../../enums/time';
  import { planReadOnly } from '../../stores/plan';
  import { view, viewUpdateGrid } from '../../stores/views';
  import type { ActivityDirective, ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import type { Simulation, SimulationDataset, Span, SpansMap, SpanUtilityMaps } from '../../types/simulation';
  import type {
    ActivityOptions,
    DiscreteOptions,
    MouseOver,
    MouseOverOrigin,
    Row,
    Timeline,
    TimeRange,
    VerticalGuide,
  } from '../../types/timeline';
  import {
    copyActivityDirectivesToClipboard,
    getAllSpansForActivityDirective,
    getSpanRootParent,
  } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getDoyTime, getIntervalInMs, getUnixEpochTimeFromInterval } from '../../utilities/time';
  import { createVerticalGuide, isActivityLayer } from '../../utilities/timeline';
  import PasteActivitiesContextMenu from '../activity/PasteActivitiesContextMenu.svelte';
  import ContextMenuInternal from '../context-menu/ContextMenu.svelte';

  export let activityDirectivesMap: ActivityDirectivesMap;
  export let contextMenu: MouseOver | null;
  export let hasUpdateDirectivePermission: boolean = false;
  export let hasUpdateSimulationPermission: boolean = false;
  export let maxTimeRange: TimeRange = { end: 0, start: 0 };
  export let plan: Plan | null = null;
  export let planStartTimeYmd: string;
  export let simulation: Simulation | null;
  export let simulationDataset: SimulationDataset | null = null;
  export let spansMap: SpansMap;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let verticalGuides: VerticalGuide[];
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    collapseDiscreteTree: Row;
    createActivityDirectives: ActivityDirective[];
    deleteActivityDirective: number;
    deleteRow: Row;
    duplicateRow: Row;
    editRow: Row;
    insertRow: Row;
    jumpToActivityDirective: number;
    jumpToSpan: number;
    moveRow: { direction: 'up' | 'down'; row: Row };
    pasteActivityDirectivesAtTime: Date | null;
    toggleActivityComposition: { composition: ActivityOptions['composition']; row: Row };
    updateVerticalGuides: VerticalGuide[];
    viewTimeRangeChanged: TimeRange;
    viewTimeRangeReset: void;
  }>();
  let discreteOptions: DiscreteOptions | undefined;
  let activityOptions: ActivityOptions | undefined;
  let activityDirective: ActivityDirective | null;
  let activityDirectiveSpans: Span[] | null = [];
  let activityDirectiveStartDate: Date | null = null;
  let contextMenuComponent: ContextMenuInternal;
  let hasActivityLayer: boolean = false;
  let span: Span | null;
  let hasCreatePermission: boolean = false;
  let timelines: Timeline[] = [];
  let mouseOverOrigin: MouseOverOrigin | undefined = undefined;
  let permissionErrorText: string | null = null;
  let row: Row | undefined = undefined;
  let offsetX: number | undefined;

  // TODO imports here could be better, should we handle the vertical guide creation in Timeline?
  $: timelines = $view?.definition.plan.timelines ?? [];

  $: if (contextMenu && contextMenuComponent) {
    const { e, selectedActivityDirectiveId, selectedSpanId, origin, row: selectedRow } = contextMenu;
    row = selectedRow;
    mouseOverOrigin = origin;
    contextMenuComponent.show(e);
    activityDirective = null;
    span = null;
    activityDirectiveSpans = null;
    hasActivityLayer = false;

    if (row) {
      discreteOptions = row.discreteOptions;
      activityOptions = row.discreteOptions?.activityOptions;
      hasActivityLayer = !!row.layers.find(isActivityLayer);
    }

    if (selectedActivityDirectiveId != null) {
      activityDirective = activityDirectivesMap[selectedActivityDirectiveId];
      activityDirectiveSpans = getAllSpansForActivityDirective(selectedActivityDirectiveId, spansMap, spanUtilityMaps);
    } else if (selectedSpanId != null) {
      span = spansMap[selectedSpanId];
    }
  } else {
    activityDirective = null;
    span = null;
    activityOptions = undefined;
    activityDirectiveSpans = null;
    hasActivityLayer = false;
  }

  $: startYmd = simulationDataset?.simulation_start_time ?? planStartTimeYmd;
  $: activityDirectiveStartDate = activityDirective
    ? new Date(getUnixEpochTimeFromInterval(planStartTimeYmd, activityDirective.start_offset))
    : null;
  // Explicitly keep track of offsetX because Firefox ends up zeroing it out on the original `contextmenu` MouseEvent
  $: offsetX = contextMenu?.e.offsetX;

  $: hasCreatePermission = plan !== null && featurePermissions.activityDirective.canCreate(user, plan);

  $: {
    if ($planReadOnly) {
      permissionErrorText = PlanStatusMessages.READ_ONLY;
    } else if (!hasCreatePermission) {
      permissionErrorText = 'You do not have permission create activity directives';
    } else {
      permissionErrorText = null;
    }
  }

  function jumpToActivityDirective() {
    if (span !== null) {
      const rootSpan = getSpanRootParent(spansMap, span.span_id);
      if (rootSpan) {
        const activityDirectiveId = spanUtilityMaps.spanIdToDirectiveIdMap[rootSpan.span_id];
        dispatch('jumpToActivityDirective', activityDirectiveId);
      }
    }
  }

  function addVerticalGuide(date: Date) {
    const cursorDOY = getDoyTime(date);
    const newVerticalGuide = createVerticalGuide(timelines, cursorDOY);
    dispatch('updateVerticalGuides', [...verticalGuides, newVerticalGuide]);
  }

  function switchToSimulation() {
    viewUpdateGrid({ leftComponentTop: 'SimulationPanel' });
  }

  function updateSimulationStartTime(date: Date | null) {
    if (simulation !== null && date !== null && plan !== null) {
      const doyString = getDoyTime(date, false);
      const newSimulation: Simulation = { ...simulation, simulation_start_time: doyString };
      effects.updateSimulation(plan, newSimulation, user);
      switchToSimulation();
    }
  }

  function updateSimulationEndTime(date: Date | null) {
    if (simulation !== null && date !== null && plan !== null) {
      const doyString = getDoyTime(date, false);
      const newSimulation: Simulation = { ...simulation, simulation_end_time: doyString };
      effects.updateSimulation(plan, newSimulation, user);
      switchToSimulation();
    }
  }

  function getSpanDate(span: Span, includeDuration: boolean = false) {
    const duration = includeDuration ? getIntervalInMs(span.duration) : 0;
    return new Date(getUnixEpochTimeFromInterval(startYmd, span.start_offset) + duration);
  }

  function onFocus(duration: number) {
    if (xScaleView && contextMenu && span) {
      const start = getSpanDate(span);
      const end = getSpanDate(span, true);
      const newViewTimeRange: TimeRange = {
        end: Math.min(end.getTime() + duration, maxTimeRange.end),
        start: Math.max(start.getTime() - duration, maxTimeRange.start),
      };
      dispatch('viewTimeRangeChanged', newViewTimeRange);
    }
  }

  function onZoom(duration: number) {
    if (xScaleView && offsetX !== undefined) {
      const time = activityDirectiveStartDate ? activityDirectiveStartDate : xScaleView.invert(offsetX);
      const newViewTimeRange: TimeRange = {
        end: Math.min(time.getTime() + duration / 2, maxTimeRange.end),
        start: Math.max(time.getTime() - duration / 2, maxTimeRange.start),
      };
      dispatch('viewTimeRangeChanged', newViewTimeRange);
    }
  }

  function onZoomHome() {
    dispatch('viewTimeRangeReset');
  }

  function onEditRow() {
    if (row) {
      dispatch('editRow', row);
    }
  }

  function onDeleteRow() {
    if (row) {
      dispatch('deleteRow', row);
    }
  }

  function onMoveRowUp() {
    if (row) {
      dispatch('moveRow', { direction: 'up', row });
    }
  }

  function onMoveRowDown() {
    if (row) {
      dispatch('moveRow', { direction: 'down', row });
    }
  }

  function onInsertRow() {
    if (row) {
      dispatch('insertRow', row);
    }
  }

  function onDuplicateRow() {
    if (row) {
      dispatch('duplicateRow', row);
    }
  }

  function onCollapseDiscreteTree() {
    if (row) {
      dispatch('collapseDiscreteTree', row);
    }
  }

  function onShowDirectivesAndActivitiesChange(value: string | undefined) {
    if (row) {
      dispatch('toggleActivityComposition', { composition: value as ActivityOptions['composition'], row });
    }
  }

  export function hide() {
    contextMenuComponent.hide();
  }

  export function isShown() {
    return contextMenuComponent.isShown();
  }

  function copyActivityDirective(activity: ActivityDirective) {
    plan !== null && copyActivityDirectivesToClipboard(plan, [activity]);
  }

  function getDateUnderMouse(): Date | undefined {
    if (xScaleView && offsetX !== undefined) {
      return xScaleView.invert(offsetX);
    }
  }

  async function createActivityDirectives({ detail }: CustomEvent<ActivityDirective[]>) {
    if (plan !== null && hasCreatePermission) {
      await effects.cloneActivityDirectives(detail, plan, user);
    }
  }
</script>

<ContextMenuInternal on:hide bind:this={contextMenuComponent}>
  {#if mouseOverOrigin !== 'row-header'}
    {#if activityDirective}
      {#if activityDirectiveSpans && activityDirectiveSpans.length}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger size="sm">Jump to Simulated Activities</ContextMenu.SubTrigger>
          <ContextMenu.SubContent class="w-48">
            {#each activityDirectiveSpans as activityDirectiveSpan}
              <ContextMenu.Item size="sm" on:click={() => dispatch('jumpToSpan', activityDirectiveSpan.span_id)}>
                {activityDirectiveSpan.type} ({activityDirectiveSpan.span_id})
              </ContextMenu.Item>
            {/each}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        <ContextMenu.Separator />
      {/if}
      {#if activityDirective.anchor_id !== null}
        <ContextMenu.Item
          size="sm"
          on:click={() => {
            if (activityDirective !== null && activityDirective.anchor_id !== null) {
              dispatch('jumpToActivityDirective', activityDirective.anchor_id);
            }
          }}
        >
          Jump to Anchor Directive ({activityDirective.anchor_id})
        </ContextMenu.Item>
      {/if}
      <ContextMenu.Item
        size="sm"
        on:click={() => {
          if (activityDirectiveStartDate !== null) {
            addVerticalGuide(activityDirectiveStartDate);
          }
        }}
      >
        Place Guide at Directive Start
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <div
        use:permissionHandler={{
          hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to update this simulation',
        }}
      >
        <ContextMenu.Item
          size="sm"
          disabled={!(hasUpdateSimulationPermission && !$planReadOnly)}
          on:click={() => updateSimulationStartTime(activityDirectiveStartDate)}
        >
          Set Simulation Start at Directive Start
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to update this simulation',
        }}
      >
        <ContextMenu.Item
          size="sm"
          disabled={!(hasUpdateSimulationPermission && !$planReadOnly)}
          on:click={() => updateSimulationEndTime(activityDirectiveStartDate)}
        >
          Set Simulation End at Directive Start
        </ContextMenu.Item>
      </div>
      <ContextMenu.Separator />
      <ContextMenu.Item
        size="sm"
        on:click={() => activityDirective !== null && copyActivityDirective(activityDirective)}
      >
        Copy Activity Directive
      </ContextMenu.Item>
      <div
        use:permissionHandler={{
          hasPermission: hasUpdateDirectivePermission && !$planReadOnly,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to delete this activity',
        }}
      >
        <ContextMenu.Item
          size="sm"
          disabled={!(hasUpdateSimulationPermission && !$planReadOnly)}
          on:click={() => {
            if (activityDirective !== null) {
              dispatch('deleteActivityDirective', activityDirective.id);
            }
          }}
        >
          Delete Activity Directive
        </ContextMenu.Item>
      </div>
    {:else if span}
      <ContextMenu.Item size="sm" on:click={jumpToActivityDirective}>Jump to Activity Directive</ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger size="sm">Place Guide</ContextMenu.SubTrigger>
        <ContextMenu.SubContent class="w-48">
          <ContextMenu.Item size="sm" on:click={() => span && addVerticalGuide(getSpanDate(span))}>
            At Simulated Activity Start
          </ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => span && addVerticalGuide(getSpanDate(span, true))}>
            At Simulated Activity End
          </ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <ContextMenu.Sub>
        <ContextMenu.SubTrigger size="sm">Set Simulation Start</ContextMenu.SubTrigger>
        <ContextMenu.SubContent class="w-48">
          <ContextMenu.Item size="sm" on:click={() => span && updateSimulationStartTime(getSpanDate(span))}>
            At Simulated Activity Start
          </ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => span && updateSimulationStartTime(getSpanDate(span, true))}>
            At Simulated Activity End
          </ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>

      <ContextMenu.Separator />

      <ContextMenu.Sub>
        <ContextMenu.SubTrigger size="sm">Set Simulation End</ContextMenu.SubTrigger>
        <ContextMenu.SubContent class="w-48">
          <ContextMenu.Item size="sm" on:click={() => span && updateSimulationEndTime(getSpanDate(span))}>
            At Simulated Activity Start
          </ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => span && updateSimulationEndTime(getSpanDate(span, true))}>
            At Simulated Activity End
          </ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
    {:else}
      <ContextMenu.Item
        size="sm"
        on:click={() => xScaleView && offsetX !== undefined && addVerticalGuide(xScaleView.invert(offsetX))}
      >
        Place Guide
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <div
        use:permissionHandler={{
          hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to update the simulation',
        }}
      >
        <ContextMenu.Item
          size="sm"
          disabled={!(hasUpdateSimulationPermission && !$planReadOnly)}
          on:click={() => xScaleView && offsetX !== undefined && updateSimulationStartTime(xScaleView.invert(offsetX))}
        >
          Set Simulation Start
        </ContextMenu.Item>
      </div>
      <div
        use:permissionHandler={{
          hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
          permissionError: $planReadOnly
            ? PlanStatusMessages.READ_ONLY
            : 'You do not have permission to update the simulation',
        }}
      >
        <ContextMenu.Item
          size="sm"
          disabled={!(hasUpdateSimulationPermission && !$planReadOnly)}
          on:click={() => xScaleView && offsetX !== undefined && updateSimulationEndTime(xScaleView.invert(offsetX))}
        >
          Set Simulation End
        </ContextMenu.Item>
      </div>
      <ContextMenu.Separator />
      <PasteActivitiesContextMenu
        atTime={getDateUnderMouse()}
        {hasCreatePermission}
        {plan}
        planPermissionErrorText={permissionErrorText}
        on:createActivityDirectives={createActivityDirectives}
      />
    {/if}
    <ContextMenu.Separator />
    {#if span}
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger size="sm">Zoom around Simulated Activity</ContextMenu.SubTrigger>
        <ContextMenu.SubContent class="w-48">
          <ContextMenu.Item size="sm" on:click={() => onZoomHome()}>Reset Zoom</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.MILLISECOND)}>
            1 Millisecond Padding</ContextMenu.Item
          >
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.MILLISECOND * 10)}>
            10 Millisecond Padding</ContextMenu.Item
          >
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.MILLISECOND * 50)}>
            50 Millisecond Padding</ContextMenu.Item
          >
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.SECOND)}>1 Second Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.SECOND * 30)}>30 Second Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.MINUTE)}>1 Minute Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.MINUTE * 30)}>30 Minute Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.HOUR)}>1 Hour Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.HOUR * 12)}>12 Hour Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.DAY)}>1 Day Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.DAY * 3)}>3 Day Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.DAY * 7)}>1 Week Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.MONTH)}>1 Month Padding</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onFocus(TIME_MS.YEAR)}>1 Year Padding</ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
      <ContextMenu.Separator />
    {:else}
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger size="sm"
          >Zoom{activityDirective ? ' around Activity Directive' : ''}</ContextMenu.SubTrigger
        >
        <ContextMenu.SubContent class="w-48">
          <ContextMenu.Item size="sm" on:click={() => onZoomHome()}>Reset Zoom</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.MILLISECOND)}>1 Millisecond</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.MILLISECOND * 10)}>
            10 Milliseconds</ContextMenu.Item
          >
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.MILLISECOND * 50)}>
            50 Milliseconds</ContextMenu.Item
          >
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.SECOND)}>1 Second</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.SECOND * 30)}>30 Seconds</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.MINUTE)}>1 Minute</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.MINUTE * 30)}>30 Minutes</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.HOUR)}>1 Hour</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.HOUR * 12)}>12 Hours</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.DAY)}>1 Day</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.DAY * 3)}>3 Days</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.DAY * 7)}>1 Week</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.MONTH)}>1 Month</ContextMenu.Item>
          <ContextMenu.Item size="sm" on:click={() => onZoom(TIME_MS.YEAR)}>1 Year</ContextMenu.Item>
        </ContextMenu.SubContent>
      </ContextMenu.Sub>
      <ContextMenu.Separator />
    {/if}
  {/if}
  <ContextMenu.Item size="sm" on:click={onEditRow}>Edit Row</ContextMenu.Item>
  <ContextMenu.Item size="sm" on:click={onMoveRowUp}>Move Row Up</ContextMenu.Item>
  <ContextMenu.Item size="sm" on:click={onMoveRowDown}>Move Row Down</ContextMenu.Item>
  <ContextMenu.Item size="sm" on:click={onInsertRow}>Insert Row</ContextMenu.Item>
  <ContextMenu.Item size="sm" on:click={onDuplicateRow}>Duplicate Row</ContextMenu.Item>
  <ContextMenu.Item size="sm" on:click={onDeleteRow}>Delete Row</ContextMenu.Item>
  {#if hasActivityLayer}
    {#if discreteOptions?.displayMode === 'grouped'}
      <ContextMenu.Separator />
      <ContextMenu.Item size="sm" on:click={onCollapseDiscreteTree}>Collapse All Hierarchies</ContextMenu.Item>
    {/if}
    <ContextMenu.Separator />
    <ContextMenu.RadioGroup onValueChange={onShowDirectivesAndActivitiesChange} value={activityOptions?.composition}>
      <ContextMenu.RadioItem size="sm" value="directives" id="directives"
        >Show activity directives</ContextMenu.RadioItem
      >
      <ContextMenu.RadioItem size="sm" value="spans" id="spans">Show simulated activities</ContextMenu.RadioItem>
      <ContextMenu.RadioItem size="sm" value="both" id="both">Show both</ContextMenu.RadioItem>
    </ContextMenu.RadioGroup>
  {/if}
</ContextMenuInternal>
