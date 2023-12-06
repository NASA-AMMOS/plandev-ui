import { bisector, tickStep } from 'd3-array';
import type { Quadtree, QuadtreeInternalNode, QuadtreeLeaf } from 'd3-quadtree';
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
import type { Resource, ResourceValue } from '../types/simulation';
import type {
  ActivityLayer,
  Axis,
  HorizontalGuide,
  Layer,
  LineLayer,
  QuadtreePoint,
  QuadtreeRect,
  Row,
  TimeRange,
  Timeline,
  VerticalGuide,
  XRangeLayer,
} from '../types/timeline';
import { filterEmpty } from './generic';

export enum TimelineLockStatus {
  Locked = 'Locked',
  Unlocked = 'Unlocked',
}

export enum TimelineInteractionMode {
  Interact = 'Interact',
  Navigate = 'Navigate',
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
  [timeSecond, 2, 2 * durationSecond],
  [timeSecond, 3, 3 * durationSecond],
  [timeSecond, 4, 4 * durationSecond],
  [timeSecond, 5, 5 * durationSecond],
  [timeSecond, 10, 10 * durationSecond],
  [timeSecond, 15, 15 * durationSecond],
  [timeSecond, 30, 30 * durationSecond],
  [timeMinute, 1, durationMinute],
  [timeMinute, 2, durationMinute],
  [timeMinute, 3, durationMinute],
  [timeMinute, 4, durationMinute],
  [timeMinute, 5, 5 * durationMinute],
  [timeMinute, 10, 10 * durationMinute],
  [timeMinute, 15, 15 * durationMinute],
  [timeMinute, 30, 30 * durationMinute],
  [timeHour, 1, durationHour],
  [timeHour, 2, 2 * durationHour],
  [timeHour, 3, 3 * durationHour],
  [timeHour, 4, 4 * durationHour],
  [timeHour, 5, 5 * durationHour],
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
export function customD3TickInterval(start: Date, stop: Date, count: number): TimeInterval | null {
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

export function getYScale(domain: (number | null)[], height: number): ScaleLinear<number, number> {
  return scaleLinear()
    .domain(domain.filter(filterEmpty))
    .range([height - CANVAS_PADDING_Y, CANVAS_PADDING_Y]);
}

function isQuadtreeLeaf<T>(node?: QuadtreeInternalNode<T> | QuadtreeLeaf<T>): node is QuadtreeLeaf<T> {
  if (node && node.length === undefined) {
    return true;
  }
  return false;
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
    quadtree.visit(
      (node: QuadtreeInternalNode<QuadtreePoint> | QuadtreeLeaf<QuadtreePoint> | undefined, x0, y0, x1, y1) => {
        if (isQuadtreeLeaf(node)) {
          do {
            const { data: p } = node;
            if (p.x >= xMin && p.x < xMax && p.y >= yMin && p.y < yMax) {
              points.push(map[p.id]);
            }
          } while ((node = node.next));
        }
        return x0 >= xMax || y0 >= yMax || x1 < xMin || y1 < yMin;
      },
    );
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
    quadtree.visit(
      (node: QuadtreeInternalNode<QuadtreeRect> | QuadtreeLeaf<QuadtreeRect> | undefined, x0, y0, x1, y1) => {
        if (isQuadtreeLeaf(node)) {
          do {
            const { data: p } = node;
            if (p.x + p.width >= x && p.x < x && p.y + p.height >= y && p.y < y) {
              points.push(map[p.id as number]);
            }
          } while ((node = node.next));
        }
        return x0 - maxW >= x || y0 - maxH >= y || x1 + maxW < x || y1 + maxH < y;
      },
    );
  }

  return points;
}

/**
 * Returns the next layer ID based on all layers in all timelines
 */
export function getNextLayerID(timelines: Timeline[]): number {
  let maxID = -1;
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      row.layers.forEach(layer => {
        if (layer.id > maxID) {
          maxID = layer.id;
        }
      });
    });
  });
  return maxID + 1;
}

/**
 * Returns the next horizontal guide ID based on all layers in all timelines
 */
export function getNextHorizontalGuideID(timelines: Timeline[]): number {
  let maxID = -1;
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      row.horizontalGuides.forEach(guide => {
        if (guide.id > maxID) {
          maxID = guide.id;
        }
      });
    });
  });
  return maxID + 1;
}

/**
 * Returns the next vertical guide ID based on all layers in all timelines
 */
export function getNextVerticalGuideID(timelines: Timeline[]): number {
  let maxID = -1;
  timelines.forEach(timeline => {
    timeline.verticalGuides.forEach(guide => {
      if (guide.id > maxID) {
        maxID = guide.id;
      }
    });
  });
  return maxID + 1;
}

/**
 * Returns the next row ID based on all layers in all timelines
 */
export function getNextRowID(timelines: Timeline[]): number {
  let maxID = -1;
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      if (row.id > maxID) {
        maxID = row.id;
      }
    });
  });
  return maxID + 1;
}

/**
 * Returns the next row ID based on all layers in all timelines
 */
