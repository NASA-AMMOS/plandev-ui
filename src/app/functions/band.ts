import * as d3 from 'd3';
import { Point, StringTMap, TimeRange } from '../types';
import { getDoyTimestamp } from './time';

export function forEachCanvas(
  canvases: HTMLCanvasElement[],
  f: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void,
) {
  for (let i = 0, l = canvases.length; i < l; ++i) {
    const canvas = canvases[i];

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        f(canvas, ctx);
      } else {
        console.warn('forEachCanvas: no canvas context: ', canvas);
      }
    }
  }
}

export function getDoyTimestampFromSvgMousePosition(
  el: SVGElement | SVGGElement,
  event: MouseEvent | DragEvent,
  scale: d3.ScaleTime<number, number>,
): string {
  const { x } = getSvgMousePosition(el, event);
  const unixEpochTime = scale.invert(x).getTime();
  const doyTimestamp = getDoyTimestamp(unixEpochTime);
  return doyTimestamp;
}

export function getPointFromCanvasSelection(
  event: MouseEvent,
  hiddenCanvas: HTMLCanvasElement | undefined,
  hiddenCanvasColorToPoint: StringTMap<Point> | undefined,
): Point | null {
  const { offsetX, offsetY } = event;

  if (hiddenCanvas) {
    const hiddenCanvasContext = hiddenCanvas.getContext('2d');

    if (hiddenCanvasContext && hiddenCanvasColorToPoint) {
      const { data } = hiddenCanvasContext.getImageData(offsetX, offsetY, 1, 1);
      const [r, g, b] = data;
      const colorKey = `rgb(${r},${g},${b})`;
      return hiddenCanvasColorToPoint[colorKey] || null;
    }
  } else {
    console.warn(
      'getPointFromCanvasSelection: no hiddenCanvas: ',
      hiddenCanvas,
    );
  }

  return null;
}

export function getSvgMousePosition(
  svg: SVGElement | SVGGElement,
  event: MouseEvent | DragEvent,
) {
  const rect = svg.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y };
}

export function getXScale(
  timeRange: TimeRange = { end: 0, start: 0 },
  drawWidth: number,
): d3.ScaleTime<number, number> {
  return d3
    .scaleTime()
    .domain([new Date(timeRange.start), new Date(timeRange.end)])
    .range([0, drawWidth]);
}

/**
 * @note We add a step to the min and max of the domain so points
 * at the min or max are not clipped against the canvas top and bottom borders.
 */
export function getYScale(
  domain: number[],
  drawHeight: number,
): d3.ScaleLinear<number, number> {
  const scale = d3.scaleLinear().domain(domain);
  const [t0, t1] = scale.ticks();
  const step = Math.abs(t1 - t0);
  const [min, max] = domain;
  return d3
    .scaleLinear()
    .domain([min - step, max + step])
    .range([drawHeight, 0]);
}

/**
 * Color generator that generates colors in the form `rgb(R, G, B)` starting at 1.
 * Each subsequent call to `next()` will produce a different RGB color incremented by `nextColorStep`.
 *
 * The increment by 61 to `nextColor` is interesting. The 61 is arbitrary.
 * This creates "color gap" where subsequent colors are not right next to each other numerically in the map.
 * If we increment by just 1, then `getImageData` can generate color collisions because canvas
 * draws slightly different colors than the given fillStyle at a rounded shapes boundary, which is due to anti-aliasing.
 *
 * Make sure `nextColorStep` is not a power of 2. If it is a power of 2 you can get RGB triples that are too close
 * to each-other.
 *
 * @see https://observablehq.com/@camargo/canvas-picking-with-a-hidden-canvas
 */
export function* rgbColorGenerator(): IterableIterator<string> {
  let nextColor = 1;
  const nextColorStep = 61;

  while (nextColor < 16777216) {
    const rgb = [];

    rgb.push(nextColor & 0xff); // R.
    rgb.push((nextColor & 0xff00) >> 8); // G.
    rgb.push((nextColor & 0xff0000) >> 16); // B.

    nextColor += nextColorStep;
    yield `rgb(${rgb.join(',')})`;
  }
}
