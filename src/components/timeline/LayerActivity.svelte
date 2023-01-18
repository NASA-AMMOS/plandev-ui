<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { activitiesMap } from '../../stores/activities';
  import { timelineLockStatus } from '../../stores/views';
  import type { Activity, ActivityUniqueId } from '../../types/activity';
  import type { ActivityLayerFilter, ActivityPoint, BoundingBox, QuadtreeRect, TimeRange } from '../../types/timeline';
  import { decomposeActivityDirectiveId, sortActivities } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { isDeleteEvent } from '../../utilities/keyboardEvents';
  import { getDoyTime, getDurationInMs, getUnixEpochTime } from '../../utilities/time';
  import { searchQuadtreeRect, TimelineLockStatus } from '../../utilities/timeline';

  export let activities: Activity[] = [];
  export let activityColor: string = '';
  export let activityHeight: number = 20;
  export let activityRowPadding: number = 20;
  export let activitySelectedColor: string = '#81D4FA';
  export let activityUnfinishedColor: string = '#ff7760';
  export let blur: FocusEvent | undefined;
  export let dragenter: DragEvent | undefined;
  export let dragleave: DragEvent | undefined;
  export let dragover: DragEvent | undefined;
  export let drop: DragEvent | undefined;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ActivityLayerFilter | undefined;
  export let id: number;
  export let focus: FocusEvent | undefined;
  export let mousedown: MouseEvent | undefined;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let mouseup: MouseEvent | undefined;
  export let overlaySvg: SVGElement;
  export let selectedActivityId: ActivityUniqueId | null = null;
  export let showChildren: boolean = true;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
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

  $: onBlur(blur);
  $: onDragenter(dragenter);
  $: onDragleave(dragleave);
  $: onDragover(dragover);
  $: onDrop(drop);
  $: onFocus(focus);
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
    activities &&
    activityColor &&
    activityHeight &&
    ctx &&
    drawHeight &&
    drawWidth &&
    filter &&
    selectedActivityId !== undefined &&
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

  /**
   * Recursively converts an Activity to an ActivityPoint.
   * Sorts child activity points in start time ascending order.
   */
  function activityToPoint(activity: Activity): ActivityPoint {
    const children = activity?.childUniqueIds
      ? [...activity.childUniqueIds]
          .sort((aId: ActivityUniqueId, bId: ActivityUniqueId): number => {
            const a = $activitiesMap[aId];
            const b = $activitiesMap[bId];

            if (a && b) {
              return sortActivities(a, b);
            }

            return 0;
          })
          .reduce((childActivityPoints, childUniqueId: ActivityUniqueId) => {
            const childActivity = $activitiesMap[childUniqueId];

            if (childActivity) {
              const childActivityPoint = activityToPoint(childActivity);
              childActivityPoints.push(childActivityPoint);
            }

            return childActivityPoints;
          }, [])
      : [];

    let activityLabelText = activity.name;

    if (activity.parent_id !== null) {
      activityLabelText = activity.type;
    }

    if (activity.unfinished) {
      activityLabelText = `${activityLabelText} (Unfinished)`;
    }

    const point: ActivityPoint = {
      children,
      duration: getDurationInMs(activity.duration),
      id: activity.id,
      label: {
        color: activity.unfinished ? '#ff7760' : null,
        text: activityLabelText,
      },
      name: activity.name,
      parentUniqueId: activity.parentUniqueId,
      parent_id: activity.parent_id,
      type: 'activity',
      unfinished: activity.unfinished,
      uniqueId: activity.uniqueId,
      x: getUnixEpochTime(activity.start_time_doy),
    };

    return point;
  }

  /**
   * Transforms activities to activity points for rendering.
   * Sorts activities in start time ascending order.
   */
  function activitiesToPoints(activities: Activity[]): ActivityPoint[] {
    return [...activities].sort(sortActivities).map(activity => activityToPoint(activity));
  }

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
      const start_time_doy = getDoyTime(new Date(unixEpochTime));
      if (unixEpochTime !== dragPoint.x) {
        $activitiesMap[dragPoint.uniqueId].start_time_doy = start_time_doy;
        draw();
      }
    }
  }

  function dragActivityEnd(offsetX: number): void {
    if (dragOffsetX && dragPoint) {
      const x = offsetX - dragOffsetX;
      const unixEpochTime = xScaleView.invert(x).getTime();
      const start_time_doy = getDoyTime(new Date(unixEpochTime));
      const dragActivity = $activitiesMap[dragPoint.uniqueId];
      if (unixEpochTime !== dragPoint.x) {
        const { activityId, planId } = decomposeActivityDirectiveId(dragActivity.uniqueId);
        effects.updateActivityDirective(planId, activityId, { start_time_doy });
      }
      dragOffsetX = null;
      dragPoint = null;
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
    if (isDeleteEvent(event) && !!selectedActivityId) {
      dispatch('delete', selectedActivityId);
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

  function onFocus(e: FocusEvent | undefined) {
    if (e) {
      document.addEventListener('keydown', onKeyDown);
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

      const activityPoints: ActivityPoint[] = activitiesToPoints(activities);
      const boundingBoxes: BoundingBox[] = [];

      for (const point of activityPoints) {
        const isParentActivity = !point.parent_id;

        if (isParentActivity && point.x + point.duration >= viewTimeRange.start && point.x <= viewTimeRange.end) {
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

    if (selectedActivityId === uniqueId) {
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