export function getNextYAxisID(timelines: Timeline[]): number {
  let maxID = -1;
  timelines.forEach(timeline => {
    timeline.rows.forEach(row => {
      row.yAxes.forEach(axis => {
        if (axis.id > maxID) {
          maxID = axis.id;
        }
      });
    });
  });
  return maxID + 1;
}

/**
 * Returns the next row ID based on all layers in all timelines
 */
export function getNextTimelineID(timelines: Timeline[]): number {
  let maxID = -1;
  timelines.forEach(timeline => {
    if (timeline.id > maxID) {
      maxID = timeline.id;
    }
  });
  return maxID + 1;
}

/**
 * Returns a new vertical guide
 */
export function createVerticalGuide(
  timelines: Timeline[],
  doyTimestamp: string,
  args: Partial<VerticalGuide> = {},
): VerticalGuide {
  const id = getNextVerticalGuideID(timelines);
  const defaultLabel = `Guide ${id}`;

  return {
    id,
    label: { color: '#969696', text: defaultLabel },
    timestamp: doyTimestamp,
    ...args,
  };
}

/**
 * Returns a new horizontal guide
 */
export function createHorizontalGuide(
  timelines: Timeline[],
  yAxes: Axis[],
  args: Partial<HorizontalGuide> = {},
): HorizontalGuide {
  const id = getNextHorizontalGuideID(timelines);
  const defaultLabel = `Guide ${id}`;

  // Default the y value to the middle of the scale domain
  const firstAxis = yAxes.length > 0 ? yAxes[0] : 0;
  let yAxisId = 0;
  let y = 0;
  if (firstAxis) {
    yAxisId = firstAxis.id;
    if (!firstAxis.scaleDomain) {
      y = 0;
    } else {
      if (firstAxis.scaleDomain.length === 2) {
        if (firstAxis.scaleDomain[0] !== null && firstAxis.scaleDomain[1] !== null) {
          // Default y value to the middle of the domain
          y = (firstAxis.scaleDomain[1] + firstAxis.scaleDomain[0]) / 2;
        }
      }
    }
  }

  return {
    id,
    label: { color: '#969696', text: defaultLabel },
    y,
    yAxisId,
    ...args,
  };
}

/**
 * Returns a new row
 */
export function createRow(timelines: Timeline[], args: Partial<Row> = {}): Row {
  const id = getNextRowID(timelines);

  return {
    autoAdjustHeight: false,
    expanded: true,
    height: 160,
    horizontalGuides: [],
    id,
    layers: [],
    name: 'Row',
    yAxes: [],
    ...args,
  };
}

/**
 * Returns a new y axis
 */
export function createYAxis(timelines: Timeline[], args: Partial<Axis> = {}): Axis {
  const id = getNextYAxisID(timelines);

  return {
    color: '#1b1d1e',
    domainFitMode: 'fitTimeWindow',
    id,
    label: { text: `Y Axis (${id})` },
    renderTickLines: true,
    tickCount: 4,
    ...args,
  };
}

/**
 * Returns a new timeline
 */
export function createTimeline(timelines: Timeline[], args: Partial<Timeline> = {}): Timeline {
  const id = getNextTimelineID(timelines);

  return {
    id,
    marginLeft: 0,
    marginRight: 0,
    rows: [],
    verticalGuides: [],
    ...args,
  };
}

/**
 * Returns a new activity layer
 */
export function createTimelineActivityLayer(timelines: Timeline[], args: Partial<ActivityLayer> = {}): ActivityLayer {
  const id = getNextLayerID(timelines);

  return {
    activityColor: '#fcdd8f',
    activityHeight: 16,
    chartType: 'activity',
    filter: {
      activity: {
        types: [],
      },
    },
    id,
    name: '',
    yAxisId: null,
    ...args,
  };
}

/**
 * Returns a new line layer. Note that the yAxes should be those from the row the layer will be a member of.
 */
export function createTimelineLineLayer(
  timelines: Timeline[],
  yAxes: Axis[],
  args: Partial<LineLayer> = {},
): LineLayer {
  const id = getNextLayerID(timelines);
  const yAxisId = yAxes.length > 0 ? yAxes[0].id : 0;

  return {
    chartType: 'line',
    filter: {
      resource: {
        names: [],
      },
    },
    id,
    lineColor: '#283593',
    lineWidth: 1,
    name: '',
    pointRadius: 2,
    yAxisId,
    ...args,
  };
}

/**
 * Returns a new x-range layer. Note that the yAxes should be those from the row the layer will be a member of.
 */
export function createTimelineXRangeLayer(
  timelines: Timeline[],
  yAxes: Axis[],
  args: Partial<XRangeLayer> = {},
): XRangeLayer {
  const id = getNextLayerID(timelines);
  const yAxisId = yAxes.length > 0 ? yAxes[0].id : 0;

  return {
    chartType: 'x-range',
    colorScheme: 'schemeTableau10',
    filter: {
      resource: {
        names: [],
      },
    },
    id,
    name: '',
    opacity: 0.8,
    yAxisId,
    ...args,
  };
}

/**
 * Returns the max bounds of the resources associated with an axis
 */
