<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher } from 'svelte';
  import { view, viewUpdateGrid } from '../../stores/views';
  import type { ActivityDirective, ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { Simulation, SimulationDataset, Span, SpanUtilityMaps, SpansMap } from '../../types/simulation';
  import type { MouseOver, VerticalGuide } from '../../types/timeline';
  import { getAllSpansForActivityDirective, getSpanRootParent } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { getDoyTime, getIntervalInMs, getUnixEpochTimeFromInterval } from '../../utilities/time';
  import { createVerticalGuide } from '../../utilities/timeline';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import ContextMenuSeparator from '../context-menu/ContextMenuSeparator.svelte';
  import ContextSubMenuItem from '../context-menu/ContextSubMenuItem.svelte';

  export let activityDirectivesMap: ActivityDirectivesMap;
  export let hasUpdatePlanPermission: boolean = false;
  export let simulation: Simulation | null;
  export let simulationDataset: SimulationDataset | null = null;
  export let spansMap: SpansMap;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let planStartTimeYmd: string;
  export let contextMenu: MouseOver | null;
  export let verticalGuides: VerticalGuide[];
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let user: User | null;

  const dispatch = createEventDispatcher();
  let contextMenuComponent: ContextMenu;
  let activityDirective: ActivityDirective | null;
  let activityDirectiveSpans: Span[] | null = [];
  let span: Span | null;

  // TODO imports here could be better, should we handle the vertical guide creation in Timeline?
  $: timelines = $view?.definition.plan.timelines ?? [];

  $: if (contextMenu && contextMenuComponent) {
    const { e, selectedActivityDirectiveId, selectedSpanId } = contextMenu;
    contextMenuComponent.show(e);
    activityDirective = null;
    span = null;
    activityDirectiveSpans = null;

    if (selectedActivityDirectiveId !== undefined) {
      activityDirective = activityDirectivesMap[selectedActivityDirectiveId];
      activityDirectiveSpans = getAllSpansForActivityDirective(selectedActivityDirectiveId, spansMap, spanUtilityMaps);
    } else if (selectedSpanId !== undefined) {
      span = spansMap[selectedSpanId];
    }
  } else {
    activityDirective = null;
    span = null;
    activityDirectiveSpans = null;
  }

  $: startYmd = simulationDataset?.simulation_start_time ?? planStartTimeYmd;
  $: activityDirectiveStartDate = activityDirective
    ? new Date(getUnixEpochTimeFromInterval(planStartTimeYmd, activityDirective.start_offset))
    : null;

  function jumpToActivityDirective() {
    if (span !== null) {
      const rootSpan = getSpanRootParent(spansMap, span.id);
      if (rootSpan) {
        const activityDirectiveId = spanUtilityMaps.spanIdToDirectiveIdMap[rootSpan.id];
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
    if (simulation !== null && date !== null) {
      const doyString = getDoyTime(date, false);
      const newSimulation: Simulation = { ...simulation, simulation_start_time: doyString };
      effects.updateSimulation(newSimulation, user);
      switchToSimulation();
    }
  }

  function updateSimulationEndTime(date: Date | null) {
    if (simulation !== null && date !== null) {
      const doyString = getDoyTime(date, false);
      const newSimulation: Simulation = { ...simulation, simulation_end_time: doyString };
      effects.updateSimulation(newSimulation, user);
      switchToSimulation();
    }
  }

  function getSpanDate(span: Span, includeDuration: boolean = false) {
    const duration = includeDuration ? getIntervalInMs(span.duration) : 0;
    return new Date(getUnixEpochTimeFromInterval(startYmd, span.start_offset) + duration);
  }
</script>

<ContextMenu hideAfterClick on:hide bind:this={contextMenuComponent}>
  {#if activityDirective}
    {#if activityDirectiveSpans && activityDirectiveSpans.length}
      <ContextSubMenuItem text="Jump to Simulated Activities" parentMenu={contextMenuComponent}>
        {#each activityDirectiveSpans as activityDirectiveSpan}
          <ContextMenuItem on:click={() => dispatch('jumpToSpan', activityDirectiveSpan.id)}>
            {activityDirectiveSpan.type} ({activityDirectiveSpan.id})
          </ContextMenuItem>
        {/each}
      </ContextSubMenuItem>
      <ContextMenuSeparator />
    {/if}

    {#if activityDirective.anchor_id !== null}
      <ContextMenuItem
        on:click={() => {
          if (activityDirective !== null) {
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
            hasPermission: hasUpdatePlanPermission,
            permissionError: 'You do not have permission to update this plan',
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
            hasPermission: hasUpdatePlanPermission,
            permissionError: 'You do not have permission to update this plan',
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
            hasPermission: hasUpdatePlanPermission,
            permissionError: 'You do not have permission to update this plan',
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
      on:click={() => xScaleView && contextMenu && addVerticalGuide(xScaleView.invert(contextMenu.e.offsetX))}
    >
      Place Guide
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      on:click={() => xScaleView && contextMenu && updateSimulationStartTime(xScaleView.invert(contextMenu.e.offsetX))}
      use={[
        [
          permissionHandler,
          {
            hasPermission: hasUpdatePlanPermission,
            permissionError: 'You do not have permission to update the simulation',
          },
        ],
      ]}
    >
      Set Simulation Start
    </ContextMenuItem>
    <ContextMenuItem
      on:click={() => xScaleView && contextMenu && updateSimulationEndTime(xScaleView.invert(contextMenu.e.offsetX))}
      use={[
        [
          permissionHandler,
          {
            hasPermission: hasUpdatePlanPermission,
            permissionError: 'You do not have permission to update the simulation',
          },
        ],
      ]}
    >
      Set Simulation End
    </ContextMenuItem>
  {/if}
</ContextMenu>
