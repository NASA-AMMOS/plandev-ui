import { bisector, tickStep } from 'd3-array';
import type { Quadtree, QuadtreeInternalNode, QuadtreeLeaf } from 'd3-quadtree';
import { scaleLinear, scalePoint, scaleTime, type ScaleLinear, type ScalePoint, type ScaleTime } from 'd3-scale';
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
import { groupBy } from 'lodash-es';
import {
  ViewDefaultDiscreteOptions,
  ViewDiscreteLayerColorPresets,
  ViewLineLayerColorPresets,
  ViewXRangeLayerSchemePresets,
} from '../constants/view';
import type { ActivityDirective } from '../types/activity';
import type { ExternalEvent } from '../types/external-event';
import type { Resource, ResourceType, ResourceValue, Span, SpanUtilityMaps, SpansMap } from '../types/simulation';
import type {
  ActivityLayer,
  ActivityOptions,
  Axis,
  DiscreteTree,
  DiscreteTreeExpansionMap,
  DiscreteTreeNode,
  DiscreteTreeNodeItem,
  ExternalEventLayer,
  ExternalEventOptions,
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
  XRangeLayerColorScheme,
} from '../types/timeline';
import { generateRandomPastelColor } from './color';
import { getExternalEventRowId } from './externalEvents';
import { filterEmpty } from './generic';
import { getDoyTime } from './time';

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
export function utcTicks(start: Date, stop: Date, count: number) {
  const reverse = stop < start;
  if (reverse) {
    [start, stop] = [stop, start];
  }
  const interval = customD3TickInterval(start, stop, count);
  // Make end date inclusive by creating a new date +1ms from stop date
  const ticks = interval ? interval.range(start, new Date(+stop + 1)) : []; // inclusive stop
  return reverse ? ticks.reverse() : ticks;
}

export function formatTickUtc(date: Date, viewDurationMs: number, tickCount: number): string {
  let label = getDoyTime(date);
  if (viewDurationMs > durationYear * tickCount) {
    label = label.slice(0, 4);
  } else if (viewDurationMs > durationMonth * tickCount) {
    label = label.slice(0, 8);
  } else if (viewDurationMs > durationWeek) {
    label = label.slice(0, 8);
  }
  return label;
}

