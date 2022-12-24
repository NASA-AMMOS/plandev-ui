import { bisector, tickStep } from 'd3-array';
import type { Quadtree, QuadtreeLeaf } from 'd3-quadtree';
import { scaleLinear, scaleTime, type ScaleLinear, type ScaleTime } from 'd3-scale';
import {
  timeHour,
  timeInterval,
  timeMillisecond,
  timeMinute,
  timeMonth,
  timeSecond,
  timeWeek,
  timeYear,
  type CountableTimeInterval,
  type TimeInterval,
} from 'd3-time';
import type { Resource } from '../types/simulation';
import type { Axis, HorizontalGuide, Layer, QuadtreePoint, QuadtreeRect, Row, VerticalGuide } from '../types/timeline';

export enum TimelineLockStatus {
  Locked = 'Locked',
  Unlocked = 'Unlocked',
  TemporaryUnlock = 'TemporaryUnlock',
}

// From https://github.com/d3/d3-time/blob/main/src/duration.js
export const durationSecond: number = 1000;
export const durationMinute: number = durationSecond * 60;
export const durationHour: number = durationMinute * 60;
export const durationDay: number = durationHour * 24;
export const durationWeek: number = durationDay * 7;
export const durationMonth: number = durationDay * 30;
export const durationYear: number = durationDay * 365;

// Use a custom D3 time day to force equidistant time intervals
// for days as opposed to D3's non-uniform intervals that can end early
// on months or years
// See https://github.com/d3/d3-scale/issues/245
// And https://observablehq.com/d/906f777c9f2f0701
export const customD3TimeDay: CountableTimeInterval = timeInterval(
  date => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) => (end.getTime() - start.getTime()) / durationDay,
  date => Math.floor(date.getTime() / durationDay),
);

// TODO may need custom hour, week, month?
// From https://github.com/d3/d3-time/blob/main/src/ticks.js
export const customD3TickIntervals: [CountableTimeInterval, number, number][] = [
  [timeSecond, 1, durationSecond],
  [timeSecond, 5, 5 * durationSecond],
  [timeSecond, 15, 15 * durationSecond],
  [timeSecond, 30, 30 * durationSecond],
  [timeMinute, 1, durationMinute],
  [timeMinute, 5, 5 * durationMinute],
  [timeMinute, 15, 15 * durationMinute],
  [timeMinute, 30, 30 * durationMinute],
  [timeHour, 1, durationHour],
  [timeHour, 3, 3 * durationHour],
  [timeHour, 6, 6 * durationHour],
  [timeHour, 12, 12 * durationHour],
  [customD3TimeDay, 1, durationDay],
  [customD3TimeDay, 2, 2 * durationDay],
  [timeWeek, 1, durationWeek],
  [timeMonth, 1, durationMonth],
  [timeMonth, 3, 3 * durationMonth],
  [timeYear, 1, durationYear],
];

// Based on https://github.com/d3/d3-time/blob/main/src/ticks.js
export function customD3TickInterval(start: Date, stop: Date, count: number): TimeInterval {
  // Note: Coerce dates to numbers for arithmetic to make TS happy
  const target: number = Math.abs(+stop - +start) / count;
  const i = bisector(([, , step]) => step).right(customD3TickIntervals, target);
  if (i === customD3TickIntervals.length) {
    return timeYear.every(tickStep(+start / durationYear, +stop / durationYear, count));
  }
  if (i === 0) {
    return timeMillisecond.every(Math.max(tickStep(+start, +stop, count), 1));
  }
  const [t, step] =
    customD3TickIntervals[target / customD3TickIntervals[i - 1][2] < customD3TickIntervals[i][2] / target ? i - 1 : i];
  return t.every(step);
}

// Based on https://github.com/d3/d3-time/blob/main/src/ticks.js
export function customD3Ticks(start: Date, stop: Date, count: number) {
  const reverse = stop < start;
  if (reverse) {
    [start, stop] = [stop, start];
  }
  const interval = customD3TickInterval(start, stop, count);
  // Make end date inclusive by creating a new date +1ms from stop date
  const ticks = interval ? interval.range(start, new Date(+stop + 1)) : []; // inclusive stop
  return reverse ? ticks.reverse() : ticks;
}

export const CANVAS_PADDING_X = 0;
export const CANVAS_PADDING_Y = 8;

/**
 * The max canvas size (width or height) in pixels.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
 * @todo Determine size for each user agent?
 */
export const MAX_CANVAS_SIZE = 32767;

export function getXScale(domain: Date[], width: number): ScaleTime<number, number, never> {
  return scaleTime()
    .domain(domain)
    .range([CANVAS_PADDING_X, width - CANVAS_PADDING_X]);
}

export function getYScale(domain: number[], height: number): ScaleLinear<number, number> {
  return scaleLinear()
    .domain(domain)
    .range([height - CANVAS_PADDING_Y, CANVAS_PADDING_Y]);
}

/**
 * Search a quadtree of 2D points for overlap with a rectangle specified by
 * xMin, yMin, xMax, yMax.
 * Return overlapping array with data T given by a map.
 */
