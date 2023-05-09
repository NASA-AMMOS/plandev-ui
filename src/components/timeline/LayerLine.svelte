<svelte:options immutable={true} />

<script lang="ts">
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { curveLinear, line as d3Line } from 'd3-shape';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { Resource } from '../../types/simulation';
  import type { Axis, LinePoint, QuadtreePoint, ResourceLayerFilter, TimeRange } from '../../types/timeline';
  import { getYScale, searchQuadtreePoint } from '../../utilities/timeline';

  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  // TODO make an issue to remove these unneeded filters from LayerLine, LayerRange, etc
  export let filter: ResourceLayerFilter | undefined;
  export let id: number;
  export let lineColor: string = '';
  export let lineWidth: number = 1;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let pointRadius: number = 2;
  export let resources: Resource[] = [];
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let yAxes: Axis[] = [];
  export let yAxisId: number | null = null;

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let dpr: number = 1;
  let mounted: boolean = false;
  let quadtree: Quadtree<QuadtreePoint>;
  let visiblePointsById: Record<number, LinePoint> = {};

  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: if (
    drawHeight &&
    drawWidth &&
    // TODO swap filter out for resources which are recomputed when the view changes (i.e. filter changes)
    filter &&
    lineColor &&
    typeof lineWidth === 'number' &&
    typeof pointRadius === 'number' &&
    mounted &&
    points &&
    viewTimeRange &&
    xScaleView &&
    yAxes &&
    yAxisId !== undefined
  ) {
    draw();
  }
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: points = resourcesToLinePoints(resources, pointRadius);

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      dpr = window.devicePixelRatio;
    }
    mounted = true;
  });

  async function draw(): Promise<void> {
    if (ctx) {
      await tick();

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, drawWidth, drawHeight);

      const [yAxis] = yAxes.filter(axis => yAxisId === axis.id);
      const domain = yAxis?.scaleDomain || [];
      const yScale = getYScale(domain, drawHeight);

      quadtree = d3Quadtree<QuadtreePoint>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [drawWidth, drawHeight],
        ]);
      visiblePointsById = {};

      const fill = lineColor;
      ctx.fillStyle = fill;
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = fill;

      const line = d3Line<LinePoint>()
        .x(d => xScaleView(d.x))
        .y(d => yScale(d.y))
        .defined(d => d.y !== null) // Skip any gaps in resource data instead of interpolating
        .curve(curveLinear);
      ctx.beginPath();
      line.context(ctx)(points);
      ctx.stroke();
      ctx.closePath();

      for (const point of points) {
        const { id, radius } = point;

        if (point.x >= viewTimeRange.start && point.x <= viewTimeRange.end) {
          const x = xScaleView(point.x);
          const y = yScale(point.y);
          quadtree.add({ id, x, y });
          visiblePointsById[id] = point;

          const circle = new Path2D();
          circle.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill(circle);
        }
      }
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x, offsetY: y } = e;
      const points = searchQuadtreePoint<LinePoint>(quadtree, x, y, pointRadius, visiblePointsById);
      dispatch('mouseOver', { e, layerId: id, points });
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { e, layerId: id, points: [] });
    }
  }

  function resourcesToLinePoints(resources: Resource[], radius: number): LinePoint[] {
    const points: LinePoint[] = [];
    let id = 0;

    for (const resource of resources) {
      const { name, schema, values } = resource;

      if (schema.type === 'boolean') {
        for (let i = 0; i < values.length; ++i) {
          const value = values[i];
          const { x, y: yBoolean } = value;
          const y = yBoolean ? 1 : 0;
          points.push({
            id: id++,
            name,
            radius,
            type: 'line',
            x,
            y,
          });
        }
      } else if (
        schema.type === 'int' ||
        schema.type === 'real' ||
        (schema.type === 'struct' && schema?.items?.rate?.type === 'real' && schema?.items?.initial?.type === 'real')
      ) {
        for (let i = 0; i < values.length; ++i) {
          const value = values[i];
          const { x } = value;
          const y = value.y as number;
          points.push({
            id: id++,
            name,
            radius,
            type: 'line',
            x,
            y,
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
  id={`layer-line-${id}`}
  style="height: {drawHeight}px; width: {drawWidth}px;"
  width={canvasWidthDpr}
/>

<style>
  canvas {
    position: absolute;
    z-index: -1;
  }
</style>
