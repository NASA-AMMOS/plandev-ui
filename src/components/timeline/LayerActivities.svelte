<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import ActivityAnchorIconSVG from '@nasa-jpl/stellar/icons/activity_anchor.svg?raw';
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import { type ScaleTime } from 'd3-scale';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { ViewDefaultActivityOptions } from '../../constants/view';
  import { ViewConstants } from '../../enums/view';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import type { Span, SpanId, SpansMap, SpanUtilityMaps } from '../../types/simulation';
  import type {
    ActivityOptions,
    ActivityTree,
    ActivityTreeNode,
    ActivityTreeNodeDrawItem,
    ActivityTreeNodeItem,
    MouseDown,
    MouseOver,
    QuadtreeRect,
    RowMouseOverEvent,
    TimeRange,
  } from '../../types/timeline';
  import { hexToRgba, shadeColor } from '../../utilities/color';
  import effects from '../../utilities/effects';
  import { isRightClick } from '../../utilities/generic';
  import { isDeleteEvent } from '../../utilities/keyboardEvents';
  import {
    getActivityDirectiveStartTimeMs,
    getDoyTime,
    getIntervalUnixEpochTime,
    getUnixEpochTime,
    getUnixEpochTimeFromInterval,
  } from '../../utilities/time';
  import {
    directiveInView,
    searchQuadtreeRect,
    spanInView,
    TimelineInteractionMode,
    TimelineLockStatus,
  } from '../../utilities/timeline';

  type IdToColorMap = Record<number, string>;
  type IdToColorMaps = { directives: IdToColorMap; spans: IdToColorMap };

  export let activityDirectives: ActivityDirective[] = [];
  export let activityTree: ActivityTree = [];
  export let activityOptions: ActivityOptions = { ...ViewDefaultActivityOptions };
  export let idToColorMaps: IdToColorMaps = { directives: {}, spans: {} };
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityRowPadding: number = 4;
  export let activitySelectedColor: string = '#a9eaff';
  export let activitySelectedTextColor: string = '#0a4c7e';
  export let activityDefaultColor = '#cbcbcb';
  export let activityUnfinishedSelectedColor: string = '#ff3b19';
  export let activityUnfinishedColor: string = '#fc674d';
  export let blur: FocusEvent | undefined;
  export let contextmenu: MouseEvent | undefined;
  export let dblclick: MouseEvent | undefined;
  export let dpr: number = 1;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let hasUpdateDirectivePermission: boolean = false;
  export let focus: FocusEvent | undefined;
  export let labelPaddingLeft: number = 4;
  export let maxPackedActivityCount: number = 10000;
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
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap = {};
  export let timelineInteractionMode: TimelineInteractionMode;
  export let timelineLockStatus: TimelineLockStatus;
  export let user: User | null;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let spans: Span[] = [];

  const dispatch = createEventDispatcher<{
    contextMenu: MouseOver;
    dblClick: MouseOver;
    deleteActivityDirective: number;
    mouseDown: MouseDown;
    mouseOver: RowMouseOverEvent;
    updateRowHeight: {
      newHeight: number;
    };
  }>();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let dragCurrentX: number | null = null;
  let dragOffsetX: number | null = null;
  let dragPreviousX: number | null = null;
  let dragActivityDirectiveActive: ActivityDirective | null = null;
  let dragStartX: number | null = null;
  let maxActivityWidth: number;
  let minRectSize: number = 4;
  let planStartTimeMs: number;
  let quadtreeActivityDirectives: Quadtree<QuadtreeRect>;
  let quadtreeSpans: Quadtree<QuadtreeRect>;
  let visibleActivityDirectivesById: Record<ActivityDirectiveId, ActivityDirective> = {};
  let visibleSpansById: Record<SpanId, Span> = {};
  let colorCache: Record<string, string> = {};

  // Asset cache
  const assets: { anchorIcon: HTMLImageElement | null } = { anchorIcon: null };
  const textMetricsCache: Record<string, TextMetrics> = {};

  $: onBlur(blur);
  $: onContextmenu(contextmenu);
  $: onDblclick(dblclick);
  $: onFocus(focus);
  $: onMousedown(mousedown);
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: onMouseup(mouseup);

  $: anchorIconWidth = 16;
  $: anchorIconMarginLeft = 4;
  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: rowHeight = activityOptions.activityHeight + (activityOptions.displayMode === 'compact' ? 0 : 0);
  $: timelineLocked = timelineLockStatus === TimelineLockStatus.Locked;
  $: planStartTimeMs = getUnixEpochTime(getDoyTime(new Date(planStartTimeYmd)));

  $: if (
    activityDirectives &&
    showDirectives !== undefined &&
    showSpans !== undefined &&
    canvasHeightDpr &&
    canvasWidthDpr &&
    ctx &&
    drawHeight &&
    drawWidth &&
    dpr &&
    selectedActivityDirectiveId !== undefined &&
    selectedSpanId !== undefined &&
    spansMap &&
    activityOptions &&
    viewTimeRange &&
    xScaleView &&
    spans &&
    activityTree
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
    assets.anchorIcon = loadSVG(ActivityAnchorIconSVG);
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
        dragActivityDirectiveActive.start_time_ms = getActivityDirectiveStartTimeMs(
          dragActivityDirectiveActive.id,
          planStartTimeYmd,
          planEndTimeDoy,
          activityDirectivesMap,
          spansMap,
          spanUtilityMaps,
        );

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
      activityOptions.activityHeight,
      maxActivityWidth,
      visibleActivityDirectivesById,
    );
    const spans = searchQuadtreeRect<Span>(
      quadtreeSpans,
      offsetX,
      offsetY,
      activityOptions.activityHeight,
      maxActivityWidth,
      visibleSpansById,
    );
    return { activityDirectives, spans };
  }

  function onMousedown(e: MouseEvent | undefined): void {
    // Do not process events if meta/ctrl is pressed to avoid interaction conflicts with zoom/pan
    if (e && timelineInteractionMode === TimelineInteractionMode.Interact && e.button !== 1) {
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
        dispatch('mouseDown', { activityDirectives, e, spans });
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
      const hits = getDirectivesAndSpansForOffset(offsetX, offsetY);
      activityDirectives = hits.activityDirectives;
      spans = hits.spans;

      dispatch('mouseOver', { activityDirectives, e, spans });
      dragActivityDirective(offsetX);
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { activityDirectives: [], e, spans: [] });
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
        origin: 'layer-activity',
        selectedActivityDirectiveId: newSelectedActivityDirectiveId ?? undefined,
        selectedSpanId: newSelectedSpanId ?? undefined,
      });
    }
  }

  function onDblclick(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('dblClick', {
        e,
        selectedActivityDirectiveId: selectedActivityDirectiveId ?? undefined,
        selectedSpanId: selectedSpanId ?? undefined,
      });
    }
  }

  function getSpanForActivityDirective(activityDirective: ActivityDirective): Span {
    const spanId = spanUtilityMaps.directiveIdToSpanIdMap[activityDirective.id];
    return spansMap[spanId];
  }

  function getLabelForSpan(span: Span): string {
    // Display an arrow to the left of a span label if the span is sticky
    // The label should be sticky if the start of the span is clipped and the span is still in view
    const sticky = span.startMs < viewTimeRange.start && span.startMs + span.durationMs >= viewTimeRange.start;
    return `${sticky ? '← ' : ''}${span.type}${span.duration === null ? ' (Unfinished)' : ''}`;
  }

  function drawBottomLine(y: number, width: number) {
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--timeline-divider-color');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  function drawGroup(node: ActivityTreeNode, y: number, rowHeight: number, drawLine = true) {
    let newY = y;
    if (drawLine) {
      drawBottomLine(newY + rowHeight + 0.5, drawWidth);
    }

    drawRow(newY + activityRowPadding, node.items || [], idToColorMaps);
    newY += rowHeight;

    if (node.expanded && node.children.length) {
      node.children.forEach(childNode => {
        newY = drawGroup(childNode, newY, rowHeight, true);
      });
    }
    return newY;
  }

  function drawGroupedMode() {
    if (xScaleView !== null) {
      const collapsedMode = drawHeight <= ViewConstants.MIN_ROW_HEIGHT;
      let y = collapsedMode ? 0 : ViewConstants.MIN_ROW_HEIGHT - 1; // pad starting y with the min row height to align with activity tree
      const expectedRowHeight = rowHeight + activityRowPadding;
      activityTree.forEach(node => {
        const newY = drawGroup(node, y, expectedRowHeight, !collapsedMode);
        if (!collapsedMode) {
          y = newY;
        }
      });
      const newRowHeight = y + 36; // add padding to the bottom to account for buttons in the activity tree
      if (!collapsedMode && newRowHeight > 0) {
        /* TODO a change from manual to auto height does not take effect until you trigger a redraw on this row, could pass in whether or not to update row height but that might be odd? */
        dispatch('updateRowHeight', { newHeight: newRowHeight });
      }
    }
  }

  function drawCompactMode() {
    if (xScaleView !== null) {
      const seenSpans: Record<number, boolean> = {};
      const itemsToDraw: ActivityTreeNodeDrawItem[] = [];
      if (showDirectives) {
        activityDirectives.forEach(directive => {
          if (!xScaleView) {
            return;
          }

          const directiveX = directive.start_time_ms ?? 0;

          let childSpanInView = false;
          const childSpan = getSpanForActivityDirective(directive);
          if (childSpan) {
            seenSpans[childSpan.id] = true;
            childSpanInView = spanInView(childSpan, viewTimeRange);
          }
          if (directiveInView(directive, viewTimeRange) || (childSpanInView && showSpans)) {
            itemsToDraw.push({
              directive,
              span: childSpan,
              startX: xScaleView(directiveX),
            });
          }
        });
      }
      if (showSpans) {
        spans.forEach(span => {
          if (seenSpans[span.id] || !xScaleView) {
            return;
          }
          if (spanInView(span, viewTimeRange)) {
            itemsToDraw.push({
              span,
              startX: xScaleView(span.startMs),
            });
          }
        });
      }
      if (itemsToDraw.length > maxPackedActivityCount) {
        const text = `Activity drawing limit (${maxPackedActivityCount}) exceeded (${itemsToDraw.length})`;
        const { width } = measureText(text, textMetricsCache);
        setLabelContext('black');
        ctx.fillText(text, drawWidth / 2 - width / 2, drawHeight / 2, width);
        return;
      }

      itemsToDraw.sort((a, b) => {
        return a.startX < b.startX ? -1 : 1;
      });
      const rows: Record<number, { items: ActivityTreeNodeDrawItem[]; max: number }> = {};
      itemsToDraw.forEach(item => {
        const { startX } = item;
        const itemEndX = getItemEndX(item);
        let row = 0;
        let openRowSpaceFound = false;
        while (!openRowSpaceFound) {
          const maxXForRow = rows[row] ? rows[row].max : Number.MIN_SAFE_INTEGER;
          let minX = startX;
          let maxX = itemEndX;
          if (minX < maxXForRow) {
            row += 1;
          } else {
            openRowSpaceFound = true;
            const existingItemsForRow = rows[row] ? rows[row].items : [];
            rows[row] = {
              items: existingItemsForRow.concat(item),
              max: maxX,
            };
          }
        }
      });
      const extraSpace = Math.max(0, drawHeight - activityOptions.activityHeight - activityRowPadding);
      const rowCount = Object.keys(rows).length;
      Object.entries(rows).forEach(([_, entry], i) => {
        const { items } = entry;
        let yRow = i * (extraSpace / (rowCount - 1)) || 0;
        // If we can't have at least two rows then draw everything at 0
        if (activityOptions.activityHeight * 2 >= drawHeight) {
          yRow = 4;
        }
        if (activityOptions.activityHeight) {
          drawRow(yRow, items, idToColorMaps);
        }
      });
    }
  }

  function getItemEndX(item: { directive?: ActivityDirective; span?: Span; startX: number }) {
    const { span, directive, startX } = item;
    let labelEndX = 0;
    let boxEndX = 0;
    if (directive && showDirectives) {
      boxEndX = 2;
      if (activityOptions.labelVisibility !== 'off') {
        const anchored = directive.anchor_id !== null;
        const directiveLabelWidth = measureText(directive.name, textMetricsCache).width + labelPaddingLeft;
        const finalWidth = anchored
          ? anchorIconWidth + anchorIconMarginLeft + directiveLabelWidth
          : directiveLabelWidth;
        labelEndX = Math.max(startX, minRectSize) + finalWidth;
      }
    }
    if (span && showSpans && xScaleView) {
      const spanEndX = xScaleView(span.endMs);
      boxEndX = Math.max(boxEndX, spanEndX);
      if (activityOptions.labelVisibility !== 'off') {
        labelEndX = Math.max(
          labelEndX,
          Math.max(minRectSize, startX) + labelPaddingLeft + measureText(getLabelForSpan(span), textMetricsCache).width,
        );
      }
    }
    return Math.max(boxEndX, labelEndX);
  }

  function drawRow(y: number, items: ActivityTreeNodeItem[], idToColorMaps: IdToColorMaps) {
    /* TODO this is doing unnecessary work in compact mode - should be able to preprocess grouped mode and skip this first part for compact mode */
    const drawLabels = activityOptions.labelVisibility === 'on' || activityOptions.labelVisibility === 'auto';
    let itemsToDraw: {
      directive?: ActivityDirective;
      directiveStartX?: number;
      span?: Span;
      spanStartX?: number;
    }[] = [];
    items.forEach(item => {
      if (!xScaleView) {
        return;
      }

      const { span, directive } = item;
      let newItem;

      if (span && showSpans && spanInView(span, viewTimeRange)) {
        newItem = { span, spanStartX: xScaleView(span.startMs) };
      }
      if (directive && showDirectives && directiveInView(directive, viewTimeRange)) {
        newItem = { ...newItem, directive, directiveStartX: xScaleView(directive.start_time_ms ?? 0) };
      }
      if (newItem) {
        itemsToDraw.push(newItem);
      }
    });

    itemsToDraw.forEach(({ directive, directiveStartX, span, spanStartX }, i) => {
      if (!xScaleView) {
        return;
      }
      const nextItem = itemsToDraw[i + 1];

      // Draw span
      if (span && typeof spanStartX === 'number') {
        const unfinished = span.duration === null;
        const spanEndX = xScaleView(span.endMs);
        const spanRectWidth = Math.max(2, Math.min(spanEndX, drawWidth) - spanStartX);
        const spanColor = idToColorMaps.spans[span.id] || activityDefaultColor;
        const isSelected = selectedSpanId === span.id || (directive && selectedActivityDirectiveId === directive.id);
        if (isSelected) {
          if (unfinished) {
            ctx.fillStyle = activityUnfinishedSelectedColor;
          } else {
            ctx.fillStyle = activitySelectedColor;
          }
        } else if (unfinished) {
          ctx.fillStyle = shadeColor(activityUnfinishedColor, 1.2);
        } else {
          const color = getRGBAFromHex(spanColor, 0.5);
          ctx.fillStyle = color;
        }
        ctx.fillRect(spanStartX, y, spanRectWidth, rowHeight);

        // Draw label if no directive and the label will fit
        let spanLabelWidth = 0;
        if (drawLabels && (!directive || !showDirectives)) {
          const label = getLabelForSpan(span);
          spanLabelWidth = measureText(label, textMetricsCache).width + labelPaddingLeft;
          let shouldDrawLabel = true;
          if (activityOptions.labelVisibility === 'auto') {
            if (nextItem) {
              const nextX = nextItem.spanStartX ?? nextItem.directiveStartX ?? null;
              if (typeof nextX === 'number' && spanStartX + spanLabelWidth >= nextX) {
                shouldDrawLabel = false;
                spanLabelWidth = 0;
              }
            }
          }
          if (shouldDrawLabel) {
            const spanColor = idToColorMaps.spans[span.id] || activityDefaultColor;
            drawLabel(label, spanStartX, y, spanLabelWidth, spanColor, unfinished, isSelected);
          }
        }

        // Add to quadtree
        visibleSpansById[span.id] = span;
        quadtreeSpans.add({
          height: rowHeight,
          id: span.id,
          width: Math.max(spanLabelWidth, spanRectWidth),
          x: spanStartX,
          y,
        });
      }

      // Draw directive
      if (directive && typeof directiveStartX === 'number') {
        const directiveColor = idToColorMaps.directives[directive.id] || activityDefaultColor;
        const color = hexToRgba(shadeColor(directiveColor || '#FF0000', 1.2), 1);
        const isSelected = selectedActivityDirectiveId === directive.id || (span && selectedSpanId === span.id);
        let directiveLabelWidth = 0;
        const anchored = directive.anchor_id !== null;
        if (isSelected) {
          ctx.fillStyle = shadeColor(activitySelectedColor, 1.3);
        } else {
          ctx.fillStyle = color;
        }
        ctx.fillRect(directiveStartX, y, 2, rowHeight);

        // Determine if label has space to draw
        if (drawLabels) {
          const label = directive.name;
          directiveLabelWidth = measureText(label, textMetricsCache).width + labelPaddingLeft;
          let shouldDrawLabel = true;
          if (activityOptions.labelVisibility === 'auto') {
            const finalWidth = anchored
              ? anchorIconWidth + anchorIconMarginLeft + directiveLabelWidth
              : directiveLabelWidth;
            // TODO could consider both? That said an item could have a span at the start of a plan and a directive at the beginning...
            const nextX = nextItem?.spanStartX || nextItem?.directiveStartX || null;
            if (typeof nextX === 'number' && directiveStartX + finalWidth >= nextX) {
              shouldDrawLabel = false;
              directiveLabelWidth = 0;
            }
          }
          if (shouldDrawLabel) {
            drawLabel(label, directiveStartX, y, directiveLabelWidth, directiveColor, false, isSelected);

            // Draw anchor
            if (anchored) {
              const anchorOpacity = selectedActivityDirectiveId !== null || selectedSpanId !== null ? 0.4 : 1;
              drawAnchorIcon(
                directiveStartX + directiveLabelWidth + anchorIconMarginLeft,
                y + rowHeight / 2 - anchorIconWidth / 2,
                isSelected ? 1 : anchorOpacity,
              );
            }
          }
        }

        // Add to quadtree
        visibleActivityDirectivesById[directive.id] = directive;
        quadtreeActivityDirectives.add({
          height: rowHeight,
          id: directive.id,
          width: directiveLabelWidth + labelPaddingLeft,
          x: directiveStartX,
          y,
        });
      }
    });
  }

  function drawLabel(
    text: string,
    x: number,
    y: number,
    width: number,
    color: string,
    unfinished = false,
    selected = false,
  ) {
    setLabelContext('black');
    if (selected) {
      if (unfinished) {
        ctx.fillStyle = activityUnfinishedSelectedColor;
      } else {
        ctx.fillStyle = activitySelectedTextColor;
      }
    } else if (unfinished) {
      ctx.fillStyle = ctx.fillStyle = shadeColor(activityUnfinishedColor, 1.3);
    } else {
      const opacity = selectedActivityDirectiveId !== null || selectedSpanId !== null ? 0.4 : 1;
      ctx.fillStyle = getRGBAFromHex(shadeColor(color, 2.8), opacity);
    }
    ctx.fillText(text, Math.max(x + labelPaddingLeft, minRectSize), y + rowHeight / 2, width);
  }

  function getRGBAFromHex(color: string, opacity: number = 1) {
    const key = `${color}_${opacity}`;
    let rgba = colorCache[key];
    if (!rgba) {
      rgba = hexToRgba(color, opacity);
      colorCache[key] = rgba;
    }
    return rgba;
  }

  function measureText(text: string, cache: Record<string, TextMetrics>) {
    const cachedMeasurement = cache[text];
    if (cachedMeasurement) {
      return cachedMeasurement;
    }
    const measurement = ctx.measureText(text);
    cache[text] = measurement;
    return measurement;
  }

  function setLabelContext(color = '#000000') {
    const fontSize = 10;
    const fontFace = 'Inter';
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${fontFace}`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'middle';
  }

  function drawAnchorIcon(x: number, y: number, svgOpacity: number) {
    ctx.globalAlpha = svgOpacity;
    if (assets.anchorIcon) {
      ctx.drawImage(assets.anchorIcon, x, y);
    }
    ctx.globalAlpha = 1;
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
      if (activityOptions.displayMode === 'grouped') {
        drawGroupedMode();
      } else if (activityOptions.displayMode === 'compact') {
        drawCompactMode();
      } else {
        console.warn('Unsupported LayerActivity displayMode: ', activityOptions.displayMode);
      }
    }
  }
</script>

<canvas
  bind:this={canvas}
  height={canvasHeightDpr}
  style="height: {drawHeight}px; width: {drawWidth}px;"
  width={canvasWidthDpr}
/>

<style>
  canvas {
    position: absolute;
    z-index: -1;
  }
</style>
