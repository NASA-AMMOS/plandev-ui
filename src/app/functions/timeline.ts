import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import type { ScaleLinear, ScaleTime } from 'd3-scale';
import { scaleLinear } from 'd3-scale';

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
