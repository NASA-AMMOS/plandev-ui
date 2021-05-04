import type { Quadtree, QuadtreeLeaf } from 'd3-quadtree';
import { ScaleLinear, scaleLinear, scaleTime, ScaleTime } from 'd3-scale';
import { CANVAS_PADDING } from '../constants';
import type { QuadtreePoint, QuadtreeRect, StringTMap } from '../types';

export function getXScale(
  domain: [Date, Date],
  width: number,
): ScaleTime<number, number, never> {
  return scaleTime()
    .domain(domain)
    .range([CANVAS_PADDING, width - CANVAS_PADDING]);
}

export function getYScale(
  domain: number[],
  height: number,
): ScaleLinear<number, number> {
  return scaleLinear()
    .domain(domain)
    .range([height - CANVAS_PADDING, CANVAS_PADDING]);
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
