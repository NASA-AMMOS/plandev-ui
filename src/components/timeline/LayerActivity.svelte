<svelte:options immutable={true} />

<script lang="ts">
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { activityPoints } from '../../stores/activities';
  import { timelineLockStatus } from '../../stores/views';
  import effects from '../../utilities/effects';
  import { getDoyTime } from '../../utilities/time';
  import { searchQuadtreeRect, TimelineLockStatus } from '../../utilities/timeline';

  export let activityColor: string = '';
  export let activityHeight: number = 20;
  export let activityRowPadding: number = 20;
  export let activitySelectedColor: string = '#81D4FA';
  export let activityUnfinishedColor: string = '#ff7760';
  export let dragenter: DragEvent | undefined;
  export let dragleave: DragEvent | undefined;
  export let dragover: DragEvent | undefined;
  export let drop: DragEvent | undefined;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ActivityLayerFilter | undefined;
  export let id: number;
  export let mousedown: MouseEvent | undefined;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let mouseup: MouseEvent | undefined;
  export let overlaySvg: SVGElement;
  export let showChildren: boolean = true;
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let dpr: number = 1;
  let dragOffsetX: number | null = null;
  let dragPoint: ActivityPoint | null = null;
  let maxActivityWidth: number;
  let quadtree: Quadtree<QuadtreeRect>;
  let visiblePointsById: Record<number, ActivityPoint> = {};

  $: onDragenter(dragenter);
  $: onDragleave(dragleave);
  $: onDragover(dragover);
  $: onDrop(drop);
  $: onMousedown(mousedown);
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: onMouseup(mouseup);

  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  $: overlaySvgSelection = select(overlaySvg);
  $: rowHeight = activityHeight + activityRowPadding;

  $: timelineLocked = $timelineLockStatus === TimelineLockStatus.Locked;

  $: if (
    $activityPoints !== undefined &&
    activityColor &&
    activityHeight &&
    ctx &&
    drawHeight &&
    drawWidth &&
    filter &&
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

  /**
   * @note We only allow dragging parent activities. Disable dragging all activities if timeline is "locked"
   */
  function dragActivityStart(points: ActivityPoint[], offsetX: number): void {
    if (!timelineLocked && points.length) {
      const [point] = points;
      if (point.parent_id === null) {
        dragOffsetX = offsetX - xScaleView(point.x);
        dragPoint = point;
      }
    }
  }

  function dragActivity(offsetX: number): void {
    if (dragOffsetX && dragPoint) {
      const x = offsetX - dragOffsetX;
      const unixEpochTime = xScaleView.invert(x).getTime();
      const start_time = getDoyTime(new Date(unixEpochTime));
      if (unixEpochTime !== dragPoint.x) {
        effects.updateActivity(dragPoint.id, { start_time }, false);
      }
    }
  }

  function dragActivityEnd(offsetX: number): void {
    if (dragOffsetX && dragPoint) {
      const x = offsetX - dragOffsetX;
      const unixEpochTime = xScaleView.invert(x).getTime();
      const start_time = getDoyTime(new Date(unixEpochTime));
      if (unixEpochTime !== dragPoint.x) {
        effects.updateActivity(dragPoint.id, { start_time });
      }
      dragOffsetX = null;
      dragPoint = null;
    }
  }

  function onDragenter(e: DragEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      overlaySvgSelection
        .append('line')
        .attr('class', 'activity-drag-guide')
        .attr('x1', offsetX)
        .attr('y1', 0)
        .attr('x2', offsetX)
        .attr('y2', drawHeight)
        .attr('stroke', 'black')
        .style('pointer-events', 'none');
    }
  }

  function onDragleave(e: DragEvent | undefined): void {
    if (e) {
      overlaySvgSelection.select('.activity-drag-guide').remove();
    }
  }

  function onDragover(e: DragEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      overlaySvgSelection.select('.activity-drag-guide').attr('x1', offsetX).attr('x2', offsetX);
    }
  }

  function onDrop(e: DragEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      overlaySvgSelection.select('.activity-drag-guide').remove();
      const unixEpochTime = xScaleView.invert(offsetX).getTime();
      const start_time = getDoyTime(new Date(unixEpochTime));
      const activityTypeName = e.dataTransfer.getData('activityTypeName');
      effects.createActivity({}, start_time, activityTypeName);
    }
  }

  function onMousedown(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      const points = searchQuadtreeRect<ActivityPoint>(
        quadtree,
        offsetX,
        offsetY,
        activityHeight,
        maxActivityWidth,
        visiblePointsById,
      );
      dispatch('mouseDown', { e, layerId: id, points });
      dragActivityStart(points, offsetX);
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX, offsetY } = e;
      const points = searchQuadtreeRect<ActivityPoint>(
        quadtree,
        offsetX,
        offsetY,
        activityHeight,
        maxActivityWidth,
        visiblePointsById,
      );
      dispatch('mouseOver', { e, layerId: id, points });
      dragActivity(offsetX);
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { e, layerId: id, points: [] });
    }
  }

  function onMouseup(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX } = e;
      dragActivityEnd(offsetX);
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

      quadtree = d3Quadtree<QuadtreeRect>()
        .x(p => p.x)
        .y(p => p.y)
        .extent([
          [0, 0],
          [drawWidth, drawHeight],
        ]);
      visiblePointsById = {};

      maxActivityWidth = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;
      const coords = [];

      for (const point of $activityPoints) {
        const r = new RegExp(filter?.type);
        const includeActivity = r.test(point?.label?.text);
        const isParentActivity = !point.parent_id;

        if (
          isParentActivity &&
          includeActivity &&
          point.x + point.duration >= viewTimeRange.start &&
          point.x <= viewTimeRange.end
        ) {
          let largestXEnd = Number.MIN_SAFE_INTEGER;
          let largestY = Number.MIN_SAFE_INTEGER;
          const x = xScaleView(point.x);
          const end = xScaleView(point.x + point.duration);
          const { textWidth } = setLabelContext(point);
          const xEnd = end + textWidth;
          let y = rowHeight;

          for (const coord of coords) {
            if (x <= coord.xEnd) {
              y = coord.y + rowHeight;
            }
          }

          drawActivity(point, x, y, end);

          if (xEnd > largestXEnd) {
            largestXEnd = xEnd;
          }
          if (y > largestY) {
            largestY = y;
          }

          const childCoords = drawChildren(point, y);

          if (childCoords) {
            if (childCoords.xEnd > largestXEnd) {
              largestXEnd = childCoords.xEnd;
            }
            if (childCoords.y > largestY) {
              largestY = childCoords.y;
            }
          }

          coords.push({ xEnd: largestXEnd, y: largestY });

          if (largestY > maxY) {
            maxY = largestY;
          }
        }
      }

      const newHeight = maxY + rowHeight;
      if (newHeight > 0 && drawHeight !== newHeight) {
        dispatch('updateRowHeight', { layerId: id, newHeight });
      }
    }
  }

  function drawActivity(point: ActivityPoint, x: number, y: number, end: number) {
    const { id } = point;
    const activityWidth = Math.max(5.0, end - x);
    const rect = new Path2D();
    rect.rect(x, y, activityWidth, activityHeight);

    quadtree.add({
      height: activityHeight,
      id,
      width: activityWidth,
      x,
      y,
    });
    visiblePointsById[id] = point;

    if (activityWidth > maxActivityWidth) {
      maxActivityWidth = activityWidth;
    }

    if (point.selected) {
      ctx.fillStyle = activitySelectedColor;
    } else if (point.unfinished) {
      ctx.fillStyle = activityUnfinishedColor;
    } else {
      ctx.fillStyle = activityColor;
    }

    ctx.fill(rect);
    const hideLabel = point.label?.hidden || false;
    if (!hideLabel) {
      const { labelText, textMetrics } = setLabelContext(point);
      ctx.fillText(labelText, x, y, textMetrics.width);
    }
  }

  function drawChildren(parent: ActivityPoint, parentY: number) {
    if (showChildren && parent?.children?.length) {
      let largestXEnd = Number.MIN_SAFE_INTEGER;
      let largestY = Number.MIN_SAFE_INTEGER;
      let y = parentY;

      for (const point of parent.children) {
        const x = xScaleView(point.x);
        const end = xScaleView(point.x + point.duration);
        const { textWidth } = setLabelContext(point);
        const xEnd = end + textWidth;
        y = y + rowHeight;

        drawActivity(point, x, y, end);

        if (xEnd > largestXEnd) {
          largestXEnd = xEnd;
        }
        if (y > largestY) {
          largestY = y;
        }

        const childCoords = drawChildren(point, y);

        if (childCoords) {
          if (childCoords.xEnd > largestXEnd) {
            largestXEnd = childCoords.xEnd;
          }
          if (childCoords.y > largestY) {
            largestY = childCoords.y;
          }
        }
      }

      return { xEnd: largestXEnd, y: largestY };
    }

    return null;
  }

  function setLabelContext(point: ActivityPoint) {
    const fontSize = point.label?.fontSize || 12;
    const fontFace = point.label?.fontFace || 'Helvetica Neue';
    ctx.fillStyle = point.label?.color || '#000000';
    ctx.font = `${fontSize}px ${fontFace}`;
    ctx.textAlign = point.label?.align || 'start';
    ctx.textBaseline = point.label?.baseline || 'alphabetic';
    const labelText = point.label?.text || '';
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
