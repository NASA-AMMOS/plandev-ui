<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { Span, SpanId, SpansMap, SpanUtilityMaps } from '../../types/simulation';
  import type { ActivityLayerFilter, BoundingBox, QuadtreeRect, TimeRange } from '../../types/timeline';
  import { sortActivityDirectives } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { isDeleteEvent } from '../../utilities/keyboardEvents';
  import {
    getActivityDirectiveStartTimeMs,
    getDoyTime,
    getIntervalInMs,
    getIntervalUnixEpochTime,
    getUnixEpochTime,
    getUnixEpochTimeFromInterval,
  } from '../../utilities/time';
  import { searchQuadtreeRect, TimelineLockStatus } from '../../utilities/timeline';

  export let activityDirectives: ActivityDirective[] = [];
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityColor: string = '';
  export let activityHeight: number = 20;
  export let activityRowPadding: number = 20;
  export let activitySelectedColor: string = '#81D4FA';
  export let activityUnfinishedColor: string = '#ff7760';
  export let blur: FocusEvent | undefined;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ActivityLayerFilter | undefined;
  export let id: number;
  export let focus: FocusEvent | undefined;
  export let mousedown: MouseEvent | undefined;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let mouseup: MouseEvent | undefined;
  export let planEndTimeDoy: string;
  export let planId: number;
  export let planStartTimeYmd: string;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap = {};
  export let timelineLockStatus: TimelineLockStatus;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let dpr: number = 1;
  let dragCurrentX: number | null = null;
  let dragOffsetX: number | null = null;
  let dragPreviousX: number | null = null;
  let dragActivityDirectiveActive: ActivityDirective | null = null;
  let dragStartX: number | null = null;
  let maxActivityWidth: number;
  let quadtreeActivityDirectives: Quadtree<QuadtreeRect>;
  let quadtreeSpans: Quadtree<QuadtreeRect>;
  let visibleActivityDirectivesById: Record<ActivityDirectiveId, ActivityDirective> = {};
  let visibleSpansById: Record<SpanId, Span> = {};

  $: onBlur(blur);
  $: onFocus(focus);
  $: onMousedown(mousedown);
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: onMouseup(mouseup);

  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: rowHeight = activityHeight + activityRowPadding;
  $: timelineLocked = timelineLockStatus === TimelineLockStatus.Locked;

  $: if (
    activityDirectives &&
    activityColor &&
    activityHeight &&
    ctx &&
    drawHeight &&
    drawWidth &&
    filter &&
    selectedActivityDirectiveId !== undefined &&
    selectedSpanId !== undefined &&
    spansMap &&
    viewTimeRange &&
    xScaleView
  ) {
    draw();
  }

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      dpr = window.devicePixelRatio;
    }
  });

  onDestroy(() => removeKeyDownEvent());

  function dragActivityDirectiveStart(activityDirectives: ActivityDirective[], offsetX: number): void {
    if (activityDirectives.length) {
      const [activityDirective] = activityDirectives; // Select just the first one for now.

      const x = getUnixEpochTimeFromInterval(planStartTimeYmd, activityDirective.start_offset);
      dragOffsetX = offsetX - xScaleView(x);
      dragActivityDirectiveActive = activityDirective; // Pointer of the active drag activity.
      dragStartX = x;
      dragCurrentX = x;
      dragPreviousX = x;
    }
  }

  function dragActivityDirective(offsetX: number): void {
    if (!timelineLocked && dragActivityDirectiveActive) {
      const x = offsetX - dragOffsetX;
      dragCurrentX = xScaleView.invert(x).getTime();
      if (dragCurrentX !== dragPreviousX) {
        const planStartTimeMs = getUnixEpochTime(getDoyTime(new Date(planStartTimeYmd)));
        const start_offset = getIntervalUnixEpochTime(planStartTimeMs, dragCurrentX);
        dragActivityDirectiveActive.start_offset = start_offset; // Update activity in memory.
        dragPreviousX = dragCurrentX;
        draw();
      }
    }
  }

  function dragActivityEnd(): void {
    if (dragActivityDirectiveActive !== null && dragStartX !== null && dragCurrentX !== null) {
      if (dragStartX !== dragCurrentX) {
        const planStartTimeMs = getUnixEpochTime(getDoyTime(new Date(planStartTimeYmd)));
        const start_offset = getIntervalUnixEpochTime(planStartTimeMs, dragCurrentX);
        effects.updateActivityDirective(planId, dragActivityDirectiveActive.id, { start_offset });
      }

      dragActivityDirectiveActive = null;
      dragCurrentX = null;
      dragOffsetX = null;
      dragStartX = null;
      dragPreviousX = null;
    }
  }

  function removeKeyDownEvent() {
    if (browser) {
      document.removeEventListener('keydown', onKeyDown);
    }
  }

  function onBlur(e: FocusEvent | undefined) {
    if (e) {
      removeKeyDownEvent();
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (isDeleteEvent(event) && !!selectedActivityDirectiveId) {
      dispatch('deleteActivityDirective', selectedActivityDirectiveId);
    }
  }

  function onFocus(e: FocusEvent | undefined) {
    if (e) {
      document.addEventListener('keydown', onKeyDown);
    }
  }

  function onMousedown(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      const activityDirectives = searchQuadtreeRect<ActivityDirective>(
        quadtreeActivityDirectives,
        offsetX,
        offsetY,
        activityHeight,
        maxActivityWidth,
        visibleActivityDirectivesById,
      );
      const spans = searchQuadtreeRect<Span>(
        quadtreeSpans,
        offsetX,
        offsetY,
        activityHeight,
        maxActivityWidth,
        visibleSpansById,
      );
      dispatch('mouseDown', { activityDirectives, e, layerId: id, spans });
      dragActivityDirectiveStart(activityDirectives, offsetX);
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      const activityDirectives = searchQuadtreeRect<ActivityDirective>(
        quadtreeActivityDirectives,
        offsetX,
        offsetY,
        activityHeight,
        maxActivityWidth,
        visibleActivityDirectivesById,
      );
      const spans = searchQuadtreeRect<Span>(
        quadtreeSpans,
        offsetX,
        offsetY,
        activityHeight,
        maxActivityWidth,
        visibleSpansById,
      );
      dispatch('mouseOver', { activityDirectives, e, layerId: id, spans });
      dragActivityDirective(offsetX);
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { activityDirectives: [], e, layerId: id, spans: [] });
    }
  }

  function onMouseup(e: MouseEvent | undefined): void {
    if (e) {
      dragActivityEnd();
    }
  }

  /**
   * Draws activity points to the canvas context.
   * @note Points must be sorted in time ascending order before calling this function.
   */
  async function draw(): Promise<void> {
    if (ctx) {
      await tick();

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, drawWidth, drawHeight);

      quadtreeActivityDirectives = d3Quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [drawWidth, drawHeight],
        ]);
      quadtreeSpans = d3Quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [drawWidth, drawHeight],
        ]);
      visibleActivityDirectivesById = {};
      visibleSpansById = {};

      maxActivityWidth = Number.MIN_SAFE_INTEGER;
      let totalMaxY = Number.MIN_SAFE_INTEGER;
      const boundingBoxes: BoundingBox[] = [];

      const sortedActivityDirectives: ActivityDirective[] = activityDirectives.sort(sortActivityDirectives);
      for (const activityDirective of sortedActivityDirectives) {
        const activityDirectiveX = getActivityDirectiveStartTimeMs(
          activityDirective.id,
          planStartTimeYmd,
          planEndTimeDoy,
          activityDirectivesMap,
          spansMap,
          spanUtilityMaps,
        );

        if (activityDirectiveX >= viewTimeRange.start && activityDirectiveX <= viewTimeRange.end) {
          const x = xScaleView(activityDirectiveX);
          const end = xScaleView(activityDirectiveX);
          const { textWidth } = setLabelContext(activityDirective.name);
          const xEnd = end + textWidth;

          let maxX = Number.MIN_SAFE_INTEGER;
          let maxY = Number.MIN_SAFE_INTEGER;
          let y = rowHeight;

          for (const boundingBox of boundingBoxes) {
            if (x <= boundingBox.maxX) {
              y = boundingBox.maxY + rowHeight;
            }
          }

          drawActivityDirective(activityDirective, x, y);

          if (xEnd > maxX) {
            maxX = xEnd;
          }
          if (y > maxY) {
            maxY = y;
          }

          const spanId = spanUtilityMaps.directiveIdToSpanIdMap[activityDirective.id];
          const span = spansMap[spanId];
          if (span) {
            const childIds = spanUtilityMaps.spanIdToChildIdsMap[span.id];
            const childrenBoundingBox: BoundingBox = drawSpans(span, childIds, y);

            if (childrenBoundingBox) {
              if (childrenBoundingBox.maxX > maxX) {
                maxX = childrenBoundingBox.maxX;
              }
              if (childrenBoundingBox.maxY > maxY) {
                maxY = childrenBoundingBox.maxY;
              }
            }

            boundingBoxes.push({ maxX, maxY });
          }

          if (maxY > totalMaxY) {
            totalMaxY = maxY;
          }
        }
      }

      const newHeight = totalMaxY + rowHeight;
      if (newHeight > 0 && drawHeight !== newHeight) {
        dispatch('updateRowHeight', { layerId: id, newHeight });
      }
    }
  }

  function drawActivityDirective(activityDirective: ActivityDirective, x: number, y: number) {
    const activityWidth = 5.0;
    const rect = new Path2D();
    rect.rect(x, y, activityWidth, activityHeight);

    quadtreeActivityDirectives.add({
      height: activityHeight,
      id: activityDirective.id,
      width: activityWidth,
      x,
      y,
    });
    visibleActivityDirectivesById[activityDirective.id] = activityDirective;

    if (activityWidth > maxActivityWidth) {
      maxActivityWidth = activityWidth;
    }

    if (selectedActivityDirectiveId === activityDirective.id) {
      ctx.fillStyle = activitySelectedColor;
    } else {
      ctx.fillStyle = activityColor;
    }

    ctx.fill(rect);
    const { labelText, textMetrics } = setLabelContext(activityDirective.name);
    ctx.fillText(labelText, x, y, textMetrics.width);
  }

  function drawSpan(span: Span, x: number, y: number, end: number) {
    const activityWidth = Math.max(5.0, end - x);
    const rect = new Path2D();
    rect.rect(x, y, activityWidth, activityHeight);

    quadtreeSpans.add({
      height: activityHeight,
      id: span.id,
      width: activityWidth,
      x,
      y,
    });
    visibleSpansById[span.id] = span;

    if (activityWidth > maxActivityWidth) {
      maxActivityWidth = activityWidth;
    }

    if (selectedSpanId === span.id) {
      ctx.fillStyle = activitySelectedColor;
    } else if (span.duration === null) {
      ctx.fillStyle = activityUnfinishedColor;
    } else {
      ctx.fillStyle = activityColor;
    }

    ctx.fill(rect);

    const { labelText, textMetrics } = setLabelContext(span.type);
    ctx.fillText(labelText, x, y, textMetrics.width);
  }

  function drawSpans(span: Span, childIds: SpanId[], parentY: number): BoundingBox | null {
    if (childIds?.length) {
      const boundingBoxes: BoundingBox[] = [];

      let maxX = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;
      let y = parentY + rowHeight;

      for (const childId of childIds) {
        const childSpan = spansMap[childId];
        const startTime = getUnixEpochTimeFromInterval(planStartTimeYmd, childSpan.start_offset);
        const duration = getIntervalInMs(span.duration);
        const x = xScaleView(startTime);
        const end = xScaleView(startTime + duration);
        const { textWidth } = setLabelContext(`${span.id}`);
        const xEnd = end + textWidth;

        for (const boundingBox of boundingBoxes) {
          if (x <= boundingBox.maxX) {
            y = boundingBox.maxY + rowHeight;
          }
        }

        drawSpan(childSpan, x, y, end);

        if (xEnd > maxX) {
          maxX = xEnd;
        }
        if (y > maxY) {
          maxY = y;
        }

        const newChildIds = spanUtilityMaps.spanIdToChildIdsMap[childId];
        const childrenBoundingBox: BoundingBox = drawSpans(childSpan, newChildIds, y);

        if (childrenBoundingBox) {
          if (childrenBoundingBox.maxX > maxX) {
            maxX = childrenBoundingBox.maxX;
          }
          if (childrenBoundingBox.maxY > maxY) {
            maxY = childrenBoundingBox.maxY;
          }
        }

        boundingBoxes.push({ maxX, maxY });
      }

      return { maxX, maxY };
    }

    return null;
  }

  function setLabelContext(labelText: string) {
    const fontSize = 12;
    const fontFace = 'Helvetica Neue';
    ctx.fillStyle = '#000000';
    ctx.font = `${fontSize}px ${fontFace}`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    return { labelText, textHeight, textMetrics, textWidth };
  }
</script>

<canvas
  bind:this={canvas}
  height={canvasHeightDpr}
  id={`layer-activity-${id}`}
  style="height: {drawHeight}px; width: {drawWidth}px;"
  width={canvasWidthDpr}
/>

<style>
  canvas {
    position: absolute;
    z-index: -1;
  }
</style>
