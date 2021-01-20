import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import { scaleLinear } from 'd3-scale';
import { ConstraintViolation, TimeRange } from '../types';

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
 * Resolves after a timeout. Useful for Canvas draw operations that need
 * to resolve DOM changes (height/width/etc...) before drawing.
 */
export function tick(): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(() => resolve(true));
  });
}
