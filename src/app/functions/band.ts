import * as d3 from 'd3';
import { Point, StringTMap, TimeRange } from '../types';

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
      const colorKey = `rgb(${data[0]},${data[1]},${data[2]})`;
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
