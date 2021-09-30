<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { Quadtree } from 'd3-quadtree';
  import { quadtree as d3Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { curveLinear, line as d3Line } from 'd3-shape';
  import type {
    Axis,
    LinePoint,
    QuadtreePoint,
    Resource,
    ResourceLayerFilter,
    StringTMap,
    TimeRange,
  } from '../../types';
  import { getUnixEpochTime } from '../../utilities/time';
  import { getYScale, searchQuadtreePoint } from '../../utilities/timeline';

  const dispatch = createEventDispatcher();

  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ResourceLayerFilter | undefined;
  export let id: string = '';
  export let lineColor: string | undefined;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let resources: Resource[] = [];
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let yAxes: Axis[] = [];
  export let yAxisId: string = '';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let dpr: number = 1;
  let mounted: boolean = false;
  let quadtree: Quadtree<QuadtreePoint>;
  let visiblePointsById: StringTMap<LinePoint> = {};

  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: if (
    drawHeight &&
    drawWidth &&
    (lineColor !== undefined || lineColor !== null) &&
    mounted &&
    points &&
    viewTimeRange &&
    xScaleView
  ) {
    draw();
  }
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: points = resourcesToLinePoints(resources);

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

      const fill = lineColor || '#283593';
      ctx.fillStyle = fill;
      ctx.lineWidth = 1;
      ctx.strokeStyle = fill;

      const line = d3Line<LinePoint>()
        .x(d => xScaleView(d.x))
        .y(d => yScale(d.y))
        .curve(curveLinear);
      ctx.beginPath();
      line.context(ctx)(points);
      ctx.stroke();
      ctx.closePath();

      for (const point of points) {
        const { id } = point;

        if (point.x >= viewTimeRange.start && point.x <= viewTimeRange.end) {
          const x = xScaleView(point.x);
          const y = yScale(point.y);
          quadtree.add({ id, x, y });
          visiblePointsById[id] = point;

          const circle = new Path2D();
          const radius = point.radius || 2.0;
          circle.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill(circle);
        }
      }
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x, offsetY: y } = e;
      const points = searchQuadtreePoint<LinePoint>(
        quadtree,
        x,
        y,
        2.0, // TODO.
        visiblePointsById,
      );
      dispatch('mouseOverPoints', { e, layerId: id, points });
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOverPoints', { e, layerId: id, points: [] });
    }
  }

  function resourcesToLinePoints(resources: Resource[]): LinePoint[] {
    const points: LinePoint[] = [];

    for (const resource of resources) {
      const { name, schema, start, values } = resource;
      const r = new RegExp(filter?.name);
      const includeResource = r.test(name);

      if (includeResource) {
        if (schema.type === 'boolean') {
          for (let i = 0; i < values.length; ++i) {
            const value = values[i];
            const { x, y: yBoolean } = value;
            const y = yBoolean ? 1 : 0;
            points.push({
              id: `${id}-resource-${name}-${i}`,
              name,
              type: 'line',
              x: getUnixEpochTime(start) + x / 1000,
              y,
            });
          }
        } else if (schema.type === 'int' || schema.type === 'real') {
          for (let i = 0; i < values.length; ++i) {
            const value = values[i];
            const { x } = value;
            const y = value.y as number;
            points.push({
              id: `${id}-resource-${name}-${i}`,
              name,
              type: 'line',
              x: getUnixEpochTime(start) + x / 1000,
              y,
            });
          }
        }
      }
    }

    return points;
  }
</script>

<canvas
  bind:this={canvas}
  height={canvasHeightDpr}
  {id}
  style="height: {drawHeight}px; width: {drawWidth}px;"
  width={canvasWidthDpr}
/>

<style>
  canvas {
    position: absolute;
    z-index: -1;
  }
</style>
