<svelte:options immutable={true} />

<script lang="ts">
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { Resource } from '../../types/simulation';
  import type { QuadtreeRect, ResourceLayerFilter, XRangeLayerColorScheme, XRangePoint } from '../../types/timeline';
  import { clamp } from '../../utilities/generic';
  import { searchQuadtreeRect } from '../../utilities/timeline';

  export let colorScheme: XRangeLayerColorScheme = 'schemeAccent';
  export let dpr: number = 1;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ResourceLayerFilter | undefined;
  export let id: number;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let opacity: number = 0.8;
  export let resources: Resource[] = [];
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let maxXWidth: number;
  let mounted: boolean = false;
  let points: XRangePoint[] = [];
  let quadtree: Quadtree<QuadtreeRect>;
  let visiblePointsById: Record<number, XRangePoint> = {};
  let gapPattern: CanvasPattern | null;

  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: if (
    canvasHeightDpr &&
    canvasWidthDpr &&
    dpr &&
    drawHeight &&
    drawWidth &&
    colorScheme &&
    filter &&
    mounted &&
    opacity !== undefined &&
    points &&
    xScaleView
  ) {
    draw();
  }
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: points = resourceGapsToXRangePoints(resources);

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
    mounted = true;
  });

  function getGapPattern(context: CanvasRenderingContext2D) {
    // Render hashed diagonal line pattern (used to represent gaps in data) to offscreen canvas.
    // Immediately return pattern if it's already been constructed.

    if (gapPattern) {
      return gapPattern;
    }

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const patternContext = patternCanvas.getContext('2d');

    if (patternContext !== null) {
      patternContext.beginPath();
      patternContext.strokeStyle = '#00000033';

      // Draw main diagonal line
      patternContext.moveTo(0, 10);
      patternContext.lineTo(10, 0);

      // Draw two extra lines across the top left and bottom right corners to fill gaps in pattern
      patternContext.moveTo(-1, 1);
      patternContext.lineTo(1, -1);

      patternContext.moveTo(9, 11);
      patternContext.lineTo(11, 9);

      patternContext.stroke();
    }
    gapPattern = context.createPattern(patternCanvas, 'repeat');
    return gapPattern;
  }

  async function draw(): Promise<void> {
    if (ctx && xScaleView) {
      await tick();

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, drawWidth, drawHeight);
      ctx.globalAlpha = opacity;

      quadtree = d3Quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [drawWidth, drawHeight],
        ]);
      visiblePointsById = {};

      maxXWidth = Number.MIN_SAFE_INTEGER;

      // Each gap will be a pair of points (start/end), so iterate every two
      for (let i = 0; i < points.length; i = i + 2) {
        const point = points[i];
        const nextPoint = points[i + 1];
        const xStart = clamp(xScaleView(point.x), 0, drawWidth);
        const xEnd = clamp(xScaleView(nextPoint ? nextPoint.x : points[i].x), 0, drawWidth);

        const xWidth = xEnd - xStart;
        const y = 0;

        if (xWidth > 0) {
          const { id } = point;
          visiblePointsById[id] = point;

          const gapPattern = getGapPattern(ctx);
          if (gapPattern !== null) {
            ctx.fillStyle = gapPattern;
          }
          const rect = new Path2D();
          rect.rect(xStart, y, xWidth, drawHeight);
          ctx.fill(rect);

          quadtree.add({
            height: drawHeight,
            id,
            width: xWidth,
            x: xStart,
            y,
          });

          if (xWidth > maxXWidth) {
            maxXWidth = xWidth;
          }
        }
      }
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x, offsetY: y } = e;
      const gaps = searchQuadtreeRect<XRangePoint>(quadtree, x, y, drawHeight, maxXWidth, visiblePointsById);
      dispatch('mouseOver', { e, gaps, layerId: id });
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { e, gaps: [], layerId: id });
    }
  }

  function resourceGapsToXRangePoints(resources: Resource[]): XRangePoint[] {
    const points: XRangePoint[] = [];
    let id = 0;

    for (const resource of resources) {
      const { name, values } = resource;

      for (let i = 0; i < values.length; ++i) {
        const { x, is_gap } = values[i];
        if (is_gap) {
          points.push({
            id: id++,
            label: { text: 'No Value' },
            name,
            type: 'x-range',
            x,
          });
        }
      }
    }

    return points;
  }
</script>

<canvas
  bind:this={canvas}
  height={canvasHeightDpr}
  id={`layer-gaps-${id}`}
  style="height: {drawHeight}px; width: {drawWidth}px;"
  width={canvasWidthDpr}
/>

<style>
  canvas {
    position: absolute;
    z-index: -1;
  }
</style>
