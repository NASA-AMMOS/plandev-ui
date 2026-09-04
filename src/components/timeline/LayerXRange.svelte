<svelte:options immutable={true} />

<script lang="ts">
  import { quadtree as d3Quadtree, type Quadtree } from 'd3-quadtree';
  import { type ScaleTime } from 'd3-scale';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { Resource } from '../../types/simulation';
  import type {
    MouseOver,
    QuadtreeRect,
    ResourceLayerFilter,
    RowMouseOverEvent,
    XRangeLabelVisibility,
    XRangeLayerColorScheme,
    XRangePoint,
    XRangeValueAppearance,
  } from '../../types/timeline';
  import { clamp } from '../../utilities/generic';
  import {
    DEFAULT_XRANGE_LABEL_VISIBILITY,
    getXRangeColorScale,
    getXRangeValueDomain,
    searchQuadtreeRect,
  } from '../../utilities/timeline';

  export let contextmenu: MouseEvent | undefined;
  export let colorScheme: XRangeLayerColorScheme = 'schemeAccent';
  export let dpr: number = 1;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let filter: ResourceLayerFilter | undefined;
  export let id: number;
  export let labelVisibility: XRangeLabelVisibility | undefined = undefined;
  export let mousemove: MouseEvent | undefined;
  export let mouseout: MouseEvent | undefined;
  export let opacity: number = 0.8;
  export let resources: Resource[] = [];
  export let valueAppearance: Record<string, XRangeValueAppearance> | undefined = undefined;
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher<{
    contextMenu: MouseOver;
    mouseOver: RowMouseOverEvent;
    updateValueDomain: { domain: string[]; resourceName: string };
  }>();
  const textMeasurementCache: Record<string, { textHeight: number; textWidth: number }> = {};
  // TODO maybe dynamically compute this number by looking at how much work there is to do for
  // all layers and dividing the time between them all?
  // TODO consider moving to GPU and/or offscreen canvas but would need to consider how to efficiently
  // transfer these points to a web worker
  const WORK_TIME_THRESHOLD = 16; // ms to allow for processing time, beyond which remaining work will be split to a new frame

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let domain: string[] = [];
  let maxXWidth: number;
  let mounted: boolean = false;
  let points: XRangePoint[] = [];
  let drawPointsRequest: number;
  let quadtree: Quadtree<QuadtreeRect>;
  let visiblePointsById: Record<number, XRangePoint> = {};

  $: canvasHeightDpr = drawHeight * dpr;
  $: canvasWidthDpr = drawWidth * dpr;
  // Normalized here rather than defaulted on the prop: Row spreads a whole layer in, so a layer saved
  // before this option existed arrives with the key explicitly undefined, which a prop default does
  // not cover -- and an undefined value would fail the draw guard below and leave the layer blank.
  $: appearances = valueAppearance ?? {};
  $: showLabels = (labelVisibility ?? DEFAULT_XRANGE_LABEL_VISIBILITY) !== 'off';
  $: if (
    canvasHeightDpr &&
    canvasWidthDpr &&
    drawHeight &&
    drawWidth &&
    dpr &&
    colorScheme &&
    filter &&
    mounted &&
    appearances &&
    showLabels !== undefined &&
    opacity !== undefined &&
    points &&
    xScaleView
  ) {
    draw();
  }
  $: onContextMenu(contextmenu);
  $: onMousemove(mousemove);
  $: onMouseout(mouseout);
  $: points = resourcesToXRangePoints(resources);
  // Reported up so the layer settings form can offer the values a free-form resource actually holds,
  // which nothing but the data knows. Fires when the sampled resource changes, not per frame.
  $: if (domain.length && resources.length) {
    dispatch('updateValueDomain', { domain, resourceName: resources[0].name });
  }

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
    mounted = true;
  });

  async function draw(): Promise<void> {
    if (ctx && xScaleView) {
      window.cancelAnimationFrame(drawPointsRequest);
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
      drawPoints(points, 0);
    }
  }

  function drawPoints(points: XRangePoint[], pointsStartIndex = 0) {
    if (!xScaleView) {
      return;
    }
    const startTime = performance.now();

    const colorScale = getXRangeColorScale(colorScheme, domain);

    const [viewStart, viewEnd] = xScaleView.domain().map(x => x.getTime());

    for (let i = pointsStartIndex; i < points.length; ++i) {
      if (performance.now() - startTime > WORK_TIME_THRESHOLD) {
        drawPointsRequest = window.requestAnimationFrame(() => drawPoints(points, i));
        return;
      }

      const point = points[i];
      if (point.is_gap || point.is_null) {
        continue;
      }

      const { value = '' } = point;

      // Scan to the next point holding a different value than the current point, so a run of
      // consecutive samples at the same value becomes one box. Keyed on the value rather than the
      // drawn text: two distinct values must stay two boxes even where they display identically.
      let j = i + 1;
      let nextPoint = points[j];
      while (nextPoint && nextPoint.value === value && nextPoint.is_gap === point.is_gap) {
        j = j + 1;
        nextPoint = points[j];
      }
      i = j - 1; // Minus since the loop auto increments i at the end of the block.

      // After the scan, so a hidden value costs one iteration per run rather than one per sample. No
      // box, no label, and no quadtree entry: hidden means the operator gets the row's space back,
      // and a hover target over blank canvas would take that back.
      const appearance = appearances[value];
      if (appearance?.hidden) {
        continue;
      }

      const startMs = point.x;
      const endMs = nextPoint ? nextPoint.x : points[i].x;

      // Do not draw if box is out of view
      if (startMs > viewEnd || endMs < viewStart) {
        continue;
      }

      const xStart = clamp(xScaleView(point.x), 0, drawWidth);
      const xEnd = clamp(xScaleView(endMs), 0, drawWidth);

      const xWidth = xEnd - xStart;
      const y = 0;

      if (xWidth > 0 && ctx) {
        const { id } = point;
        visiblePointsById[id] = point;

        // Both fall back on an empty string as well as on no entry, so clearing either field in the
        // form returns the value to its default rather than painting an invalid fillStyle or blanking
        // the box's text.
        const labelText = appearance?.label || point.label.text;
        ctx.fillStyle = appearance?.color || colorScale(value);
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

        if (!showLabels) {
          continue;
        }

        const { textHeight, textWidth } = setLabelContext(point, labelText);
        if (textWidth < xWidth) {
          ctx.fillText(labelText, xStart + xWidth / 2 - textWidth / 2, drawHeight / 2 + textHeight / 2, textWidth);
        } else {
          const extraLabelPadding = 8;
          let newLabelText = labelText;
          let newTextWidth = textWidth;

          // Remove characters from label until it is small enough to fit in x-range point.
          while (newTextWidth > 0 && newTextWidth > xWidth - extraLabelPadding) {
            newLabelText = newLabelText.slice(0, -1);
            const textMeasurement = measureText(newLabelText);
            newTextWidth = textMeasurement.textWidth;
          }

          // Only draw if text will be visible
          if (newTextWidth > 0) {
            ctx.fillText(
              `${newLabelText}...`,
              xStart + xWidth / 2 - newTextWidth / 2,
              drawHeight / 2 + textHeight / 2,
              newTextWidth,
            );
          }
        }
      }
    }
  }

  function measureText(text: string) {
    if (textMeasurementCache[text]) {
      return textMeasurementCache[text];
    }
    if (ctx) {
      const textMetrics = ctx.measureText(text);
      const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
      const textWidth = textMetrics.width;
      const measurement = { textHeight, textWidth };
      textMeasurementCache[text] = measurement;
      return measurement;
    }
    const measurement = { textHeight: 0, textWidth: 0 };
    return measurement;
  }

  function onContextMenu(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('contextMenu', { e, origin: 'layer-x-range' });
    }
  }

  function onMousemove(e: MouseEvent | undefined): void {
    if (e) {
      const { offsetX: x, offsetY: y } = e;
      const points = searchQuadtreeRect<XRangePoint>(quadtree, x, y, drawHeight, maxXWidth, visiblePointsById);

      dispatch('mouseOver', { e, layerId: id, points });
    }
  }

  function onMouseout(e: MouseEvent | undefined): void {
    if (e) {
      dispatch('mouseOver', { e, layerId: id, points: [] });
    }
  }

  function resourcesToXRangePoints(resources: Resource[]): XRangePoint[] {
    const points: XRangePoint[] = [];
    let id = 0;

    for (const resource of resources) {
      const { name, schema, values } = resource;

      if (schema.type === 'boolean') {
        domain = getXRangeValueDomain(schema) ?? [];
        for (let i = 0; i < values.length; ++i) {
          const { x, y, is_gap } = values[i];
          const text = y ? 'TRUE' : 'FALSE';
          points.push({
            id: id++,
            is_gap,
            is_null: false,
            label: { text },
            name,
            type: 'x-range',
            value: text,
            x,
          });
        }
      } else if (schema.type === 'string') {
        const domainMap: Record<string, string> = {};
        for (let i = 0; i < values.length; ++i) {
          const { x, y, is_gap } = values[i];
          const isNull = y === null;
          const text = isNull ? '' : (y as string);
          points.push({
            id: id++,
            is_gap,
            is_null: isNull,
            label: { text },
            name,
            type: 'x-range',
            value: text,
            x,
          });
          if (!isNull) {
            domainMap[text] = text;
          }
        }
        domain = Object.values(domainMap);
      } else if (schema.type === 'variant') {
        domain = getXRangeValueDomain(schema) ?? [];
        for (let i = 0; i < values.length; ++i) {
          const { x, y, is_gap } = values[i];
          const isNull = y === null;
          const text = isNull ? '' : (y as string);
          points.push({
            id: id++,
            is_gap,
            is_null: isNull,
            label: { text },
            name,
            type: 'x-range',
            value: text,
            x,
          });
        }
      }
    }

    return points;
  }

  /**
   * Sets the canvas text style for a point's label and measures the text about to be drawn.
   *
   * Takes the text rather than reading `point.label.text`, because a value can be relabelled and it is
   * the drawn string that has to be measured -- measuring the original would truncate an override to
   * the wrong width, or refuse to draw a short one inside a box it fits perfectly well.
   */
  function setLabelContext(
    point: XRangePoint,
    labelText: string,
  ): {
    textHeight: number;
    textWidth: number;
  } {
    const fontSize = point.label?.fontSize || 10;
    const fontFace = point.label?.fontFace || 'Inter';
    if (ctx) {
      ctx.fillStyle = point.label?.color || '#000000';
      ctx.font = `${fontSize}px ${fontFace}`;
    }
    const { textHeight, textWidth } = measureText(labelText);
    return { textHeight, textWidth };
  }
</script>

<canvas
  bind:this={canvas}
  height={canvasHeightDpr}
  id={`layer-x-range-${id}`}
  style="height: {drawHeight}px; width: {drawWidth}px;"
  width={canvasWidthDpr}
  on:contextmenu={onContextMenu}
/>

<style>
  canvas {
    position: absolute;
    z-index: -1;
  }
</style>
