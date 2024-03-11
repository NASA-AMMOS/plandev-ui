<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import ActivityAnchorIconSVG from '@nasa-jpl/stellar/icons/activity_anchor.svg?raw';
  import ActivityDirectiveIconSVG from '@nasa-jpl/stellar/icons/activity_directive.svg?raw';
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import SpanHashMarksSVG from '../../assets/span-hash-marks.svg?raw';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import type { SimulationDataset, Span, SpanId, SpansMap, SpanUtilityMaps } from '../../types/simulation';
  import type {
    ActivityLayerFilter,
    BoundingBox,
    PointBounds,
    QuadtreeRect,
    SpanTimeBounds,
    TimeRange,
  } from '../../types/timeline';
  import { getSpanRootParent, sortActivityDirectivesOrSpans } from '../../utilities/activities';
  import { hexToRgba, shadeColor } from '../../utilities/color';
  import effects from '../../utilities/effects';
  import { isRightClick } from '../../utilities/generic';
  import { isDeleteEvent } from '../../utilities/keyboardEvents';
  import {
    getActivityDirectiveStartTimeMs,
    getDoyTime,
    getIntervalInMs,
    getIntervalUnixEpochTime,
    getUnixEpochTime,
    getUnixEpochTimeFromInterval,
  } from '../../utilities/time';
  import { searchQuadtreeRect, TimelineInteractionMode, TimelineLockStatus } from '../../utilities/timeline';

  export let activityDirectives: ActivityDirective[] = [];
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityColor: string = '';
  export let activityHeight: number = 16;
  export let activityRowPadding: number = 4;
  export let activitySelectedColor: string = '#a9eaff';
  export let activityUnfinishedSelectedColor: string = '#ff3b19';
  export let activityUnfinishedColor: string = '#fc674d';
  export let blur: FocusEvent | undefined;
  export let contextmenu: MouseEvent | undefined;
  export let debugMode: boolean = false;
  export let dblclick: MouseEvent | undefined;
  export let dpr: number = 1;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ActivityLayerFilter | undefined;
  export let hasUpdateDirectivePermission: boolean = false;
  export let id: number;
  export let focus: FocusEvent | undefined;
  export let mode: 'packed' | 'heatmap' = 'packed';
  export let mousedown: MouseEvent | undefined;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let mouseup: MouseEvent | undefined;
  export let planEndTimeDoy: string;
  export let plan: Plan | null = null;
  export let planStartTimeYmd: string;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let showDirectives: boolean = true;
  export let showSpans: boolean = true;
  export let simulationDataset: SimulationDataset | null = null;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap = {};
  export let timelineInteractionMode: TimelineInteractionMode;
  export let timelineLockStatus: TimelineLockStatus;
  export let user: User | null;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let nativeDirectiveIconWidth: number = 16;
  let dragCurrentX: number | null = null;
  let dragOffsetX: number | null = null;
  let dragPreviousX: number | null = null;
  let dragActivityDirectiveActive: ActivityDirective | null = null;
  let dragStartX: number | null = null;
  let maxActivityWidth: number;
  let planStartTimeMs: number;
  let quadtreeActivityDirectives: Quadtree<QuadtreeRect>;
  let quadtreeSpans: Quadtree<QuadtreeRect>;
  let quadtreeHeatmap: Quadtree<QuadtreeRect>;
  let spanTimeBoundCache: Record<SpanId, SpanTimeBounds> = {};
  let visibleActivityDirectivesById: Record<ActivityDirectiveId, ActivityDirective> = {};
  let visibleSpansById: Record<SpanId, Span> = {};
  let visibleHeatmapBoxesById: Record<ActivityDirectiveId, ActivityDirective> = {};
  let xScaleViewRangeMax: number;

  // Asset cache
  const assets: {
    anchorIcon: HTMLImageElement | null;
    directiveIcon: HTMLImageElement | null;
    directiveIconShape: Path2D | null;
    directiveIconShapeStroke: Path2D | null;
    hashMarks: HTMLImageElement | null;
    pattern: HTMLCanvasElement | null;
  } = {
    anchorIcon: null,
    directiveIcon: null,
    directiveIconShape: null,
    directiveIconShapeStroke: null,
    hashMarks: null,
    pattern: null,
  };
  const textMetricsCache: Record<string, TextMetrics> = {};

  $: onBlur(blur);
  $: onContextmenu(contextmenu);
  $: onDblclick(dblclick);
  $: onFocus(focus);
  $: onMousedown(mousedown);
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: onMouseup(mouseup);

  $: scaleFactor = activityHeight / nativeDirectiveIconWidth;
  $: directiveIconWidth = nativeDirectiveIconWidth * scaleFactor;
  $: anchorIconWidth = directiveIconWidth * scaleFactor;
  $: anchorIconMarginLeft = 4 * scaleFactor;
  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: directiveIconMarginRight = 2 * scaleFactor;
  $: rowHeight = activityHeight + activityRowPadding;
  $: spanLabelLeftMargin = 6;
  $: timelineLocked = timelineLockStatus === TimelineLockStatus.Locked;
  $: planStartTimeMs = getUnixEpochTime(getDoyTime(new Date(planStartTimeYmd)));
  $: if (xScaleView !== null) {
    xScaleViewRangeMax = xScaleView.range()[1];
  }

  $: if (
    activityDirectives &&
    activityColor &&
    activityHeight &&
    showDirectives !== undefined &&
    showSpans !== undefined &&
    canvasHeightDpr &&
    canvasWidthDpr &&
    ctx &&
    drawHeight &&
    drawWidth &&
    dpr &&
    filter &&
    selectedActivityDirectiveId !== undefined &&
    selectedSpanId !== undefined &&
    spansMap &&
    mode &&
    viewTimeRange &&
    xScaleView
  ) {
    draw();
  }

  onMount(() => {
    preloadStaticAssets();
  });

  onDestroy(() => removeKeyDownEvent());

  function preloadStaticAssets() {
    if (canvas) {
      ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    }
    assets.directiveIcon = loadSVG(ActivityDirectiveIconSVG);
    assets.anchorIcon = loadSVG(ActivityAnchorIconSVG);
    assets.hashMarks = loadSVG(SpanHashMarksSVG);
    assets.directiveIconShape = new Path2D(
      'M0 0.470589C0 0.21069 0.21069 0 0.470588 0H8C12.4183 0 16 3.58172 16 8V8C16 12.4183 12.4183 16 8 16H0.470589C0.21069 16 0 15.7893 0 15.5294V0.470589Z',
    );
    assets.directiveIconShapeStroke = new Path2D(
      'M0.5 15.5V0.5H8C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5H0.5Z',
    );
  }
  function loadSVG(svgString: string) {
    var svg64 = window.btoa(svgString);
    var b64Start = 'data:image/svg+xml;base64,';
    // prepend a "header"
    var image64 = b64Start + svg64;
    const image = document.createElement('img');
    image.src = image64;
    return image;
  }

  function dragActivityDirectiveStart(activityDirectives: ActivityDirective[], offsetX: number): void {
    if (activityDirectives.length) {
      const [activityDirective] = activityDirectives; // Select just the first one for now.

      const x = getUnixEpochTimeFromInterval(planStartTimeYmd, activityDirective.start_offset);
      if (xScaleView !== null) {
        dragOffsetX = offsetX - xScaleView(x);
      }
      dragActivityDirectiveActive = activityDirective; // Pointer of the active drag activity.
      dragStartX = x;
      dragCurrentX = x;
      dragPreviousX = x;
    }
  }

  function dragActivityDirective(offsetX: number): void {
    if (!timelineLocked && dragActivityDirectiveActive && dragOffsetX !== null && xScaleView !== null) {
      const x = offsetX - dragOffsetX;
      const xMs = xScaleView.invert(x).getTime();
      dragCurrentX = typeof dragActivityDirectiveActive.anchor_id === 'number' ? xMs : Math.max(xMs, planStartTimeMs);
      if (dragCurrentX !== dragPreviousX) {
        const start_offset = getIntervalUnixEpochTime(planStartTimeMs, dragCurrentX);
        dragActivityDirectiveActive.start_offset = start_offset; // Update activity in memory.
        dragPreviousX = dragCurrentX;
        draw();
      }
    }
  }

  function dragActivityEnd(): void {
    if (dragActivityDirectiveActive !== null && dragStartX !== null && dragCurrentX !== null) {
      if (dragStartX !== dragCurrentX && plan) {
        const start_offset = getIntervalUnixEpochTime(planStartTimeMs, dragCurrentX);
        effects.updateActivityDirective(plan, dragActivityDirectiveActive.id, { start_offset }, null, user);
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
    if (isDeleteEvent(event) && !!selectedActivityDirectiveId && hasUpdateDirectivePermission) {
      dispatch('deleteActivityDirective', selectedActivityDirectiveId);
    }
  }

  function onFocus(e: FocusEvent | undefined) {
    if (e) {
      document.addEventListener('keydown', onKeyDown);
    }
  }

  function getDirectivesAndSpansForOffset(offsetX: number, offsetY: number) {
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
    return { activityDirectives, spans };
  }

  function onMousedown(e: MouseEvent | undefined): void {
    // Do not process events if meta/ctrl is pressed to avoid interaction conflicts with zoom/pan
    if (e && timelineInteractionMode === TimelineInteractionMode.Interact) {
      const { offsetX, offsetY } = e;
      const { activityDirectives, spans } = getDirectivesAndSpansForOffset(offsetX, offsetY);

      /**
       * The setTimeout is needed to prevent a race condition with mousedown events and change events.
       * Without the setTimeout, mousedown events happen before change events in the activity directive form.
       * This caused invalid updates to activity parameters.
       * Make sure you understand the linked issue before changing this code!
       * @see https://github.com/NASA-AMMOS/aerie-ui/issues/590
       */
      setTimeout(() => {
        dispatch('mouseDown', { activityDirectives, e, layerId: id, spans });
        if (!isRightClick(e)) {
          dragActivityDirectiveStart(activityDirectives, offsetX);
        }
      });
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      let activityDirectives: ActivityDirective[] = [];
      let spans: Span[] = [];
      if (mode === 'packed') {
        const hits = getDirectivesAndSpansForOffset(offsetX, offsetY);
        activityDirectives = hits.activityDirectives;
        spans = hits.spans;
      } else {
        activityDirectives = searchQuadtreeRect<ActivityDirective>(
          quadtreeHeatmap,
          offsetX,
          offsetY,
          activityHeight,
          maxActivityWidth,
          visibleHeatmapBoxesById,
        );
        spans = activityDirectives
          .map(directive => {
            const rootSpan = getSpanForActivityDirective(directive);
            if (rootSpan) {
              const spanChildren = (spanUtilityMaps.spanIdToChildIdsMap[rootSpan.id] || []).map(id => spansMap[id]);
              return [rootSpan].concat(spanChildren);
            }
            return [];
          })
          .flat();
      }

      /* TODO tooltip renders offscreen if there are too many items, maybe show a more compact tooltip summary in heatmap mode hover? */
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

  function onContextmenu(e: MouseEvent | undefined): void {
    // Prevent native context menu from appearing at all
    if (e) {
      e.preventDefault();
    }
    const showContextMenu = !!e && isRightClick(e);
    if (showContextMenu) {
      // Get new selected directive or span in order to ensure that no race condition exists between
      // the selectedActivityDirectiveId and selectedSpanId stores and the dispatching of this event
      // since there is no guarantee that the mousedown event triggering updates to those stores will complete
      // before the context menu event dispatch fires
      const { offsetX, offsetY } = e;
      const { activityDirectives, spans } = getDirectivesAndSpansForOffset(offsetX, offsetY);

      let newSelectedActivityDirectiveId = null;
      let newSelectedSpanId = null;
      if (activityDirectives.length > 0) {
        newSelectedActivityDirectiveId = activityDirectives[0].id;
      } else if (spans.length > 0) {
        newSelectedSpanId = spans[0].id;
      }
      dispatch('contextMenu', {
        e,
        layerId: id,
        origin: 'layer-activity',
        selectedActivityDirectiveId: newSelectedActivityDirectiveId,
        selectedSpanId: newSelectedSpanId,
      });
    }
  }

  function onDblclick(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('dblClick', {
        e,
        layerId: id,
        selectedActivityDirectiveId,
        selectedSpanId,
      });
    }
  }

  function getXForDirective(activityDirective: ActivityDirective) {
    return getActivityDirectiveStartTimeMs(
      activityDirective.id,
      planStartTimeYmd,
      planEndTimeDoy,
      activityDirectivesMap,
      spansMap,
      spanUtilityMaps,
    );
  }

  function getSpanForActivityDirective(activityDirective: ActivityDirective): Span {
    const spanId = spanUtilityMaps.directiveIdToSpanIdMap[activityDirective.id];
    return spansMap[spanId];
  }

  function getDirectiveBounds(activityDirective: ActivityDirective): PointBounds {
    const { textWidth } = setLabelContext(activityDirective.name);
    const x = getXForDirective(activityDirective);
    const xCanvas = xScaleView?.(x) ?? 0;
    let xEndCanvas = xCanvas + textWidth + directiveIconWidth + directiveIconMarginRight;
    if (activityDirective.anchor_id !== null) {
      xEndCanvas += anchorIconWidth + anchorIconMarginLeft;
    }
    return {
      maxXCanvas: xEndCanvas,
      x,
      xCanvas,
      xEnd: x,
      xEndCanvas,
    };
  }

  function getSpanBounds(span: Span): BoundingBox | null {
    return drawSpans([span], 0, false);
  }

  function getLabelForSpan(span: Span, sticky: boolean = false): string {
    // Display an arrow to the left of a span label if the span is sticky
    return `${sticky ? '← ' : ''}${span.type}${span.duration === null ? ' (Unfinished)' : ''}`;
  }

  // Determine starting Y position for the activity directive, taking into account any associated spans
  function placeActivityDirective(
    maxXPerY: Record<number, number>,
    directiveBounds: PointBounds,
    initialSpanBounds: BoundingBox | null,
    showDirectives: boolean = true,
  ) {
    // Place the elements where they will fit in packed waterfall
    const directiveRowHeight = showDirectives ? rowHeight : 0;
    let i = directiveRowHeight;
    let directiveStartY = 0;
    let foundY = false;
    while (!foundY) {
      let maxDirectiveXForY = maxXPerY[i];
      const directiveXForYExists = maxDirectiveXForY !== undefined;
      const directiveFits =
        !directiveXForYExists || (directiveXForYExists && directiveBounds.xCanvas > maxDirectiveXForY);
      if (directiveFits) {
        if (!initialSpanBounds) {
          foundY = true;
          directiveStartY = i;
        } else {
          // Construct actual span bounds for this Y
          const adjustedSpanBounds = { ...initialSpanBounds };
          adjustedSpanBounds.maxY += i + rowHeight;
          // Check span bounds for each y
          let spanYCheckIndex = i + rowHeight;
          let allSpansFit = true;
          while (spanYCheckIndex <= adjustedSpanBounds.maxY) {
            // TODO span bounds could provide a maxXForY instead of absolute corner bounds?
            const maxXForSpanY = maxXPerY[spanYCheckIndex];
            // If the spans bbox is earlier than maxX for that Y we can't fit the bbox
            if (maxXForSpanY !== undefined && adjustedSpanBounds.minX < maxXForSpanY) {
              allSpansFit = false;
              break;
            }
            spanYCheckIndex += rowHeight;
          }
          if (allSpansFit) {
            foundY = true;
            directiveStartY = i;
          }
        }
      }
      // If the directive does not fit, try the next row
      i += rowHeight;
    }
    const newMaxXPerY = { ...maxXPerY };
    // Update maxXForY for directive if no entry exists at that Y or if the directive end x is greater than the existing entry
    if (newMaxXPerY[directiveStartY] === undefined || directiveBounds.maxXCanvas > newMaxXPerY[directiveStartY]) {
      newMaxXPerY[directiveStartY] = directiveBounds.maxXCanvas;
    }

    // Construct actual span bounds for this final Y
    const adjustedSpanBounds = initialSpanBounds
      ? { ...initialSpanBounds }
      : {
          maxX: 0,
          maxY: 0,
          minX: 0,
        };
    adjustedSpanBounds.maxY = directiveStartY + rowHeight + adjustedSpanBounds.maxY;
    let childrenYIterator = 0;
    let spanStartY = 0;
    if (initialSpanBounds) {
      childrenYIterator = directiveStartY + directiveRowHeight;
      spanStartY = initialSpanBounds.maxY + childrenYIterator;
      while (childrenYIterator < spanStartY) {
        // TODO span bounds could provide a maxXForY instead of absolute corner bounds?
        const maxXForSpanY = maxXPerY[childrenYIterator];
        if (maxXForSpanY === undefined || maxXForSpanY < initialSpanBounds.maxX) {
          newMaxXPerY[childrenYIterator] = initialSpanBounds.maxX;
        }
        childrenYIterator += rowHeight;
      }
    }
    return {
      directiveStartY,
      maxXPerY: newMaxXPerY,
      spanBounds: adjustedSpanBounds,
    };
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
      quadtreeHeatmap = d3Quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [drawWidth, drawHeight],
        ]);
      visibleActivityDirectivesById = {};
      visibleSpansById = {};
      visibleHeatmapBoxesById = {};
      spanTimeBoundCache = {};

      maxActivityWidth = Number.MIN_SAFE_INTEGER;
      let totalMaxY = Number.MIN_SAFE_INTEGER;
      let maxXPerY: Record<number, number> = {};

      const sortedActivityDirectives: ActivityDirective[] = activityDirectives.sort(sortActivityDirectivesOrSpans);
      for (const activityDirective of sortedActivityDirectives) {
        let spanInView = false;
        let initialSpanBounds = null;
        let span;
        if (showSpans) {
          span = getSpanForActivityDirective(activityDirective);
          if (span) {
            initialSpanBounds = getSpanBounds(span);
            if (initialSpanBounds !== null) {
              spanInView = initialSpanBounds.minX <= xScaleViewRangeMax && initialSpanBounds.maxX >= 0;
            }
          }
        }

        const directiveBounds = getDirectiveBounds(activityDirective); // Directive element
        const directiveInView = directiveBounds.xCanvas <= xScaleViewRangeMax && directiveBounds.xEndCanvas >= 0;
        if (directiveInView || spanInView) {
          if (mode === 'packed') {
            const {
              spanBounds,
              directiveStartY,
              maxXPerY: newMaxXPerY,
            } = placeActivityDirective(maxXPerY, directiveBounds, initialSpanBounds, showDirectives);

            // Update maxXPerY
            maxXPerY = newMaxXPerY;

            const maxCanvasRowY = Math.floor(drawHeight / rowHeight) * rowHeight;

            // Draw spans
            let constrainedSpanY = -1;
            if (span) {
              const spanStartY = directiveStartY;
              // Wrap spans if overflowing draw height
              constrainedSpanY =
                spanBounds.maxY > drawHeight ? (spanBounds.maxY % maxCanvasRowY) - rowHeight : spanStartY;
              drawSpans([span], constrainedSpanY);
            }

            // Draw directive
            let constrainedDirectiveY = 0;
            // If the span exists, use the constrained span Y as the starting point for the directive
            // so that the directive wraps with the span
            if (constrainedSpanY > -1) {
              constrainedDirectiveY = constrainedSpanY;
            } else {
              // Wrap directive if overflowing draw height and no span is found
              constrainedDirectiveY =
                directiveStartY > drawHeight - rowHeight
                  ? (directiveStartY % maxCanvasRowY) + rowHeight
                  : directiveStartY;
            }
            if (showDirectives) {
              drawActivityDirective(activityDirective, directiveBounds.xCanvas, constrainedDirectiveY);
            }

            totalMaxY = Math.max(totalMaxY, directiveStartY, directiveStartY, spanBounds?.maxY || 0);
          } else {
            drawHeatmapBox(directiveBounds.xCanvas, 0, initialSpanBounds?.maxTimeX || 0, activityDirective);
          }
        }
      }

      const newHeight = totalMaxY + rowHeight;
      if (newHeight > 0 && drawHeight !== newHeight) {
        dispatch('updateRowHeight', { layerId: id, newHeight });
      }

      if (debugMode) {
        drawDebugInfo(maxXPerY, newHeight);
      }
    }
  }

  function drawHeatmapBox(x: number, y: number, end: number, activityDirective: ActivityDirective) {
    visibleHeatmapBoxesById[activityDirective.id] = activityDirective;

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const width = end === 0 ? 2 : end - x;
    if (end === 0) {
      const rect = new Path2D();
      ctx.fillStyle = hexToRgba(activityColor, 0.5);
      rect.rect(x, y, 2, drawHeight);
      ctx.fill(rect);
    } else {
      ctx.strokeStyle = `rgba(0,0,0,0.02)`;
      const rect = new Path2D();
      ctx.fillStyle = hexToRgba(activityColor, 0.5);
      rect.rect(x, y, Math.max(width, 2), drawHeight);
      // ctx.strokeRect(x, y, width, drawHeight);
      ctx.fill(rect);
    }
    ctx.restore();

    quadtreeHeatmap.add({
      height: drawHeight,
      id: activityDirective.id,
      width,
      x,
      y,
    });

    // Update maxActivityWidth
    if (width > maxActivityWidth) {
      maxActivityWidth = width;
    }
  }

  function drawActivityDirective(activityDirective: ActivityDirective, x: number, y: number) {
    visibleActivityDirectivesById[activityDirective.id] = activityDirective;

    const primaryHighlight = activityDirective.id === selectedActivityDirectiveId;
    const spanRootParent = getSpanRootParent(spansMap, selectedSpanId);
    const secondaryHighlight =
      selectedSpanId !== null && spanRootParent
        ? spanUtilityMaps.spanIdToDirectiveIdMap[spanRootParent.id] === activityDirective.id
        : false;

    // Handle opacity if a point is selected
    let opacity = 1;
    if (selectedActivityDirectiveId !== null || selectedSpanId !== null) {
      if (primaryHighlight) {
        opacity = 1;
      } else {
        opacity = 0.24;
      }
    }

    const svgIconOpacity = selectedActivityDirectiveId !== null && !primaryHighlight ? 0.4 : opacity;

    // Draw directive icon
    setActivityRectContext(primaryHighlight, secondaryHighlight, opacity);
    drawDirectiveIcon(x, y, svgIconOpacity);

    // Draw label
    const textMetrics = drawPointLabel(
      activityDirective.name,
      x + directiveIconWidth + directiveIconMarginRight,
      y + activityHeight / 2,
      primaryHighlight,
      secondaryHighlight,
    );
    let hitboxWidth = directiveIconWidth + directiveIconMarginRight + textMetrics.width;

    // Draw anchor icon
    if (activityDirective.anchor_id !== null) {
      drawAnchorIcon(x + hitboxWidth + 4, y, svgIconOpacity);
      hitboxWidth += anchorIconWidth + anchorIconMarginLeft;
    }

    quadtreeActivityDirectives.add({
      height: activityHeight,
      id: activityDirective.id,
      width: hitboxWidth,
      x,
      y,
    });

    // Update maxActivityWidth
    if (hitboxWidth > maxActivityWidth) {
      maxActivityWidth = hitboxWidth;
    }

    if (debugMode) {
      drawDebugHitbox(x, y, hitboxWidth, activityHeight);
    }
  }

  function drawSpan(span: Span, x: number, y: number, end: number, ghosted: boolean = false, sticky = false) {
    ctx.save();
    visibleSpansById[span.id] = span;
    const primaryHighlight = span.id === selectedSpanId;
    let secondaryHighlight = false;
    const unfinished = span.duration === null;
    const rootSpan = getSpanRootParent(spansMap, span.id);
    if (rootSpan && selectedActivityDirectiveId !== null) {
      const spanDirectiveId = spanUtilityMaps.spanIdToDirectiveIdMap[rootSpan.id];
      if (spanDirectiveId === selectedActivityDirectiveId) {
        secondaryHighlight = true;
      }
    }
    if (selectedSpanId) {
      const rootSelectedSpan = getSpanRootParent(spansMap, selectedSpanId);
      if (rootSelectedSpan && rootSelectedSpan.id === rootSpan?.id) {
        secondaryHighlight = true;
      }
    }
    // Handle opacity if a point is selected
    let opacity = 1;
    if (selectedActivityDirectiveId !== null || selectedSpanId !== null) {
      if (primaryHighlight) {
        opacity = 1;
      } else {
        opacity = 0.24;
      }
    }
    if (ghosted) {
      opacity = 0.24;
    }

    setActivityRectContext(primaryHighlight, secondaryHighlight, opacity, unfinished);

    // Draw span rect
    const activityWidth = Math.max(4.0, end - x);

    // Check for roundRect support, Firefox does not yet support this as of 3/21/2023
    const rect = new Path2D();
    if (rect.roundRect) {
      rect.roundRect(x, y, activityWidth, activityHeight, 2);
    } else {
      rect.rect(x, y, activityWidth, activityHeight);
    }

    // Draw span rect stroke
    if (ghosted) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `rgba(0,0,0,${opacity * 0.6})`;
    } else {
      ctx.setLineDash([]);
    }
    const strokeRect = new Path2D();
    // Check for roundRect support, Firefox does not yet support this as of 3/21/2023
    if (strokeRect.roundRect) {
      strokeRect.roundRect(x + 0.5, y + 0.5, activityWidth - 1, activityHeight - 1, 1);
    } else {
      strokeRect.rect(x + 0.5, y + 0.5, activityWidth - 1, activityHeight - 1);
    }
    ctx.fill(rect);
    ctx.stroke(strokeRect);

    // Draw hash marks if requested and if there is room
    if (ghosted && activityWidth > 8) {
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = 20;
      patternCanvas.height = 16;
      if (assets.hashMarks !== null) {
        patternCanvas?.getContext('2d')?.drawImage(assets.hashMarks, 0, 0);
      }
      ctx.save();
      ctx.translate(x, y);
      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      if (pattern !== null) {
        ctx.fillStyle = pattern;
      }
      ctx.fillRect(0, 0, activityWidth, activityHeight);
      ctx.restore();
    }

    // TODO deprecate point.label.hidden
    // Draw label
    const textMetrics = drawPointLabel(
      getLabelForSpan(span, sticky),
      sticky ? Math.max(spanLabelLeftMargin, x + spanLabelLeftMargin) : x + spanLabelLeftMargin,
      y + activityHeight / 2,
      primaryHighlight,
      secondaryHighlight,
      unfinished,
    );

    const hitboxWidth = Math.max(activityWidth, textMetrics.width + spanLabelLeftMargin);
    quadtreeSpans.add({
      height: activityHeight,
      id: span.id,
      width: hitboxWidth,
      x,
      y,
    });

    if (hitboxWidth > maxActivityWidth) {
      maxActivityWidth = hitboxWidth;
    }

    if (debugMode) {
      drawDebugHitbox(x, y, hitboxWidth, activityHeight);
    }

    ctx.restore();
  }

  function getSpanTimeBounds(span: Span): SpanTimeBounds {
    if (span.id in spanTimeBoundCache) {
      return spanTimeBoundCache[span.id];
    }

    // Use simulation start YMD time if available, otherwise use the plan start YMD
    const startYmd = simulationDataset?.simulation_start_time ?? planStartTimeYmd;
    const start = getUnixEpochTimeFromInterval(startYmd, span.start_offset);
    const duration = getIntervalInMs(span.duration);
    const end = start + duration;
    const timeBounds = { duration, end, start };
    spanTimeBoundCache[span.id] = timeBounds;
    return timeBounds;
  }

  function drawSpans(spans: Span[], parentY: number, draw = true, ghosted = false): BoundingBox | null {
    if (spans && xScaleView !== null) {
      const boundingBoxes: BoundingBox[] = [];

      let maxX = Number.MIN_SAFE_INTEGER;
      let maxTimeX = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;
      let minX = Number.MAX_SAFE_INTEGER;
      let y = parentY + rowHeight;

      for (const span of spans) {
        const { start, duration } = getSpanTimeBounds(span);
        const x = xScaleView(start);
        const endTimeX = xScaleView(start + duration);

        // The label should be sticky if the start of the span is clipped and the span is still in view
        const sticky = start < viewTimeRange.start && start + duration >= viewTimeRange.start;

        // Consider the span to be in view if the rect and label are in view or if the label should be sticky
        const rectWithLabelInView = x + spanLabelLeftMargin + setLabelContext(getLabelForSpan(span)).textWidth > 0;
        const spanInView = rectWithLabelInView || sticky;

        // Get the final text width now that we know if we're in sticky mode
        const { textWidth } = setLabelContext(getLabelForSpan(span, sticky));
        const textXEnd = Math.max(spanLabelLeftMargin, x + spanLabelLeftMargin) + textWidth;
        const xEnd = Math.max(endTimeX, textXEnd);

        for (const boundingBox of boundingBoxes) {
          if (x <= boundingBox.maxX) {
            y = boundingBox.maxY + (spanInView ? rowHeight : 0);
          }
        }

        // Only add to bounds if the span is in view
        if (spanInView) {
          if (draw) {
            drawSpan(span, x, y, endTimeX, ghosted, sticky);
          }
          if (x < minX) {
            minX = x;
          }
          if (xEnd > maxX) {
            maxX = xEnd;
          }
          if (endTimeX > maxTimeX) {
            maxTimeX = endTimeX;
          }
          if (y > maxY) {
            maxY = y;
          }
        }

        const spanChildren = spanUtilityMaps.spanIdToChildIdsMap[span.id].map(id => spansMap[id]);
        if (spanChildren) {
          const childrenBoundingBox: BoundingBox | null = drawSpans(spanChildren, y, draw, ghosted);

          if (childrenBoundingBox) {
            if (childrenBoundingBox.minX < minX) {
              minX = childrenBoundingBox.minX;
            }
            if (childrenBoundingBox.maxX > maxX) {
              maxX = childrenBoundingBox.maxX;
            }
            if (childrenBoundingBox.maxY > maxY) {
              maxY = childrenBoundingBox.maxY;
            }
            if (childrenBoundingBox.maxTimeX > maxTimeX) {
              maxTimeX = childrenBoundingBox.maxTimeX;
            }
          }
        }

        boundingBoxes.push({ maxTimeX, maxX, maxY, minX });
      }

      return { maxTimeX, maxX, maxY, minX };
    }

    return null;
  }

  function setLabelContext(labelText: string, color = '#000000') {
    const fontSize = 12;
    const fontFace = 'Inter';
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${fontFace}`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'middle';
    let textMetrics = textMetricsCache[labelText] ?? ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    textMetricsCache[labelText] = textMetrics; // Cache to avoid recomputing this measurement
    return { labelText, textHeight, textMetrics, textWidth };
  }

  function setActivityRectContext(
    primaryHighlight: boolean,
    secondaryHighlight: boolean,
    opacity: number,
    unfinished: boolean = false,
  ) {
    // Set fill and stroke styles
    ctx.strokeStyle = `rgba(0,0,0,${opacity * 0.2})`;
    if (unfinished) {
      ctx.fillStyle = hexToRgba(activityUnfinishedColor, opacity);
    } else if (primaryHighlight) {
      ctx.fillStyle = activitySelectedColor;
    } else if (secondaryHighlight) {
      ctx.fillStyle = hexToRgba(activitySelectedColor, 0.24);
    } else {
      ctx.fillStyle = hexToRgba(activityColor, opacity);
    }
  }

  function drawDirectiveIcon(x: number, y: number, svgOpacity: number) {
    // Draw the shape
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
    ctx.scale(scaleFactor, scaleFactor);
    if (assets.directiveIconShape) {
      ctx.fill(assets.directiveIconShape);
    }
    if (assets.directiveIconShapeStroke) {
      ctx.stroke(assets.directiveIconShapeStroke);
    }
    ctx.restore();

    // Draw the icon
    ctx.globalAlpha = svgOpacity;
    if (assets.directiveIcon) {
      ctx.drawImage(assets.directiveIcon, x + 1, y, activityHeight, activityHeight);
    }
    ctx.globalAlpha = 1;
  }

  function drawAnchorIcon(x: number, y: number, svgOpacity: number) {
    ctx.globalAlpha = svgOpacity;
    if (assets.anchorIcon) {
      ctx.drawImage(assets.anchorIcon, x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawPointLabel(
    text: string,
    x: number,
    y: number,
    primaryHighlight: boolean,
    secondaryHighlight: boolean,
    unfinished: boolean = false,
  ) {
    let color = activityColor;
    if (unfinished) {
      color = activityUnfinishedColor;
    }
    if (primaryHighlight || secondaryHighlight) {
      if (unfinished) {
        color = activityUnfinishedSelectedColor;
      } else {
        color = activitySelectedColor;
      }
    }

    let textOpacity = 1;
    if (selectedActivityDirectiveId !== null || selectedSpanId !== null) {
      if (!primaryHighlight) {
        if (secondaryHighlight) {
          textOpacity = 0.8;
        } else {
          textOpacity = 0.6;
        }
      }
    }

    const darkenFactor = unfinished ? 1.1 : 2.5;
    color = hexToRgba(shadeColor(color, darkenFactor), textOpacity); // Tint the color to be darker
    const { labelText, textMetrics } = setLabelContext(text, color);
    ctx.fillText(labelText, x, y, textMetrics.width);
    return textMetrics;
  }

  function drawDebugHitbox(x: number, y: number, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  function drawDebugInfo(maxXPerY: Record<number, number>, height: number) {
    ctx.save();
    Object.keys(maxXPerY).forEach(key => {
      const x = parseFloat(`${maxXPerY[parseInt(key)]}`);
      const rect = new Path2D();
      rect.rect(x, parseInt(key), 2, rowHeight - 4);
      ctx.fillStyle = 'red';
      ctx.fill(rect);
      ctx.fillText(x.toFixed(2), x + 4, parseInt(key) + 8);
    });

    for (let i = 0; i < height; i += rowHeight) {
      ctx.strokeStyle = '#ff00002e';
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvasWidthDpr, i);
      ctx.stroke();
      ctx.fillText(i.toString(), 0, i, 20);
    }
    ctx.restore();
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
