import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import type { Quadtree, QuadtreeLeaf } from 'd3-quadtree';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import { scaleLinear } from 'd3-scale';
import type {
  ConstraintViolation,
  QuadtreePoint,
  QuadtreeRect,
  StringTMap,
  TimeRange,
} from '../types';

/**
 * Clamp width to 1 if it is 0 or less.
 */
export function clampWidth(width: number): number {
  const floorWidth = Math.floor(width);
  return floorWidth > 0 ? floorWidth : 1;
}

/**
 * Make sure the window is between the current view time range
 * so we don't draw out of bounds.
 */
export function clampWindow(
  window: TimeRange,
  viewTimeRange: TimeRange,
): TimeRange {
  let start = window.start;
  let end = window.end;

  if (start < viewTimeRange.start) {
    start = viewTimeRange.start;
  }

  if (end > viewTimeRange.end) {
    end = viewTimeRange.end;
  }

  return { end, start };
}

export function getConstraintViolationsWithinTime(
  constraintViolations: ConstraintViolation[] = [],
  unixEpochTime: number,
): ConstraintViolation[] {
  const violations = [];

  for (const constraintViolation of constraintViolations) {
    const { windows } = constraintViolation;
    let count = 0;

    for (const window of windows) {
      const { start, end } = window;
      if (start <= unixEpochTime && unixEpochTime <= end) {
        ++count;
      }
    }

    if (count > 0) {
      violations.push(constraintViolation);
    }
  }

  return violations;
}

export function getTimeFromSvgMousePosition(
  el: SVGElement | SVGGElement,
  event: MouseEvent | DragEvent,
  scale: ScaleTime<number, number>,
  offsetX: number = 0,
): { doyTimestamp: string; unixEpochTime: number } {
  const rect = el.getBoundingClientRect();
  const position = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  const x = position.x - offsetX;
  const unixEpochTime = scale.invert(x).getTime();
  const doyTimestamp = getDoyTimestamp(unixEpochTime);
  return { doyTimestamp, unixEpochTime };
}

/**
 * @note We add a step to the min and max of the domain so points
 * at the min or max are not clipped against the canvas top and bottom borders.
 */
export function getYScale(
  domain: number[],
  drawHeight: number,
): ScaleLinear<number, number> {
  const scale = scaleLinear().domain(domain);
  const [t0, t1] = scale.ticks();
  const step = Math.abs(t1 - t0);
  const [min, max] = domain;
  return scaleLinear()
    .domain([min - step, max + step])
    .range([drawHeight, 0]);
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
  map: StringTMap<T>,
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
  map: StringTMap<T>,
): { points: T[]; pointsById: StringTMap<T> } {
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

  return {
    points,
    pointsById: points.reduce(
      (pointsById: StringTMap<T>, point: T & { id: string }) => {
        pointsById[point.id] = point;
        return map;
      },
      {},
    ),
  };
}

/**
 * Resolves after a timeout. Useful for Canvas draw operations that need
 * to resolve DOM changes (height/width/etc...) before drawing.
 */
export function tick(): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(() => resolve(true));
  });
}
