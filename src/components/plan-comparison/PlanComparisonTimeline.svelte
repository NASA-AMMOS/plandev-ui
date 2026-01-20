<svelte:options immutable={true} />

<script lang="ts">
  import { scaleTime, type ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { zoom as d3Zoom, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import { onMount, tick } from 'svelte';
  import type { ActivityComparisonResult, ComparisonActivity, ComparisonSource } from '../../types/plan-comparison';
  import type { TimeRange } from '../../types/timeline';
  import { hexToRgba, shadeColor } from '../../utilities/color';

  export let leftSource: ComparisonSource | null;
  export let rightSource: ComparisonSource | null;
  export let leftActivities: ComparisonActivity[];
  export let rightActivities: ComparisonActivity[];
  export let results: ActivityComparisonResult[];
  export let planStartTime: string;
  export let planDuration: string;

  // View state
  let containerWidth = 0;
  let containerHeight = 0;
  let leftCanvasEl: HTMLCanvasElement;
  let rightCanvasEl: HTMLCanvasElement;
  let leftOverlaySvg: SVGSVGElement;
  let rightOverlaySvg: SVGSVGElement;
  let leftCtx: CanvasRenderingContext2D | null = null;
  let rightCtx: CanvasRenderingContext2D | null = null;

  // Timeline configuration
  const ROW_HEIGHT = 20;
  const ROW_PADDING = 3;
  const LABEL_PADDING = 4;
  const HEADER_HEIGHT = 40;
  const MIN_RECT_WIDTH = 2;
  const DEFAULT_ACTIVITY_DURATION = 60 * 60 * 1000; // 1 hour for visualization

  // Colors for different change types
  const COLORS = {
    added: '#00C853',
    deleted: '#FF3B30',
    modified: '#FFA500',
    unchanged: '#6B7280',
  };

  // Build color maps based on comparison results
  type ActivityColorMap = Map<number, { color: string; status: 'added' | 'deleted' | 'modified' | 'unchanged' }>;

  $: leftColorMap = buildColorMap(results, 'left');
  $: rightColorMap = buildColorMap(results, 'right');

  function buildColorMap(comparisonResults: ActivityComparisonResult[], side: 'left' | 'right'): ActivityColorMap {
    const colorMap: ActivityColorMap = new Map();

    for (const result of comparisonResults) {
      if (result.changeType === 'added') {
        if (side === 'right') {
          colorMap.set(result.activity.id, { color: COLORS.added, status: 'added' });
        }
      } else if (result.changeType === 'deleted') {
        if (side === 'left') {
          colorMap.set(result.activity.id, { color: COLORS.deleted, status: 'deleted' });
        }
      } else if (result.changeType === 'matched') {
        const activityId = side === 'left' ? result.leftActivity.id : result.rightActivity.id;
        if (result.changedFields.length > 0) {
          colorMap.set(activityId, { color: COLORS.modified, status: 'modified' });
        } else {
          colorMap.set(activityId, { color: COLORS.unchanged, status: 'unchanged' });
        }
      }
    }

    return colorMap;
  }

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

  // D3 zoom state
  let leftZoom: ZoomBehavior<SVGSVGElement, unknown>;
  let rightZoom: ZoomBehavior<SVGSVGElement, unknown>;
  let leftSvgSelection: Selection<SVGSVGElement, unknown, null, undefined>;
  let rightSvgSelection: Selection<SVGSVGElement, unknown, null, undefined>;
  let isZoomingSynchronized = true;

  // Create X scale for positioning activities
  function createXScale(width: number, timeRange: TimeRange): ScaleTime<number, number> | null {
    if (width <= 0 || !timeRange.start || !timeRange.end) {
      return null;
    }
    return scaleTime()
      .domain([timeRange.start, timeRange.end])
      .range([0, width]);
  }

  $: panelWidth = containerWidth > 0 ? (containerWidth - 12) / 2 : 0;
  $: xScaleView = createXScale(panelWidth, viewTimeRange);
  $: xScaleMax = createXScale(panelWidth, maxTimeRange);

  // Parse activity start offset to absolute time
  function getActivityStartTime(activity: ComparisonActivity): number {
    const offsetMs = parseDurationToMs(activity.start_offset);
    return planStart + offsetMs;
  }

  // Convert ComparisonActivity to drawable format with start_time_ms
  function prepareActivitiesForDrawing(activities: ComparisonActivity[]): (ComparisonActivity & { start_time_ms: number })[] {
    return activities.map(activity => ({
      ...activity,
      start_time_ms: getActivityStartTime(activity),
    })).sort((a, b) => a.start_time_ms - b.start_time_ms);
  }

  $: leftDrawableActivities = prepareActivitiesForDrawing(leftActivities);
  $: rightDrawableActivities = prepareActivitiesForDrawing(rightActivities);

  // Quadtrees for hit detection
  type QuadtreeRect = { height: number; id: number; width: number; x: number; y: number };
  let leftQuadtree: Quadtree<QuadtreeRect>;
  let rightQuadtree: Quadtree<QuadtreeRect>;

  // Row packing algorithm - place activities in rows to avoid overlaps
  function packActivitiesIntoRows(
    activities: (ComparisonActivity & { start_time_ms: number })[],
    xScale: ScaleTime<number, number>,
    colorMap: ActivityColorMap,
  ): { activity: ComparisonActivity & { start_time_ms: number }; color: string; row: number; status: string }[] {
    const result: { activity: ComparisonActivity & { start_time_ms: number }; color: string; row: number; status: string }[] = [];
    const rowEndTimes: number[] = [];

    for (const activity of activities) {
      const colorInfo = colorMap.get(activity.id);
      const color = colorInfo?.color ?? COLORS.unchanged;
      const status = colorInfo?.status ?? 'unchanged';

      const startX = xScale(activity.start_time_ms);
      const endX = xScale(activity.start_time_ms + DEFAULT_ACTIVITY_DURATION);
      const activityEndX = Math.max(startX + MIN_RECT_WIDTH + 50, endX); // Include label width estimate

      // Find first row where activity fits
      let row = 0;
      while (row < rowEndTimes.length && rowEndTimes[row] > startX) {
        row++;
      }

      rowEndTimes[row] = activityEndX;
      result.push({ activity, color, row, status });
    }

    return result;
  }

  // Text measurement cache
  const textMetricsCache: Record<string, TextMetrics> = {};

  function measureText(ctx: CanvasRenderingContext2D, text: string): TextMetrics {
    let metrics = textMetricsCache[text];
    if (!metrics) {
      metrics = ctx.measureText(text);
      textMetricsCache[text] = metrics;
    }
    return metrics;
  }

  // Draw activities on canvas
  function drawTimeline(
    ctx: CanvasRenderingContext2D,
    activities: (ComparisonActivity & { start_time_ms: number })[],
    colorMap: ActivityColorMap,
    width: number,
    height: number,
    dpr: number,
    quadtree: Quadtree<QuadtreeRect>,
  ) {
    if (!xScaleView) {
      return;
    }

    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.restore();

    ctx.scale(dpr, dpr);

    // Pack activities into rows
    const packedActivities = packActivitiesIntoRows(activities, xScaleView, colorMap);

    // Reset quadtree
    quadtree = d3Quadtree<QuadtreeRect>()
      .x(d => d.x)
      .y(d => d.y);

    // Draw each activity
    for (const { activity, color, row, status } of packedActivities) {
      const startX = xScaleView(activity.start_time_ms);
      const endX = xScaleView(activity.start_time_ms + DEFAULT_ACTIVITY_DURATION);

      // Skip if out of view
      if (endX < 0 || startX > width) {
        continue;
      }

      const x = Math.max(0, startX);
      const rectWidth = Math.max(MIN_RECT_WIDTH, Math.min(endX, width) - x);
      const y = HEADER_HEIGHT + row * (ROW_HEIGHT + ROW_PADDING);

      // Draw activity rectangle
      const fillColor = hexToRgba(color, status === 'unchanged' ? 0.4 : 0.7);
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.roundRect(x, y, rectWidth, ROW_HEIGHT, 3);
      ctx.fill();

      // Draw border for added/deleted/modified
      if (status !== 'unchanged') {
        ctx.strokeStyle = color;
        ctx.lineWidth = status === 'deleted' ? 1.5 : 2;
        if (status === 'deleted') {
          ctx.setLineDash([4, 2]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw activity label
      ctx.fillStyle = status === 'unchanged' ? '#4b5563' : shadeColor(color, 2.5);
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      const label = activity.name.length > 20 ? activity.name.substring(0, 20) + '...' : activity.name;
      const textMetrics = measureText(ctx, label);
      if (textMetrics.width + LABEL_PADDING * 2 < rectWidth) {
        ctx.fillText(label, x + LABEL_PADDING, y + ROW_HEIGHT / 2 + 4);
      }

      // Add to quadtree for hit detection
      quadtree.add({
        height: ROW_HEIGHT,
        id: activity.id,
        width: Math.max(rectWidth, textMetrics.width + LABEL_PADDING * 2),
        x,
        y,
      });
    }

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Draw time axis
  function drawTimeAxis(ctx: CanvasRenderingContext2D, width: number, dpr: number) {
    if (!xScaleView) {
      return;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = 'var(--st-gray-10, #f3f4f6)';
    ctx.fillRect(0, 0, width, HEADER_HEIGHT);

    // Draw axis line
    ctx.strokeStyle = 'var(--st-gray-30, #d1d5db)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT - 1);
    ctx.lineTo(width, HEADER_HEIGHT - 1);
    ctx.stroke();

    // Draw tick marks
    const ticks = xScaleView.ticks(6);
    ctx.fillStyle = 'var(--st-gray-60, #4b5563)';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    ticks.forEach(tick => {
      const x = xScaleView!(tick);

      // Tick line
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT - 8);
      ctx.lineTo(x, HEADER_HEIGHT - 1);
      ctx.stroke();

      // Format time label
      const date = new Date(tick);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      ctx.fillText(`${hours}:${minutes}`, x, HEADER_HEIGHT - 14);
    });

    ctx.restore();
  }

  // Redraw both timelines
  function redraw() {
    if (!leftCtx || !rightCtx || panelWidth <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const canvasHeight = containerHeight - 100; // Account for header and legend

    // Set canvas dimensions
    [leftCanvasEl, rightCanvasEl].forEach(canvas => {
      canvas.width = panelWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${panelWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
    });

    // Initialize quadtrees
    leftQuadtree = d3Quadtree<QuadtreeRect>().x(d => d.x).y(d => d.y);
    rightQuadtree = d3Quadtree<QuadtreeRect>().x(d => d.x).y(d => d.y);

    // Draw both timelines
    drawTimeAxis(leftCtx, panelWidth, dpr);
    drawTimeline(leftCtx, leftDrawableActivities, leftColorMap, panelWidth, canvasHeight, dpr, leftQuadtree);

    drawTimeAxis(rightCtx, panelWidth, dpr);
    drawTimeline(rightCtx, rightDrawableActivities, rightColorMap, panelWidth, canvasHeight, dpr, rightQuadtree);
  }

  // Zoom handler
  function onZoom(event: D3ZoomEvent<SVGSVGElement, unknown>, source: 'left' | 'right') {
    if (!xScaleMax || !panelWidth) {
      return;
    }

    const transform = event.transform;

    // Calculate new view time range from zoom transform
    const newViewStart = xScaleMax.invert(-transform.x / transform.k).getTime();
    const newViewEnd = xScaleMax.invert((panelWidth - transform.x) / transform.k).getTime();

    viewTimeRange = {
      end: Math.min(newViewEnd, maxTimeRange.end),
      start: Math.max(newViewStart, maxTimeRange.start),
    };

    // Synchronize zoom to other timeline
    if (isZoomingSynchronized) {
      const otherSelection = source === 'left' ? rightSvgSelection : leftSvgSelection;
      const otherZoom = source === 'left' ? rightZoom : leftZoom;
      if (otherSelection && otherZoom) {
        otherSelection.call(otherZoom.transform, transform);
      }
    }
  }

  // Setup zoom behaviors
  function setupZoom() {
    if (!leftOverlaySvg || !rightOverlaySvg || !panelWidth) {
      return;
    }

    leftSvgSelection = select(leftOverlaySvg);
    rightSvgSelection = select(rightOverlaySvg);

    const zoomBehavior = (source: 'left' | 'right') =>
      d3Zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 100])
        .translateExtent([
          [0, 0],
          [panelWidth, containerHeight],
        ])
        .on('zoom', (event) => onZoom(event, source));

    leftZoom = zoomBehavior('left');
    rightZoom = zoomBehavior('right');

    leftSvgSelection.call(leftZoom);
    rightSvgSelection.call(rightZoom);
  }

  onMount(() => {
    leftCtx = leftCanvasEl?.getContext('2d');
    rightCtx = rightCanvasEl?.getContext('2d');
  });

  // Reactive redraw
  $: if (leftCtx && rightCtx && panelWidth > 0 && leftActivities && rightActivities && viewTimeRange.start > 0) {
    tick().then(redraw);
  }

  // Setup zoom when panel width is ready
  $: if (panelWidth > 0 && leftOverlaySvg && rightOverlaySvg) {
    setupZoom();
  }
</script>

<div class="comparison-timeline" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <div class="timeline-header">
    <div class="timeline-legend">
      <span class="legend-item added"><span class="legend-color"></span> Added</span>
      <span class="legend-item deleted"><span class="legend-color"></span> Deleted</span>
      <span class="legend-item modified"><span class="legend-color"></span> Modified</span>
      <span class="legend-item unchanged"><span class="legend-color"></span> Unchanged</span>
    </div>
    <div class="zoom-hint">
      <span>Scroll to zoom • Drag to pan</span>
    </div>
  </div>

  <div class="timelines-container">
    <!-- Left Timeline -->
    <div class="timeline-panel">
      <div class="timeline-label">{leftSource?.name ?? 'Left'}</div>
      <div class="timeline-canvas-wrapper">
        <canvas bind:this={leftCanvasEl} class="timeline-canvas"></canvas>
        <svg bind:this={leftOverlaySvg} class="timeline-overlay"></svg>
      </div>
    </div>

    <!-- Divider -->
    <div class="timeline-divider"></div>

    <!-- Right Timeline -->
    <div class="timeline-panel">
      <div class="timeline-label">{rightSource?.name ?? 'Right'}</div>
      <div class="timeline-canvas-wrapper">
        <canvas bind:this={rightCanvasEl} class="timeline-canvas"></canvas>
        <svg bind:this={rightOverlaySvg} class="timeline-overlay"></svg>
      </div>
    </div>
  </div>
</div>

<style>
  .comparison-timeline {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 16px;
  }

  .timeline-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .timeline-legend {
    display: flex;
    gap: 16px;
  }

  .legend-item {
    align-items: center;
    display: flex;
    font-size: 12px;
    gap: 4px;
  }

  .legend-color {
    border-radius: 2px;
    height: 12px;
    width: 12px;
  }

  .legend-item.added .legend-color {
    background: #00C853;
  }

  .legend-item.deleted .legend-color {
    background: #FF3B30;
  }

  .legend-item.modified .legend-color {
    background: #FFA500;
  }

  .legend-item.unchanged .legend-color {
    background: #6B7280;
  }

  .zoom-hint {
    color: var(--st-gray-50);
    font-size: 11px;
  }

  .timelines-container {
    display: flex;
    flex: 1;
    gap: 8px;
    min-height: 0;
  }

  .timeline-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .timeline-label {
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-20);
    font-weight: 500;
    padding: 8px;
  }

  .timeline-canvas-wrapper {
    background: var(--st-gray-05);
    border: 1px solid var(--st-gray-20);
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .timeline-canvas {
    display: block;
    height: 100%;
    width: 100%;
  }

  .timeline-overlay {
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  }

  .timeline-divider {
    background: var(--st-gray-30);
    width: 2px;
  }
</style>
