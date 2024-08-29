<svelte:options immutable={true} />

<script lang="ts">
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
    MouseOver,
    MouseOverOrigin,
    Row,
    Timeline,
    TimeRange,
    VerticalGuide,
  } from '../../types/timeline';
  import { getAllSpansForActivityDirective, getSpanRootParent } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { getDoyTime, getIntervalInMs, getUnixEpochTimeFromInterval } from '../../utilities/time';
  import { createVerticalGuide, isActivityLayer } from '../../utilities/timeline';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import ContextMenuSeparator from '../context-menu/ContextMenuSeparator.svelte';
  import ContextSubMenuItem from '../context-menu/ContextSubMenuItem.svelte';

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
    collapseActivityTree: Row;
    deleteActivityDirective: number;
    deleteRow: Row;
    duplicateRow: Row;
    editRow: Row;
    insertRow: Row;
    jumpToActivityDirective: number;
    jumpToSpan: number;
    moveRow: { direction: 'up' | 'down'; row: Row };
    toggleActivityComposition: { composition: ActivityOptions['composition']; row: Row };
    updateVerticalGuides: VerticalGuide[];
    viewTimeRangeChanged: TimeRange;
    viewTimeRangeReset: void;
  }>();
  let activityOptions: ActivityOptions | undefined;
  let activityDirective: ActivityDirective | null;
  let activityDirectiveSpans: Span[] | null = [];
  let activityDirectiveStartDate: Date | null = null;
  let contextMenuComponent: ContextMenu;
  let span: Span | null;
  let timelines: Timeline[] = [];
  let hasActivityLayer: boolean = false;
  let mouseOverOrigin: MouseOverOrigin | undefined = undefined;
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
      activityOptions = row.activityOptions;
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

  function onCollapseActivityTree() {
    if (row) {
      dispatch('collapseActivityTree', row);
    }
  }

  function onShowDirectivesAndActivitiesChange(event: Event) {
    const { value } = getTarget(event);
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
</script>

<ContextMenu hideAfterClick on:hide bind:this={contextMenuComponent}>
  <!-- TODO should we show the row editing menu items when a directive or span is selected? -->
  {#if mouseOverOrigin !== 'row-header'}
    {#if activityDirective}
      {#if activityDirectiveSpans && activityDirectiveSpans.length}
        <ContextSubMenuItem text="Jump to Simulated Activities" parentMenu={contextMenuComponent}>
          {#each activityDirectiveSpans as activityDirectiveSpan}
            <ContextMenuItem on:click={() => dispatch('jumpToSpan', activityDirectiveSpan.span_id)}>
              {activityDirectiveSpan.type} ({activityDirectiveSpan.span_id})
            </ContextMenuItem>
          {/each}
        </ContextSubMenuItem>
        <ContextMenuSeparator />
      {/if}
      {#if activityDirective.anchor_id !== null}
        <ContextMenuItem
          on:click={() => {
            if (activityDirective !== null && activityDirective.anchor_id !== null) {
              dispatch('jumpToActivityDirective', activityDirective.anchor_id);
            }
          }}
        >
          Jump to Anchor Directive ({activityDirective.anchor_id})
        </ContextMenuItem>
      {/if}
      <ContextMenuItem
        on:click={() => {
          if (activityDirectiveStartDate !== null) {
            addVerticalGuide(activityDirectiveStartDate);
          }
        }}
      >
        Place Guide at Directive Start
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        on:click={() => updateSimulationStartTime(activityDirectiveStartDate)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to update this simulation',
            },
          ],
        ]}
      >
        Set Simulation Start at Directive Start
      </ContextMenuItem>
      <ContextMenuItem
        on:click={() => updateSimulationEndTime(activityDirectiveStartDate)}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to update this simulation',
            },
          ],
        ]}
      >
        Set Simulation End at Directive Start
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        on:click={() => {
          if (activityDirective !== null) {
            dispatch('deleteActivityDirective', activityDirective.id);
          }
        }}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdateDirectivePermission && !$planReadOnly,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to delete this activity',
            },
          ],
        ]}
      >
        Delete Directive
      </ContextMenuItem>
    {:else if span}
      <ContextMenuItem on:click={jumpToActivityDirective}>Jump to Activity Directive</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextSubMenuItem text="Place Guide" parentMenu={contextMenuComponent}>
        <ContextMenuItem on:click={() => span && addVerticalGuide(getSpanDate(span))}>
          At Simulated Activity Start
        </ContextMenuItem>
        <ContextMenuItem on:click={() => span && addVerticalGuide(getSpanDate(span, true))}>
          At Simulated Activity End
        </ContextMenuItem>
      </ContextSubMenuItem>
      <ContextMenuSeparator />
      <ContextSubMenuItem text="Set Simulation Start" parentMenu={contextMenuComponent}>
        <ContextMenuItem on:click={() => span && updateSimulationStartTime(getSpanDate(span))}>
          At Simulated Activity Start
        </ContextMenuItem>
        <ContextMenuItem on:click={() => span && updateSimulationStartTime(getSpanDate(span, true))}>
          At Simulated Activity End
        </ContextMenuItem>
      </ContextSubMenuItem>
      <ContextSubMenuItem text="Set Simulation End" parentMenu={contextMenuComponent}>
        <ContextMenuItem on:click={() => span && updateSimulationEndTime(getSpanDate(span))}>
          At Simulated Activity Start
        </ContextMenuItem>
        <ContextMenuItem on:click={() => span && updateSimulationEndTime(getSpanDate(span, true))}>
          At Simulated Activity End
        </ContextMenuItem>
      </ContextSubMenuItem>
    {:else}
      <ContextMenuItem
        on:click={() => xScaleView && offsetX !== undefined && addVerticalGuide(xScaleView.invert(offsetX))}
      >
        Place Guide
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to update the simulation',
            },
          ],
        ]}
        on:click={() => xScaleView && offsetX !== undefined && updateSimulationStartTime(xScaleView.invert(offsetX))}
      >
        Set Simulation Start
      </ContextMenuItem>
      <ContextMenuItem
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasUpdateSimulationPermission && !$planReadOnly,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to update the simulation',
            },
          ],
        ]}
        on:click={() => xScaleView && offsetX !== undefined && updateSimulationEndTime(xScaleView.invert(offsetX))}
      >
        Set Simulation End
      </ContextMenuItem>
    {/if}
    <ContextMenuSeparator />
    {#if span}
      <ContextSubMenuItem text="Zoom around Simulated Activity" parentMenu={contextMenuComponent}>
        <ContextMenuItem on:click={() => onZoomHome()}>Reset Zoom</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem on:click={() => onFocus(TIME_MS.MILLISECOND)}>1 Millisecond Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.MILLISECOND * 10)}>10 Millisecond Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.MILLISECOND * 50)}>50 Millisecond Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.SECOND)}>1 Second Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.SECOND * 30)}>30 Second Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.MINUTE)}>1 Minute Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.MINUTE * 30)}>30 Minute Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.HOUR)}>1 Hour Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.HOUR * 12)}>12 Hour Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.DAY)}>1 Day Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.DAY * 3)}>3 Day Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.DAY * 7)}>1 Week Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.MONTH)}>1 Month Padding</ContextMenuItem>
        <ContextMenuItem on:click={() => onFocus(TIME_MS.YEAR)}>1 Year Padding</ContextMenuItem>
      </ContextSubMenuItem>
      <ContextMenuSeparator />
    {:else}
      <ContextSubMenuItem
        text={`Zoom${activityDirective ? ' around Activity Directive' : ''}`}
        parentMenu={contextMenuComponent}
      >
        <ContextMenuItem on:click={() => onZoomHome()}>Reset Zoom</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem on:click={() => onZoom(TIME_MS.MILLISECOND)}>1 Millisecond</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.MILLISECOND * 10)}>10 Milliseconds</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.MILLISECOND * 50)}>50 Milliseconds</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.SECOND)}>1 Second</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.SECOND * 30)}>30 Seconds</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.MINUTE)}>1 Minute</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.MINUTE * 30)}>30 Minutes</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.HOUR)}>1 Hour</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.HOUR * 12)}>12 Hours</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.DAY)}>1 Day</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.DAY * 3)}>3 Days</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.DAY * 7)}>1 Week</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.MONTH)}>1 Month</ContextMenuItem>
        <ContextMenuItem on:click={() => onZoom(TIME_MS.YEAR)}>1 Year</ContextMenuItem>
      </ContextSubMenuItem>
      <ContextMenuSeparator />
    {/if}
  {/if}
  <ContextMenuItem on:click={onEditRow}>Edit Row</ContextMenuItem>
  <ContextMenuItem on:click={onMoveRowUp}>Move Row Up</ContextMenuItem>
  <ContextMenuItem on:click={onMoveRowDown}>Move Row Down</ContextMenuItem>
  <ContextMenuItem on:click={onInsertRow}>Insert Row</ContextMenuItem>
  <ContextMenuItem on:click={onDuplicateRow}>Duplicate Row</ContextMenuItem>
  <ContextMenuItem on:click={onDeleteRow}>Delete Row</ContextMenuItem>
  {#if hasActivityLayer}
    {#if activityOptions?.displayMode === 'grouped'}
      <ContextMenuSeparator />
      <ContextMenuItem on:click={onCollapseActivityTree}>Collapse All Hierarchies</ContextMenuItem>
    {/if}
    <ContextMenuSeparator />
    <div role="radiogroup" class="st-radio-group">
      <label for="directives" class="st-radio-option st-typography-body">
        <input
          id="directives"
          type="radio"
          value="directives"
          checked={activityOptions?.composition === 'directives'}
          on:change={onShowDirectivesAndActivitiesChange}
        />
        Show activity directives
      </label>
      <label for="spans" class="st-radio-option st-typography-body">
        <input
          id="spans"
          type="radio"
          value="spans"
          checked={activityOptions?.composition === 'spans'}
          on:change={onShowDirectivesAndActivitiesChange}
        />
        Show simulated activities
      </label>
      <label for="both" class="st-radio-option st-typography-body">
        <input
          id="both"
          type="radio"
          value="both"
          checked={activityOptions?.composition === 'both'}
          on:change={onShowDirectivesAndActivitiesChange}
        />
        Show both
      </label>
    </div>
  {/if}
</ContextMenu>

<style>
  /* TODO move this to stellar at some point or at least aerie stellar overrides */
  .st-radio-group {
    display: flex;
    flex-direction: column;
  }

  .st-radio-option {
    align-items: center;
    display: flex;
    justify-content: flex-start;
    padding: 4px 8px 4px 4px;
  }

  .st-radio-option input {
    margin: 4px;
  }
</style>
