import type { Quadtree, QuadtreeLeaf } from 'd3-quadtree';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import { scaleLinear, scaleTime } from 'd3-scale';
import type { QuadtreePoint, QuadtreeRect } from '../types';

export const CANVAS_PADDING_X = 0;
export const CANVAS_PADDING_Y = 8;

/**
 * The max canvas size (width or height) in pixels.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
 * @todo Determine size for each user agent?
 */
export const MAX_CANVAS_SIZE = 32767;

export function getXScale(
  domain: Date[],
  width: number,
): ScaleTime<number, number, never> {
  return scaleTime()
    .domain(domain)
    .range([CANVAS_PADDING_X, width - CANVAS_PADDING_X]);
}

export function getYScale(
  domain: number[],
  height: number,
): ScaleLinear<number, number> {
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
