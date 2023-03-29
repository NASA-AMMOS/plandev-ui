<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher } from 'svelte';
  import { view } from '../../stores/views';
  import type { ActivityDirective, ActivityDirectivesMap } from '../../types/activity';
  import type { Span, SpansMap, SpanUtilityMaps } from '../../types/simulation';
  import type { MouseOver, VerticalGuide } from '../../types/timeline';
  import { getAllSpansForActivityDirective, getSpanRootParent } from '../../utilities/activities';
  import { getDoyTime, getIntervalInMs, getUnixEpochTimeFromInterval } from '../../utilities/time';
  import { createVerticalGuide } from '../../utilities/timeline';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import ContextSubMenuItem from '../context-menu/ContextSubMenuItem.svelte';

  export let activityDirectivesMap: ActivityDirectivesMap;
  export let spansMap: SpansMap;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let planStartTimeYmd: string;
  export let contextMenu: MouseOver | undefined;
  export let verticalGuides: VerticalGuide[];
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();
  let contextMenuComponent: ContextMenu;
  let activityDirective: ActivityDirective;
  let activityDirectiveSpans: Span[] = [];
  let span: Span;

  // TODO imports here could be better, should we handle the vertical guide creation in Timeline?
  $: timelines = $view.definition.plan.timelines;

  $: if (contextMenu && contextMenuComponent) {
    const { e, selectedActivityDirectiveId, selectedSpanId } = contextMenu;
    contextMenuComponent.show(e);
    activityDirective = null;
    span = null;
    activityDirectiveSpans = null;

    if (typeof selectedActivityDirectiveId === 'number') {
      activityDirective = activityDirectivesMap[selectedActivityDirectiveId];
      activityDirectiveSpans = getAllSpansForActivityDirective(selectedActivityDirectiveId, spansMap, spanUtilityMaps);
    } else if (typeof selectedSpanId === 'number') {
      span = spansMap[selectedSpanId];
    }
  } else {
    activityDirective = null;
    span = null;
    activityDirectiveSpans = null;
  }

  function jumpToActivityDirective() {
    const rootSpan = getSpanRootParent(spansMap, span.id);
    if (rootSpan) {
      const activityDirectiveId = spanUtilityMaps.spanIdToDirectiveIdMap[rootSpan.id];
      dispatch('jumpToActivityDirective', activityDirectiveId);
    }
  }

  function addVerticalGuide(date: Date) {
    const cursorDOY = getDoyTime(date);
    const newVerticalGuide = createVerticalGuide(timelines, cursorDOY);
    dispatch('updateVerticalGuides', [...verticalGuides, newVerticalGuide]);
  }
</script>

<ContextMenu hideAfterClick on:hide bind:this={contextMenuComponent}>
  {#if activityDirective}
    <ContextMenuItem on:click={() => dispatch('deleteActivityDirective', activityDirective.id)}>
      Delete Directive
    </ContextMenuItem>
    {#if activityDirectiveSpans}
      <ContextSubMenuItem text="Jump to Simulated Activities" parentMenu={contextMenuComponent}>
        {#each activityDirectiveSpans as activityDirectiveSpan}
          <ContextMenuItem on:click={() => dispatch('jumpToSpan', activityDirectiveSpan.id)}>
            {activityDirectiveSpan.type} ({activityDirectiveSpan.id})
          </ContextMenuItem>
        {/each}
      </ContextSubMenuItem>
    {/if}

    {#if activityDirective.anchor_id !== null}
      <ContextMenuItem on:click={() => dispatch('jumpToActivityDirective', activityDirective.anchor_id)}>
        Jump to Anchor Directive ({activityDirective.anchor_id})
      </ContextMenuItem>
    {/if}
    <ContextMenuItem
      on:click={() => {
        addVerticalGuide(new Date(getUnixEpochTimeFromInterval(planStartTimeYmd, activityDirective.start_offset)));
      }}
    >
      Place Guide at Directive Start
    </ContextMenuItem>
  {:else if span}
    <ContextMenuItem on:click={jumpToActivityDirective}>Jump to Activity Directive</ContextMenuItem>
    <ContextMenuItem
      on:click={() => {
        addVerticalGuide(new Date(getUnixEpochTimeFromInterval(planStartTimeYmd, span.start_offset)));
      }}
    >
      Place Guide at Simulated Activity Start
    </ContextMenuItem>
    <ContextMenuItem
      on:click={() => {
        const duration = getIntervalInMs(span.duration);
        addVerticalGuide(new Date(getUnixEpochTimeFromInterval(planStartTimeYmd, span.start_offset) + duration));
      }}
    >
      Place Guide at Simulated Activity End
    </ContextMenuItem>
  {:else}
    <ContextMenuItem on:click={() => addVerticalGuide(xScaleView.invert(contextMenu.e.offsetX))}>
      Place Guide
    </ContextMenuItem>
  {/if}
</ContextMenu>