export function searchQuadtreePoint<T>(
  quadtree: Quadtree<QuadtreePoint> | undefined,
  x: number,
  y: number,
  extent: number,
  map: Record<number, T>,
): T[] {
  const points: T[] = [];
  if (quadtree) {
    const xMin = x - extent;
    const yMin = y - extent;
    const xMax = x + extent;
    const yMax = y + extent;
    quadtree.visit((node: QuadtreeLeaf<QuadtreePoint>, x0, y0, x1, y1) => {
      if (!node.length) {
        do {
          const { data: p } = node;
          if (p.x >= xMin && p.x < xMax && p.y >= yMin && p.y < yMax) {
            points.push(map[p.id]);
          }
        } while ((node = node.next));
      }
      return x0 >= xMax || y0 >= yMax || x1 < xMin || y1 < yMin;
    });
  }
  return points;
}

/**
 * Search a quadtree of 2D rects for overlap with a point specified by x and y.
 * Return overlapping array with data T given by a map.
 */
export function searchQuadtreeRect<T>(
  quadtree: Quadtree<QuadtreeRect> | undefined,
  x: number,
  y: number,
  maxH: number,
  maxW: number,
  map: Record<number, T>,
): T[] {
  const points: T[] = [];

  if (quadtree) {
    quadtree.visit((node: QuadtreeLeaf<QuadtreeRect>, x0, y0, x1, y1) => {
      if (!node.length) {
        do {
          const { data: p } = node;
          if (p.x + p.width >= x && p.x < x && p.y + p.height >= y && p.y < y) {
            points.push(map[p.id]);
          }
        } while ((node = node.next));
      }
      return x0 - maxW >= x || y0 - maxH >= y || x1 + maxW < x || y1 + maxH < y;
    });
  }

  return points;
}

/**
 * Returns a new vertical guide
 */
export function createVerticalGuide(doyTimestamp: string, verticalGuides: VerticalGuide[]): VerticalGuide {
  const id = getNextID(verticalGuides);
  const defaultLabel = `Guide ${id}`;

  return {
    id,
    label: { color: '#969696', text: defaultLabel },
    timestamp: doyTimestamp,
  };
}

/**
 * Returns a new horizontal guide
 */
export function createHorizontalGuide(yAxes: Axis[], horizontalGuides: HorizontalGuide[]): HorizontalGuide {
  const id = getNextID(horizontalGuides);
  const defaultLabel = `Guide ${id}`;

  // Default the y value to the middle of the scale domain
  const firstAxis = yAxes.length > 0 ? yAxes[0] : 0;
  let yAxisId = 0;
  let y = 0;
  if (firstAxis) {
    yAxisId = firstAxis.id;
    if (firstAxis.scaleDomain.length === 2) {
      // Default y value to the middle of the domain
      y = (firstAxis.scaleDomain[1] + firstAxis.scaleDomain[0]) / 2;
    }
  }

  return {
    id,
    label: { color: '#969696', text: defaultLabel },
    y,
    yAxisId,
  };
}

/**
 * Returns a new row
 */
export function createRow(rows: Row[]): Row {
  const id = getNextID(rows);

  return {
    autoAdjustHeight: true,
    expanded: true,
    height: 200,
    horizontalGuides: [],
    id,
    layers: [],
    name: 'Row',
    yAxes: [],
  };
}

/**
 * Returns a new y axis
 */
export function createYAxis(yAxes: Axis[]): Axis {
  const id = getNextID(yAxes);

  return {
    color: '',
    id,
    label: { text: 'Label' },

    // TODO is there a sensible default for this since there are
    // no associated layers for a new y axis?
    scaleDomain: [0, 1],
    tickCount: 4,
  };
}

/**
 * Returns a new layer
 */
export function createTimelineLayer(layers: Layer[], yAxes: Axis[]): Layer {
  const id = getNextID(layers);
  const yAxisId = yAxes.length > 0 ? yAxes[0].id : 0;

  return {
    chartType: 'activity',
    filter: {},
    id,
    yAxisId,
  };
}

/**
 * Returns the max bounds of the resources associated with an axis
 */
export function getYAxisBounds(
  yAxis: Axis,
  layers: Layer[],
  resourcesByViewLayerId: Record<number, Resource[]>,
): number[] {
  // Find all layers that are associated with this y axis
  const yAxisLayers = layers.filter(layer => layer.yAxisId === yAxis.id);

  // Find min and max of associated layers
  let minY = undefined;
  let maxY = undefined;
  yAxisLayers.forEach(layer => {
    if (resourcesByViewLayerId[layer.id]) {
      resourcesByViewLayerId[layer.id].forEach(resource => {
        resource.values.forEach(value => {
          if (minY === undefined || value.y < minY) {
            minY = value.y;
          }
          if (maxY === undefined || value.y > maxY) {
            maxY = value.y;
          }
        });
      });
    }
  });

  const scaleDomain = [...yAxis.scaleDomain];
  if (minY !== undefined) {
    scaleDomain[0] = minY;
  }
  if (maxY !== undefined) {
    scaleDomain[1] = maxY;
  }

  return scaleDomain;
}

/**
 * Returns the next available ID given an array of objects with ID keys
 */
export function getNextID(objects: { id: number }[]): number {
  return objects.reduce((prev, curr) => {
    if (curr.id >= prev) {
      return curr.id + 1;
    }
    return prev;
  }, 0);
}
