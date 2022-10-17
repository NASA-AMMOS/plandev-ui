<svelte:options immutable={true} />

<script lang="ts">
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { activitiesMap, activityPoints, selectedActivityId } from '../../stores/activities';
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
  let visiblePointsByUniqueId: Record<ActivityUniqueId, ActivityPoint> = {};

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
    $selectedActivityId !== undefined &&
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
      // TODO: Update activity directly without updating entire activitiesMap.
      dragPoint.x = unixEpochTime;
      draw();
    }
  }

  function dragActivityEnd(offsetX: number): void {
    if (dragOffsetX && dragPoint) {
      const x = offsetX - dragOffsetX;
      const unixEpochTime = xScaleView.invert(x).getTime();
      const start_time_doy = getDoyTime(new Date(unixEpochTime));
      const dragActivity = $activitiesMap[dragPoint.uniqueId];
      if (dragActivity && dragActivity.start_time_doy !== start_time_doy) {
        effects.updateActivityDirective(dragActivity.id, { start_time_doy });
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
      effects.createActivityDirective({}, start_time, activityTypeName, activityTypeName, [], {});
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
        visiblePointsByUniqueId,
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
        visiblePointsByUniqueId,
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
      visiblePointsByUniqueId = {};

      maxActivityWidth = Number.MIN_SAFE_INTEGER;
      let totalMaxY = Number.MIN_SAFE_INTEGER;
      const boundingBoxes: BoundingBox[] = [];

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
          const x = xScaleView(point.x);
          const end = xScaleView(point.x + point.duration);
          const { textWidth } = setLabelContext(point);
          const xEnd = end + textWidth;

          let maxX = Number.MIN_SAFE_INTEGER;
          let maxY = Number.MIN_SAFE_INTEGER;
          let y = rowHeight;

          for (const boundingBox of boundingBoxes) {
            if (x <= boundingBox.maxX) {
              y = boundingBox.maxY + rowHeight;
            }
          }

          drawActivity(point, x, y, end);

          if (xEnd > maxX) {
            maxX = xEnd;
          }
          if (y > maxY) {
            maxY = y;
          }

          const childrenBoundingBox: BoundingBox = drawChildren(point, y);

          if (childrenBoundingBox) {
            if (childrenBoundingBox.maxX > maxX) {
              maxX = childrenBoundingBox.maxX;
            }
            if (childrenBoundingBox.maxY > maxY) {
              maxY = childrenBoundingBox.maxY;
            }
          }

          boundingBoxes.push({ maxX, maxY });

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

  function drawActivity(point: ActivityPoint, x: number, y: number, end: number) {
    const { uniqueId } = point;
    const activityWidth = Math.max(5.0, end - x);
    const rect = new Path2D();
    rect.rect(x, y, activityWidth, activityHeight);

    quadtree.add({
      height: activityHeight,
      id: uniqueId,
      width: activityWidth,
      x,
      y,
    });
    visiblePointsByUniqueId[uniqueId] = point;

    if (activityWidth > maxActivityWidth) {
      maxActivityWidth = activityWidth;
    }

    if ($selectedActivityId === uniqueId) {
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

  function drawChildren(parent: ActivityPoint, parentY: number): BoundingBox | null {
    if (showChildren && parent?.children?.length) {
      const boundingBoxes: BoundingBox[] = [];

      let maxX = Number.MIN_SAFE_INTEGER;
      let maxY = Number.MIN_SAFE_INTEGER;
      let y = parentY + rowHeight;

      for (const point of parent.children) {
        const x = xScaleView(point.x);
        const end = xScaleView(point.x + point.duration);
        const { textWidth } = setLabelContext(point);
        const xEnd = end + textWidth;

        for (const boundingBox of boundingBoxes) {
          if (x <= boundingBox.maxX) {
            y = boundingBox.maxY + rowHeight;
          }
        }

        drawActivity(point, x, y, end);

        if (xEnd > maxX) {
          maxX = xEnd;
        }
        if (y > maxY) {
          maxY = y;
        }

        const childrenBoundingBox: BoundingBox = drawChildren(point, y);

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
