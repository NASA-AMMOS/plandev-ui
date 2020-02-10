import { TimeRange } from '../types';

export function changeZoom(viewTimeRange: TimeRange, delta: number): TimeRange {
  const { end, start } = viewTimeRange;
  const range = end - start;
  const zoomAmount = range / delta;

  return {
    end: end - zoomAmount,
    start: start + zoomAmount,
  };
}