export function getYAxisBounds(
  yAxis: Axis,
  layers: Layer[],
  resourcesByViewLayerId: Record<number, Resource[]>,
  viewTimeRange?: TimeRange,
): number[] {
  // Find all layers that are associated with this y axis
  const yAxisLayers = layers.filter(layer => layer.yAxisId === yAxis.id);

  // Find min and max of associated layers
  let minY: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  yAxisLayers.forEach(layer => {
    if (resourcesByViewLayerId[layer.id]) {
      resourcesByViewLayerId[layer.id].forEach(resource => {
        let leftValue: ResourceValue | undefined;
        let rightValue: ResourceValue | undefined;
        resource.values.forEach(value => {
          const isNumber = typeof value.y === 'number';
          // Identify the first value to the left of the viewTimeRange
          if (viewTimeRange && value.x < viewTimeRange.start) {
            if (value.is_gap) {
              leftValue = undefined;
            } else {
              if (isNumber) {
                if (!leftValue) {
                  leftValue = value;
                } else if (value.x >= leftValue.x) {
                  leftValue = value;
                }
              }
            }
          }
          // Identify the first value to the right of the viewTimeRange
          if (viewTimeRange && value.x > viewTimeRange.start) {
            if (value.is_gap) {
              rightValue = undefined;
            } else {
              if (isNumber) {
                if (!rightValue) {
                  rightValue = value;
                } else if (value.x < rightValue.x) {
                  rightValue = value;
                }
              }
            }
          }
          // Consider a value for min and max if it is a number and it falls within the time range or
          // no time range is supplied or the domain fit mode is not fitTimeWindow
          if (
            typeof value.y === 'number' &&
            (!viewTimeRange ||
              yAxis.domainFitMode !== 'fitTimeWindow' ||
              (value.x >= viewTimeRange.start && value.x <= viewTimeRange.end))
          ) {
            if (minY === undefined || value.y < minY) {
              minY = value.y;
            }
            if (maxY === undefined || value.y > maxY) {
              maxY = value.y;
            }
          }
        });
        // If viewTimeRange is supplied and the minY and maxY are still undefined,
        // look for the first numerical value to the left and to the right of the time window
        if (
          viewTimeRange &&
          (minY === undefined || maxY === undefined) &&
          leftValue !== undefined &&
          rightValue !== undefined
        ) {
          minY = Math.min(leftValue.y as number, rightValue.y as number);
          maxY = Math.max(leftValue.y as number, rightValue.y as number);
        }
      });
    }
  });

  const scaleDomain = [...(yAxis.scaleDomain || [])];
  if (minY !== undefined) {
    scaleDomain[0] = minY;
  }
  if (maxY !== undefined) {
    scaleDomain[1] = maxY;
  }

  return scaleDomain as number[];
}

/**
 * Populates y-axes with scaleDomain
 */
export function getYAxesWithScaleDomains(
  yAxes: Axis[],
  layers: Layer[],
  resourcesByViewLayerId: Record<number, Resource[]> = {},
  viewTimeRange: TimeRange,
): Axis[] {
  return yAxes.map(yAxis => {
    if (yAxis.domainFitMode !== 'manual') {
      const scaleDomain = getYAxisBounds(yAxis, layers, resourcesByViewLayerId, viewTimeRange);
      return { ...yAxis, scaleDomain };
    }
    return yAxis;
  });
}

/* TODO this would all be much easier if we just gave things UUIDs instead of incrementing numerical ids.  */
/**
 * Duplicates the given row and internal axes, layers, and horizontal guides.
 */
export function duplicateRow(row: Row, timelines: Timeline[], timelineId: number): Row | null {
  const timelinesClone = structuredClone(timelines);
  const timeline = timelinesClone.find(t => t.id === timelineId);
  if (!timeline) {
    return null;
  }

  const rowClone = structuredClone(row);
  const { id, name, layers, yAxes, horizontalGuides, ...rowArgs } = rowClone;
  const newRow = createRow(timelines, { ...rowArgs, name: `${name} (copy)` });
  timeline.rows.push(newRow);

  yAxes.forEach(axis => {
    const { id, ...axisArgs } = axis;
    newRow.yAxes.push(createYAxis(timelinesClone, axisArgs));
  });

  layers.forEach(layer => {
    if (layer.chartType === 'activity') {
      const { id, ...layerArgs } = layer;
      newRow.layers.push(createTimelineActivityLayer(timelinesClone, layerArgs));
    } else if (layer.chartType === 'line') {
      const { id, yAxisId, ...layerArgs } = layer;
      newRow.layers.push(createTimelineLineLayer(timelinesClone, newRow.yAxes, layerArgs));
    } else if (layer.chartType === 'x-range') {
      const { id, yAxisId, ...layerArgs } = layer;
      newRow.layers.push(createTimelineXRangeLayer(timelinesClone, newRow.yAxes, layerArgs));
    } else {
      console.warn('Unable to clone row layer with chart type:', layer.chartType);
    }
  });

  horizontalGuides.forEach(guide => {
    const { id, yAxisId, ...guideArgs } = guide;
    newRow.horizontalGuides.push(createHorizontalGuide(timelinesClone, newRow.yAxes, guideArgs));
  });

  return newRow;
}