export function formatTickLocalTZ(date: Date, viewDurationMs: number, tickCount: number): string {
  if (viewDurationMs > durationYear * tickCount) {
    return date.getFullYear().toString();
  }
  return date.toLocaleString();
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

export function getOrdinalYScale(domain: (string | null)[], height: number): ScalePoint<string> {
  return scalePoint()
    .domain(domain as string[])
    .range([height - CANVAS_PADDING_Y, CANVAS_PADDING_Y]);
}

export function getYScale(domain: (number | null)[], height: number): ScaleLinear<number, number> {
  return scaleLinear()
    .domain(domain.filter(filterEmpty))
    .range([height - CANVAS_PADDING_Y, CANVAS_PADDING_Y]);
}

export function isActivityLayer(layer: Layer): layer is ActivityLayer {
  return layer.chartType === 'activity';
}

export function isExternalEventLayer(layer: Layer): layer is ExternalEventLayer {
  return layer.chartType === 'externalEvent';
}

export function isXRangeLayer(layer: Layer): layer is XRangeLayer {
  return layer.chartType === 'x-range';
}

export function isLineLayer(layer: Layer): layer is LineLayer {
  return layer.chartType === 'line';
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
 * Returns the next unused activity color within the given row
 */
export function getUniqueColorForActivityLayer(row?: Row): string {
  let color = ViewDiscreteLayerColorPresets[0];
  const seenColors: Record<string, boolean> = {};
  if (row) {
    row.layers.forEach(layer => {
      if (isActivityLayer(layer)) {
        seenColors[layer.activityColor] = true;
      }
    });
    color = ViewDiscreteLayerColorPresets.find(c => !seenColors[c]) ?? generateRandomPastelColor();
  }
  return color;
}

/**
 * Returns the next unused xrange color scheme within the given row
 */
export function getUniqueColorSchemeForXRangeLayer(row?: Row): XRangeLayerColorScheme {
  const defaultScheme: XRangeLayerColorScheme = 'schemeTableau10';
  let colorScheme = defaultScheme as XRangeLayerColorScheme;
  const seenColorSchemes: Record<string, boolean> = {};
  if (row) {
    row.layers.forEach(layer => {
      if (isXRangeLayer(layer)) {
        seenColorSchemes[layer.colorScheme] = true;
      }
    });
    colorScheme =
      (Object.keys(ViewXRangeLayerSchemePresets).find(c => !seenColorSchemes[c]) as XRangeLayerColorScheme) ??
      defaultScheme;
  }
  return colorScheme;
}

/**
 * Returns the next unused line color within the given row
 */
export function getUniqueColorForLineLayer(row?: Row): string {
  let color = ViewLineLayerColorPresets[0];
  const seenColors: Record<string, boolean> = {};
  if (row) {
    row.layers.forEach(layer => {
      if (isLineLayer(layer)) {
        seenColors[layer.lineColor] = true;
      }
    });
    color = ViewLineLayerColorPresets.find(c => !seenColors[c]) ?? generateRandomPastelColor();
  }
  return color;
}

export function getTimeRangeAroundTime(time: number, timeRangeSpan: number, maxTimeRange?: TimeRange): TimeRange {
  const padding = timeRangeSpan / 2;
  let start = time - padding;
  let end = time + padding;

  // optional maxTimeRange for bounding the results bounds
  if (maxTimeRange !== undefined && maxTimeRange !== null) {
    //span is larger than the max time range, well it can't get larger than that
    if (timeRangeSpan >= maxTimeRange.end - maxTimeRange.start) {
      return maxTimeRange;
    }

    //bound the start or end of the TimeRange, but keep the timeRangeSpan the same
    if (time - padding < maxTimeRange.start) {
      start = maxTimeRange.start;
      end = maxTimeRange.start + timeRangeSpan;
    } else if (time + padding > maxTimeRange.end) {
      start = maxTimeRange.end - timeRangeSpan;
      end = maxTimeRange.end;
    }
  }
  return { end, start };
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
          if (typeof firstAxis.scaleDomain[0] === 'number' && typeof firstAxis.scaleDomain[1] === 'number') {
            y = (firstAxis.scaleDomain[1] + firstAxis.scaleDomain[0]) / 2;
          } else {
            // TODO: Figure out how to place a horizontal guide on a categorical axis
          }
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
    discreteOptions: ViewDefaultDiscreteOptions,
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
    activityColor: ViewDiscreteLayerColorPresets[0],
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
 * Returns a new external event layer
 */
export function createTimelineExternalEventLayer(
  timelines: Timeline[],
  args: Partial<ExternalEventLayer> = {},
): ExternalEventLayer {
  const id = getNextLayerID(timelines);

  return {
    chartType: 'externalEvent',
    externalEventColor: '#fcdd8f',
    filter: {
      externalEvent: {
        event_types: [],
      },
    },
    id,
    name: '',
    yAxisId: null,
    ...args,
  };
}

export function createTimelineResourceLayer(timelines: Timeline[], resourceType: ResourceType) {
  const { name, schema } = resourceType;
  const { type: schemaType } = schema;

  const unit = schema.metadata?.unit?.value;
  const isDiscreteSchema = schemaType === 'boolean' || schemaType === 'string' || schemaType === 'variant';
  const isNumericSchema =
    schemaType === 'int' ||
    schemaType === 'real' ||
    (schemaType === 'struct' && schema?.items?.rate?.type === 'real' && schema?.items?.initial?.type === 'real');

  const yAxis = createYAxis(timelines, {
    label: { text: `${name}${unit ? ` (${unit})` : ''}` },
    tickCount: isNumericSchema ? 5 : 0,
  });

  const layer = isDiscreteSchema
    ? createTimelineXRangeLayer(timelines, [yAxis], { filter: { resource: { names: [name] } } })
    : isNumericSchema
      ? createTimelineLineLayer(timelines, [yAxis], { filter: { resource: { names: [name] } } })
      : null;

  return { layer, yAxis };
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
    lineColor: ViewLineLayerColorPresets[0],
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
    showAsLinePlot: false,
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
  resources: Resource[],
  viewTimeRange?: TimeRange,
): number[] {
  // Find all layers that are associated with this y axis
  const yAxisLayers = layers.filter(layer => layer.yAxisId === yAxis.id);

  // Find min and max of associated layers
  let minY: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  yAxisLayers.forEach(layer => {
    const layerResources = filterResourcesByLayer(layer, resources) as Resource[];
    if (layerResources) {
      layerResources.forEach(resource => {
        let leftValue: ResourceValue | undefined;
        let rightValue: ResourceValue | undefined;
        resource.values.forEach(value => {
          const isNumber = typeof value.y === 'number';
          // Identify the first value to the left of the viewTimeRange
          if (viewTimeRange && value.x < viewTimeRange.start) {
            // TODO shouldn't we continue on to next value if this is a gap?
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
          if (viewTimeRange && value.x > viewTimeRange.end) {
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
        // Account for the neighboring left and right values as these values are connected to in line drawing
        if (viewTimeRange) {
          minY = Math.min(
            minY ?? Number.MAX_SAFE_INTEGER,
            leftValue !== undefined && leftValue.y ? (leftValue.y as number) : Number.MAX_SAFE_INTEGER,
            rightValue !== undefined && rightValue.y ? (rightValue.y as number) : Number.MAX_SAFE_INTEGER,
          );
          maxY = Math.max(
            maxY ?? Number.MIN_SAFE_INTEGER,
            leftValue !== undefined && leftValue.y ? (leftValue.y as number) : Number.MIN_SAFE_INTEGER,
            rightValue !== undefined && rightValue.y ? (rightValue.y as number) : Number.MIN_SAFE_INTEGER,
          );
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
  resources: Resource[],
  viewTimeRange: TimeRange,
): Axis[] {
  return yAxes.map(yAxis => {
    if (yAxis.domainFitMode !== 'manual') {
      const scaleDomain = getYAxisBounds(yAxis, layers, resources, viewTimeRange);
      return { ...yAxis, scaleDomain };
    }
    return yAxis;
  });
}

/**
 * Duplicates the given row and internal axes, layers, and horizontal guides.
 * @todo this would all be much easier if we just gave things UUIDs instead of incrementing numerical ids
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
    } else if (layer.chartType === 'externalEvent') {
      const { id, ...layerArgs } = layer;
      newRow.layers.push(createTimelineExternalEventLayer(timelinesClone, layerArgs));
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

/**
 * Performs min/max decimation on the array of numerical data. This method preserves peaks in the signal
 * and requires up to 4 points for each pixel. Taken from ChartJS min/max implementation.
 * @see https://github.com/chartjs/Chart.js/blob/master/src/plugins/plugin.decimation.js
 * @see https://digital.ni.com/public.nsf/allkb/F694FFEEA0ACF282862576020075F784
 * @todo may not work with logarithmic decimation, see https://www.chartjs.org/docs/latest/configuration/decimation.html
 */
export function minMaxDecimation<T>(
  data: { x: number; y: number }[],
  start: number,
  count: number,
  availableWidth: number,
): T[] {
  let avgX = 0;
  let countX = 0;
  let i, point, x, y, prevX, minIndex, maxIndex, startIndex;
  let minY = Number.MAX_SAFE_INTEGER;
  let maxY = Number.MIN_SAFE_INTEGER;
  const decimated = [];
  const endIndex = start + count - 1;

  const xMin = data[start].x;
  const xMax = data[endIndex].x;
  const dx = xMax - xMin;
  for (i = start; i < start + count; ++i) {
    point = data[i];
    x = ((point.x - xMin) / dx) * availableWidth;
    y = point.y;
    const truncX = x | 0;

    if (truncX === prevX) {
      // Determine `minY` / `maxY` and `avgX` while we stay within same x-position
      if (y < minY) {
        minY = y;
        minIndex = i;
      } else if (y > maxY) {
        maxY = y;
        maxIndex = i;
      }
      // For first point in group, countX is `0`, so average will be `x` / 1.
      // Use point.x here because we're computing the average data `x` value
      avgX = (countX * avgX + point.x) / ++countX;
    } else {
      // Push up to 4 points, 3 for the last interval and the first point for this interval
      const lastIndex = i - 1;

      // Ensure min and max indices are not equal to null or undefined
      if (minIndex != null && maxIndex != null) {
        // The interval is defined by 4 points: start, min, max, end.
        // The starting point is already considered at this point, so we need to determine which
        // of the other points to add. We need to sort these points to ensure the decimated data
        // is still sorted and then ensure there are no duplicates.
        const intermediateIndex1 = Math.min(minIndex, maxIndex);
        const intermediateIndex2 = Math.max(minIndex, maxIndex);

        if (intermediateIndex1 !== startIndex && intermediateIndex1 !== lastIndex) {
          decimated.push({
            ...data[intermediateIndex1],
            x: avgX,
          });
        }
        if (intermediateIndex2 !== startIndex && intermediateIndex2 !== lastIndex) {
          decimated.push({
            ...data[intermediateIndex2],
            x: avgX,
          });
        }
      }

      // lastIndex === startIndex will occur when a range has only 1 point which could
      // happen with very uneven data
      if (i > 0 && lastIndex !== startIndex) {
        // Last point in the previous interval
        decimated.push(data[lastIndex]);
      }

      // Start of the new interval
      decimated.push(point);
      prevX = truncX;
      countX = 0;
      minY = maxY = y;
      minIndex = maxIndex = startIndex = i;
    }
  }

  return decimated as T[];
}

/**
 * Filters list of resources by the layer's resource filter
 */
export function filterResourcesByLayer(layer: Layer, resources: Resource[] | ResourceType[]) {
  return resources.filter(resource => (layer.filter.resource?.names || []).indexOf(resource.name) > -1);
}

/**
 * Returns true if the directive falls within the viewTimeRange bounds
 */
export function directiveInView(directive: ActivityDirective, viewTimeRange: TimeRange) {
  const directiveX = directive.start_time_ms ?? 0;
  return directiveX >= viewTimeRange.start && directiveX < viewTimeRange.end;
}

/**
 * Returns true if the span falls within or encompasses the viewTimeRange
 */
export function spanInView(span: Span, viewTimeRange: TimeRange) {
  const spanInBounds = span.startMs >= viewTimeRange.start && span.startMs < viewTimeRange.end;
  return spanInBounds || (span.startMs < viewTimeRange.start && span.startMs + span.durationMs >= viewTimeRange.start);
}

/**
 * Returns true if the external event falls within or encompasses the viewTimeRange
 */
export function externalEventInView(externalEvent: ExternalEvent, viewTimeRange: TimeRange) {
  const externalEventStartInBounds =
    externalEvent.start_ms >= viewTimeRange.start && externalEvent.start_ms < viewTimeRange.end;
  const externalEventEndInBounds =
    externalEvent.start_ms < viewTimeRange.start &&
    externalEvent.start_ms + externalEvent.duration_ms >= viewTimeRange.start;
  return externalEventStartInBounds || externalEventEndInBounds;
}

export function generateDiscreteTreeUtil(
  directives: ActivityDirective[],
  spans: Span[],
  externalEvents: ExternalEvent[],
  discreteTreeExpansionMap: DiscreteTreeExpansionMap,
  hierarchyMode: ActivityOptions['hierarchyMode'],
  groupByMethod: ExternalEventOptions['groupBy'] = 'event_type_name',
  filterActivitiesByTime: boolean,
  spanUtilityMaps: SpanUtilityMaps,
  spansMap: SpansMap,
  showSpans: boolean,
  showDirectives: boolean,
  viewTimeRange: TimeRange,
  hasExternalEventsLayer: boolean,
  hasActivityLayer: boolean,
): DiscreteTree {
  const groupedSpans = showSpans && hierarchyMode === 'flat' ? groupBy(spans, 'type') : {};
  const groupedDirectives = showDirectives ? groupBy(directives, 'type') : {};
  const groupByMethodFormatted = `pkey.${groupByMethod}`; // Both event_type_name and source_key are within the pkey field
  const groupedExternalEvents = groupBy(externalEvents, groupByMethodFormatted);

  // make the activity subtree
  const activityNodes: DiscreteTreeNode[] = [];
  if (hasActivityLayer) {
    const allKeys = new Set(Object.keys(groupedSpans).concat(Object.keys(groupedDirectives)));
    Array.from(allKeys)
      .sort()
      .forEach(type => {
        const spanGroup = groupedSpans[type];
        const directiveGroup = groupedDirectives[type];
        const id = type;
        const expanded = getNodeExpanded(id, discreteTreeExpansionMap);
        const label = type;
        const children: DiscreteTreeNode['children'] = [];
        const items: DiscreteTreeNode['items'] = [];
        const seenSpans: Record<string, boolean> = {};
        if (directiveGroup) {
          directiveGroup.forEach(directive => {
            let childSpan;
            if (showSpans) {
              const childSpanId = spanUtilityMaps.directiveIdToSpanIdMap[directive.id];
              childSpan = spansMap[childSpanId];
              if (childSpan && hierarchyMode === 'flat') {
                seenSpans[childSpan.span_id] = true;
              }
            }
            if (expanded) {
              children.push(
                getDirectiveSubtree(
                  directive,
                  id,
                  discreteTreeExpansionMap,
                  filterActivitiesByTime,
                  spanUtilityMaps,
                  spansMap,
                  showSpans,
                  viewTimeRange,
                ),
              );
            }
            items.push({ directive, ...(childSpan ? { span: childSpan } : null) });
          });
        }
        if (spanGroup && hierarchyMode === 'flat') {
          spanGroup.forEach(span => {
            if (!seenSpans[span.span_id]) {
              if (expanded) {
                children.push(
                  ...getSpanSubtrees(
                    span,
                    id,
                    discreteTreeExpansionMap,
                    'span',
                    filterActivitiesByTime,
                    spanUtilityMaps,
                    spansMap,
                    viewTimeRange,
                  ),
                );
              }
              items.push({ span });
            }
          });
        }
        activityNodes.push({
          activity_type: 'aggregation',
          children: paginateNodes(children, 'activity', id, discreteTreeExpansionMap),
          expanded: expanded,
          id,
          isLeaf: false,
          items,
          label,
          type: 'Activity',
        });
      });
  }

  // make the external event subtree
  const externalEventNodes: DiscreteTreeNode[] = [];
  if (hasExternalEventsLayer) {
    if (Object.keys(groupedExternalEvents).length !== 0) {
      const allKeys = Object.keys(groupedExternalEvents);
      // Iterate through all groups - either external event types, external source types, or external sources
      Array.from(allKeys)
        .sort()
        .forEach(type => {
          const externalEventsGroup = groupedExternalEvents[type];
          const id = type;
          const expanded = getNodeExpanded(id, discreteTreeExpansionMap);
          const label = type;
          const children: DiscreteTreeNode['children'] = [];
          const items: DiscreteTreeNode['items'] = [];
          if (externalEventsGroup) {
            externalEventsGroup.forEach(externalEvent => {
              items.push({ externalEvent });
              children.push({
                activity_type: undefined, // ignored.
                children: [],
                expanded: expanded,
                id: `${externalEvent.pkey.key}`,
                isLeaf: true,
                items: [{ externalEvent }],
                label: externalEvent.pkey.key,
                type: 'ExternalEvent',
              });
            });
          }
          externalEventNodes.push({
            activity_type: undefined, // ignored.
            children: paginateNodes(children, 'externalEvent', id, discreteTreeExpansionMap),
            expanded: expanded,
            id,
            isLeaf: false,
            items: items,
            label,
            type: 'ExternalEvent',
          });
        });
    }
  }

  // if both are present, cluster them
  if (hasActivityLayer && activityNodes.length && hasExternalEventsLayer && externalEventNodes.length) {
    const activityAggNode: DiscreteTreeNode = {
      activity_type: undefined,
      children: activityNodes,
      expanded: getNodeExpanded('!!activity-agg', discreteTreeExpansionMap),
      id: '!!activity-agg',
      isLeaf: false,
      items: getUniqueNodeItems(activityNodes),
      label: 'Activities',
      type: 'Activity', // RowHeaderDiscreteTree does not seem to require any special treatment; so no special category for this top node
    };
    const externalEventAggNode: DiscreteTreeNode = {
      activity_type: undefined,
      children: externalEventNodes,
      expanded: getNodeExpanded('!!ex-ev-agg', discreteTreeExpansionMap),
      id: '!!ex-ev-agg',
      isLeaf: false,
      items: getUniqueNodeItems(externalEventNodes),
      label: 'External Events',
      type: 'ExternalEvent', // RowHeaderDiscreteTree does not seem to require any special treatment; so no special category for this top node
    };
    return [activityAggNode, externalEventAggNode];
  } else if (activityNodes.length) {
    return activityNodes;
  } else {
    return externalEventNodes;
  }
}

function getUniqueNodeItems(nodes: DiscreteTreeNode[]) {
  const uniqueDirectiveLookup: Set<number> = new Set();
  const uniqueSpanLookup: Set<number> = new Set();
  const uniqueExternalEventLookup: Set<string> = new Set();
  return nodes
    .flatMap((node: DiscreteTreeNode) => node.items)
    .reduce((flattenedNodes: DiscreteTreeNodeItem[], nodeItem: DiscreteTreeNodeItem) => {
      if (nodeItem.directive && !uniqueDirectiveLookup.has(nodeItem.directive.id)) {
        uniqueDirectiveLookup.add(nodeItem.directive.id);
        flattenedNodes.push(nodeItem);
      } else if (nodeItem.span && !uniqueSpanLookup.has(nodeItem.span.span_id)) {
        uniqueSpanLookup.add(nodeItem.span.span_id);
        flattenedNodes.push(nodeItem);
      } else if (
        nodeItem.externalEvent &&
        !uniqueExternalEventLookup.has(getExternalEventRowId(nodeItem.externalEvent.pkey))
      ) {
        uniqueExternalEventLookup.add(getExternalEventRowId(nodeItem.externalEvent.pkey));
        flattenedNodes.push(nodeItem);
      }
      return flattenedNodes;
    }, []);
}

/**
 * Returns the subtree for the given directive
 */
export function getDirectiveSubtree(
  directive: ActivityDirective,
  parentId: string,
  discreteTreeExpansionMap: DiscreteTreeExpansionMap,
  filterActivitiesByTime: boolean,
  spanUtilityMaps: SpanUtilityMaps,
  spansMap: SpansMap,
  showSpans: boolean,
  viewTimeRange: TimeRange,
): DiscreteTreeNode {
  let children: DiscreteTreeNode[] = [];
  const id = `${parentId}_${directive.id}`;
  let span;
  const expanded = getNodeExpanded(id, discreteTreeExpansionMap);

  if (showSpans) {
    const rootSpanId = spanUtilityMaps.directiveIdToSpanIdMap[directive.id];
    const rootSpan = spansMap[rootSpanId];
    if (rootSpan) {
      span = rootSpan;
    }
    if (typeof rootSpanId === 'number') {
      children = paginateNodes(
        getSpanSubtrees(
          rootSpan,
          id,
          discreteTreeExpansionMap,
          'aggregation',
          filterActivitiesByTime,
          spanUtilityMaps,
          spansMap,
          viewTimeRange,
        ),
        'activity',
        id,
        discreteTreeExpansionMap,
      );
    }
  }

  return {
    activity_type: 'directive',
    children,
    expanded,
    id,
    isLeaf: children.length < 1,
    items: [{ directive, span }],
    label: directive.name,
    type: 'Activity',
  } as DiscreteTreeNode;
}

/**
 * Returns the span subtrees for the given span
 */
export function getSpanSubtrees(
  span: Span,
  parentId: string,
  activityTreeExpansionMap: DiscreteTreeExpansionMap,
  type: DiscreteTreeNode['activity_type'],
  filterActivitiesByTime: boolean,
  spanUtilityMaps: SpanUtilityMaps,
  spansMap: SpansMap,
  viewTimeRange: TimeRange,
): DiscreteTreeNode[] {
  const children: DiscreteTreeNode[] = [];
  const spanChildren = spanUtilityMaps.spanIdToChildIdsMap[span.span_id].map(id => spansMap[id]);
  if (type === 'aggregation') {
    // Group by type
    let computedSpans = spanChildren;
    if (filterActivitiesByTime) {
      computedSpans = spanChildren.filter(span => spanInView(span, viewTimeRange));
    }
    const groupedSpanChildren = groupBy(computedSpans, 'type');
    Object.keys(groupedSpanChildren)
      .sort()
      .forEach(key => {
        const spanGroup = groupedSpanChildren[key];
        const id = `${parentId}_${key}`;
        const expanded = getNodeExpanded(id, activityTreeExpansionMap);
        let childrenForKey: DiscreteTreeNode[] = [];
        if (expanded) {
          spanGroup.forEach(spanChild => {
            childrenForKey.push(
              ...getSpanSubtrees(
                spanChild,
                id,
                activityTreeExpansionMap,
                'span',
                filterActivitiesByTime,
                spanUtilityMaps,
                spansMap,
                viewTimeRange,
              ),
            );
          });
          childrenForKey = paginateNodes(childrenForKey, 'activity', id, activityTreeExpansionMap);
        }
        children.push({
          activity_type: 'aggregation',
          children: childrenForKey,
          expanded,
          id,
          isLeaf: false,
          items: spanGroup.map(span => ({ span })),
          label: key,
          type: 'Activity',
        });
      });
  } else if (type === 'span') {
    const id = `${parentId}_${span.span_id}`;
    const expanded = getNodeExpanded(id, activityTreeExpansionMap);
    const count = spanChildren.length;
    let childrenForKey: DiscreteTreeNode[] = [];
    if (expanded) {
      childrenForKey = paginateNodes(
        getSpanSubtrees(
          span,
          id,
          activityTreeExpansionMap,
          'aggregation',
          filterActivitiesByTime,
          spanUtilityMaps,
          spansMap,
          viewTimeRange,
        ),
        'activity',
        id,
        activityTreeExpansionMap,
      );
    }
    children.push({
      activity_type: 'span',
      children: childrenForKey,
      expanded,
      id,
      isLeaf: count < 1,
      items: [{ span }],
      label: span.type,
      type: 'Activity',
    });
  }
  return children;
}

/**
 * Returns whether or not the node is expanded in the activity/external-event tree
 */
export function getNodeExpanded(id: string, treeExpansionMap: DiscreteTreeExpansionMap) {
  if (!Object.hasOwn(treeExpansionMap, id)) {
    return false;
  }
  return treeExpansionMap[id];
}

/**
 * Recursively paginates the given `DiscreteTreeNode` list such that no subgrouping exceeds
 * the `binSize` argument. The provided list must contain nodes of a single type (activity or
 * event); mixing them would produce nonsensical results.
 */
export function paginateNodes(
  nodes: DiscreteTreeNode[],
  activityOrEvent: 'activity' | 'externalEvent',
  parentId: string,
  discreteTreeExpansionMap: DiscreteTreeExpansionMap,
  depth = 1,
  binSize = 100,
): DiscreteTreeNode[] {
  if (nodes.length <= binSize) {
    return nodes;
  }
  const newNodes: DiscreteTreeNode[] = [];
  nodes.forEach((node, i) => {
    const bin = Math.floor(i / binSize);
    if (!newNodes[bin]) {
      newNodes[bin] =
        activityOrEvent === 'activity'
          ? {
              activity_type: 'aggregation',
              children: [],
              expanded: false,
              id: '',
              isLeaf: false,
              items: [],
              label: '',
              type: 'Activity',
            }
          : {
              activity_type: undefined,
              children: [],
              expanded: false,
              id: '',
              isLeaf: false,
              items: [],
              label: '',
              type: 'ExternalEvent',
            };
    }
    newNodes[bin].children.push(node);
    if (node.items) {
      newNodes[bin].items.push(...node.items);
    }
  });
  newNodes.forEach((node, i) => {
    const nodeStart = i * binSize ** depth;
    const nodeEnd = Math.min(nodeStart + node.children.length * depth ** binSize, (i + 1) * binSize ** depth);
    const label = `[${nodeStart} … ${nodeEnd - 1}]`;
    node.id = `${parentId}_${label}_page`;
    node.label = label;
    node.expanded = getNodeExpanded(node.id, discreteTreeExpansionMap);
  });
  return paginateNodes(newNodes, activityOrEvent, parentId, discreteTreeExpansionMap, depth + 1);
}
