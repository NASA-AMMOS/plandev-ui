import { bisector, tickStep } from 'd3-array';
import type { Quadtree, QuadtreeInternalNode, QuadtreeLeaf } from 'd3-quadtree';
import { scaleLinear, scalePoint, scaleSymlog, scaleTime, type ScalePoint, type ScaleTime } from 'd3-scale';
import { curveLinear, curveMonotoneX, type CurveFactory } from 'd3-shape';
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
import { groupBy, isArray } from 'lodash-es';
import {
  ViewDefaultDiscreteOptions,
  ViewDiscreteLayerColorPresets,
  ViewLineLayerColorPresets,
  ViewXRangeLayerSchemePresets,
} from '../constants/view';
import type { ActivityFilterField, ExternalEventFilterField } from '../enums/filter';
import type { ActivityDirective, ActivityType } from '../types/activity';
import type { ExternalEvent, ExternalEventType } from '../types/external-event';
import type { DynamicFilter } from '../types/filter';
import type { DefaultEffectiveArgumentsMap } from '../types/parameter';
import type { ValueSchema } from '../types/schema';
import type { Resource, ResourceType, ResourceValue, Span, SpanUtilityMaps, SpansMap } from '../types/simulation';
import type {
  ActivityLayer,
  ActivityLayerFilter,
  ActivityOptions,
  Axis,
  AxisScaleType,
  ComputedAxis,
  DiscreteTree,
  DiscreteTreeExpansionMap,
  DiscreteTreeNode,
  DiscreteTreeNodeItem,
  ExternalEventLayer,
  ExternalEventLayerFilter,
  ExternalEventOptions,
  HorizontalGuide,
  InstantStyle,
  InterpolationMode,
  Layer,
  LineLayer,
  LineStyle,
  PointShape,
  QuadtreePoint,
  QuadtreeRect,
  Row,
  ShowPointsMode,
  StackedSeries,
  TimeRange,
  Timeline,
  VerticalGuide,
  XRangeLayer,
  XRangeLayerColorScheme,
  YScale,
} from '../types/timeline';
import { generateRandomPastelColor } from './color';
import { getExternalEventRowId } from './externalEvents';
import { filterEmpty, lowercase, stringCompare } from './generic';
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

export const DEFAULT_AXIS_SCALE_TYPE: AxisScaleType = 'linear';
export const DEFAULT_INSTANT_STYLE: InstantStyle = 'line';
export const DEFAULT_INTERPOLATION: InterpolationMode = 'step';
export const DEFAULT_LINE_OPACITY = 1;
export const DEFAULT_LINE_STYLE: LineStyle = 'solid';
export const DEFAULT_POINT_SHAPE: PointShape = 'circle';
export const DEFAULT_SHOW_POINTS_MODE: ShowPointsMode = 'auto';

/**
 * Canvas dash patterns in CSS pixels, keyed by line style. Deliberately absolute rather than
 * scaled by lineWidth so that a pattern stays recognizable as the same style across widths --
 * scaling makes a thick dashed line indistinguishable from a thick solid one at typical zooms.
 */
const LINE_DASH_ARRAYS: Record<LineStyle, number[]> = {
  dashed: [6, 4],
  dotted: [1, 3],
  solid: [],
};

/**
 * Extra room around a point sprite, as a multiple of the circle diameter. Every shape is drawn at
 * equal visual area, so the taller ones (triangle, diamond, cross) overflow a tight radius-sized
 * box and would be clipped by the sprite canvas without this padding.
 */
const POINT_SPRITE_PADDING = 1.6;

/** Width of the 'line' instant marker. The value every discrete item has been drawn with. */
const INSTANT_LINE_WIDTH = 2;

/**
 * Size of a point-like instant marker as a fraction of the subrow height, then clamped. A fraction
 * so the marker scales with the row rather than becoming a speck on a tall row; clamped because a
 * marker taller than roughly a text line stops reading as a point and starts colliding with the
 * neighbouring subrow.
 */
const INSTANT_GLYPH_HEIGHT_RATIO = 0.7;
const INSTANT_GLYPH_MIN_SIZE = 4;
const INSTANT_GLYPH_MAX_SIZE = 14;

/**
 * Default opacity for a line layer's area fill. Kept translucent so that layers beneath it
 * (activities, x-ranges, other lines) remain readable, since line layers are drawn last.
 */
export const DEFAULT_LINE_FILL_OPACITY = 0.25;

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

/**
 * Minimum vertical gap in CSS pixels between two y-axis tick labels. The axis font is 10px on a 16px
 * line box (see RowYAxes styles), so anything tighter than this overlaps and becomes unreadable.
 */
export const MIN_Y_TICK_SPACING = 14;

/**
 * Drops tick values whose rendered positions would sit on top of each other, keeping the first of any
 * overlapping cluster. Needed because d3 only loosely honors a requested tick count -- on a log scale
 * it returns decade multiples and largely ignores the count, so a short row can end up with a dozen
 * labels crushed into the bottom few pixels.
 *
 * Ticks are assumed to be in scale order; the extremes are kept because they anchor the reader.
 */
export function thinTicksByPixelSpacing(
  tickValues: number[],
  scale: (value: number) => number | undefined,
  minSpacing: number = MIN_Y_TICK_SPACING,
): number[] {
  const positioned = tickValues
    .map(value => ({ position: scale(value), value }))
    .filter((tick): tick is { position: number; value: number } => Number.isFinite(tick.position));
  if (positioned.length < 3) {
    return positioned.map(tick => tick.value);
  }

  const last = positioned[positioned.length - 1];
  const kept = [positioned[0]];
  for (const tick of positioned.slice(1, -1)) {
    if (Math.abs(tick.position - kept[kept.length - 1].position) >= minSpacing) {
      kept.push(tick);
    }
  }
  // Always keep the far extreme, evicting a neighbor it would collide with rather than dropping it
  while (kept.length > 1 && Math.abs(last.position - kept[kept.length - 1].position) < minSpacing) {
    kept.pop();
  }
  kept.push(last);

  return kept.map(tick => tick.value);
}

/**
 * Default base for log axis tick labels. Base only affects which values get labelled -- it has no
 * effect on pixel positions, since the scale affinely normalizes the domain onto the range and the
 * 1/ln(base) factor cancels out.
 */
export const DEFAULT_LOG_BASE = 10;

/**
 * How many powers of the base to walk down from the data's largest magnitude when building a log tick
 * ladder. Generous enough to cover any range a timeline row can legibly label, while bounding the loop
 * for a domain that reaches extremely small magnitudes.
 */
const MAX_LOG_LADDER_STEPS = 32;

/**
 * Width of symlog's linear region, set to the smallest non-zero magnitude present in the data. That
 * choice makes the decade spacing match a true log scale closely -- measured against scaleLog over the
 * same domain, decades land within ~0.5px of log's uniform ladder -- while still giving zero a real
 * position just below the smallest sample.
 *
 * d3's own default of 1 is a poor fit here: for data spanning small magnitudes it swallows several
 * decades into the linear region and crushes them into a couple of pixels, which is precisely the
 * problem a log axis is chosen to solve.
 *
 * Note this takes no base. Base affects which values get labelled, never where anything is drawn.
 */
export function getLogConstant(smallestMagnitude: number | undefined): number {
  if (smallestMagnitude === undefined || !Number.isFinite(smallestMagnitude) || smallestMagnitude <= 0) {
    return 1;
  }
  return smallestMagnitude;
}

/**
 * Builds the y scale for an axis. A 'log' axis is backed by symlog so that zero and negative samples
 * still get a position -- see AxisScaleType for why a true log scale is the wrong choice here.
 */
export function getYScale(
  domain: (number | null)[],
  height: number,
  scaleType?: AxisScaleType,
  logConstant?: number,
): YScale {
  const numericDomain = domain.filter(filterEmpty);
  const range = [height - CANVAS_PADDING_Y, CANVAS_PADDING_Y];

  if (scaleType === 'log') {
    return scaleSymlog()
      .domain(numericDomain)
      .range(range)
      .constant(logConstant && logConstant > 0 ? logConstant : 1);
  }
  return scaleLinear().domain(numericDomain).range(range);
}

/**
 * Tick values for a log axis: zero plus successive powers of `base` outward in both directions, kept to
 * those inside the domain. Generated here rather than taken from the scale because d3's symlog emits
 * evenly spaced round numbers (200, 400, 600...) which read as a linear axis and defeat the point of
 * choosing log. Callers still thin the result to whatever fits -- see thinTicksByPixelSpacing.
 */
export function getLogTickValues(domain: number[], base: number = DEFAULT_LOG_BASE): number[] {
  const [min, max] = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [];
  }
  const safeBase = Number.isFinite(base) && base > 1 ? base : DEFAULT_LOG_BASE;
  const maxMagnitude = Math.max(Math.abs(min), Math.abs(max));
  if (maxMagnitude === 0) {
    return [0];
  }

  // Walk down from the largest power of the base the data reaches. The step cap bounds the walk so a
  // domain reaching very small magnitudes cannot spin for thousands of iterations; anything past it is
  // far below what a row this tall could label anyway.
  const topExponent = Math.floor(Math.log(maxMagnitude) / Math.log(safeBase));
  const magnitudes: number[] = [];
  for (let step = 0; step < MAX_LOG_LADDER_STEPS; step += 1) {
    magnitudes.push(Math.pow(safeBase, topExponent - step));
  }

  // magnitudes is descending, so negating it is already ascending, and reversing it gives the
  // ascending positive side. Zero sits between them and is always a meaningful gridline on symlog.
  const ladder = [...magnitudes.map(magnitude => -magnitude), 0, ...magnitudes.slice().reverse()];

  // Anchored by the domain extremes so the axis always shows its own bounds
  const withinDomain = ladder.filter(value => value > min && value < max);
  return Array.from(new Set([min, ...withinDomain, max])).sort((a, b) => a - b);
}

/**
 * Clamps an opacity into the 0-1 range the view schema allows, falling back to `fallback` for
 * non-finite input (e.g. a cleared number input yields NaN). Canvas silently ignores a non-finite
 * or out-of-range globalAlpha and keeps whatever was set previously, so callers must sanitize
 * rather than pass a raw view value through.
 */
export function clampOpacity(opacity: number | undefined, fallback: number = DEFAULT_LINE_OPACITY): number {
  if (opacity === undefined || !Number.isFinite(opacity)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, opacity));
}

/**
 * Returns the y pixel position of the baseline for a line layer's area fill, or null if the scale
 * has no usable baseline (i.e. an empty scale domain). The baseline is the position of zero clamped
 * to the canvas, so that signals crossing zero fill from the axis while signals that never cross it
 * fill to the nearest edge.
 *
 * A log scale is undefined at zero, so there `yScale(0)` is -Infinity and the fill would silently
 * disappear. Fall back to the bottom of the scale's range instead, which is what an operator means
 * by "fill under the line" on a log axis.
 */
export function getLineFillBaselineY(yScale: YScale, height: number): number | null {
  const [domainMin] = yScale.domain();
  if (!Number.isFinite(domainMin)) {
    return null;
  }
  const zeroY = yScale(0);
  const baselineY = Number.isFinite(zeroY) ? zeroY : yScale(domainMin as number);
  if (!Number.isFinite(baselineY)) {
    return null;
  }
  return Math.max(0, Math.min(height, baselineY));
}

/**
 * Clamps a stroke or radius size to a non-negative finite number. A negative or NaN lineWidth makes
 * canvas drop the stroke entirely and a negative radius makes the point sprite canvas throw, so
 * hand-edited and imported views have to be sanitized at the draw site.
 */
export function clampLineSize(size: number | undefined, fallback: number): number {
  if (size === undefined || !Number.isFinite(size) || size < 0) {
    return fallback;
  }
  return size;
}

/**
 * Returns the canvas setLineDash pattern for a line style. Unknown styles (from a hand-edited or
 * future-versioned view) fall back to solid rather than leaving the previous layer's pattern set.
 */
export function getLineDashArray(lineStyle: LineStyle | undefined): number[] {
  return LINE_DASH_ARRAYS[lineStyle as LineStyle] ?? LINE_DASH_ARRAYS.solid;
}

/**
 * Returns the d3-shape curve for an interpolation mode. `step` and `linear` share curveLinear: the
 * staircase comes from the hold values in the data rather than from the curve, so a step layer must
 * connect its values with straight segments like a linear one does.
 */
export function getLineCurve(interpolation: InterpolationMode | undefined): CurveFactory {
  return interpolation === 'smooth' ? curveMonotoneX : curveLinear;
}

/**
 * Horizontal extent of an instant marker, in CSS pixels either side of the item's start x, plus the
 * marker's drawn size.
 *
 * The single source of truth for instant geometry. Four separate things have to agree on it and each
 * gets it from here: the draw call, the quadtree hit box, the compact-mode bin packer, and the label
 * offset. They disagreed silently before this existed -- see the `boxEndX` note in
 * `LayerDiscrete.getItemEndX`.
 *
 * `line` extends only to the right, keeping its left edge on the instant: that is where a directive
 * tick has always been drawn, and it reads as a boundary marker rather than as a point. The
 * point-like styles straddle the instant instead, because a circle or diamond whose *left edge* sat
 * on the start time would read as arriving late by its own radius. That left overhang is the reason
 * the packer and the quadtrees need this function at all.
 */
export function getInstantGlyphExtents(
  instantStyle: InstantStyle | undefined,
  rowHeight: number,
): { left: number; right: number; size: number } {
  if (instantStyle !== 'dot' && instantStyle !== 'diamond') {
    return { left: 0, right: INSTANT_LINE_WIDTH, size: INSTANT_LINE_WIDTH };
  }
  const size = Math.min(
    INSTANT_GLYPH_MAX_SIZE,
    Math.max(INSTANT_GLYPH_MIN_SIZE, Math.round(rowHeight * INSTANT_GLYPH_HEIGHT_RATIO)),
  );
  const half = size / 2;
  return { left: half, right: half, size };
}

/**
 * Sorted, deduplicated union of every x across the given series.
 *
 * Stacking needs one shared x grid because the layers being summed are sampled at unrelated times.
 * The *union* specifically, rather than a fixed-step grid: summing piecewise-linear functions is exact
 * when they are sampled at the union of their own breakpoints, and approximate at any other spacing.
 */
function getStackXGrid(series: StackInputSeries[]): number[] {
  const seen = new Set<number>();
  for (const { values } of series) {
    for (const value of values) {
      seen.add(value.x);
    }
  }
  return Array.from(seen).sort((a, b) => a - b);
}

/**
 * Resamples one series onto `grid`, returning null wherever the series has no defined value: outside
 * its own time range, or at a gap.
 *
 * Null rather than zero on purpose. Zero would read as "this contributed nothing", which for a power
 * or data-volume budget is a claim the data does not make -- the honest reading of a gap is that the
 * total is unknown there.
 */
function resampleOntoStackGrid(values: ResourceValue[], grid: number[], stepwise: boolean): (number | null)[] {
  const out: (number | null)[] = new Array(grid.length).fill(null);
  if (values.length === 0) {
    return out;
  }
  const lastX = values[values.length - 1].x;
  // Monotone cursor rather than a search per grid point, so the whole pass stays linear in grid size
  let i = 0;
  for (let g = 0; g < grid.length; g++) {
    const x = grid[g];
    if (x < values[0].x || x > lastX) {
      continue;
    }
    // Land on the *last* value at or before x. Last, not first, so that a discrete segment boundary --
    // where two values share an x -- takes the incoming segment's value, matching how the step is drawn
    while (i + 1 < values.length && values[i + 1].x <= x) {
      i++;
    }
    const left = values[i];
    const leftY = typeof left.y === 'number' ? left.y : null;
    if (stepwise || left.x === x) {
      out[g] = leftY;
      continue;
    }
    const right = values[i + 1];
    const rightY = right && typeof right.y === 'number' ? right.y : null;
    if (leftY === null || rightY === null || !right) {
      continue;
    }
    out[g] = leftY + ((x - left.x) / (right.x - left.x)) * (rightY - leftY);
  }
  return out;
}

export type StackInputSeries = {
  interpolation: InterpolationMode | undefined;
  layerId: number;
  resourceName: string;
  values: ResourceValue[];
};

/**
 * Stacks the given series in the order supplied, resampled onto their shared x grid.
 *
 * Order is the layer order on the axis, so the first series is the bottom of the stack. Each series
 * is resampled with *its own* interpolation mode, so a step resource and a linear one stack correctly
 * together rather than one being forced into the other's shape.
 *
 * Once any series is undefined at an x, every series above it is undefined there too: a total is only
 * as knowable as its least known term. That is why a gap low in the stack punches through the layers
 * above it rather than quietly closing up.
 *
 * Negative values reduce the running total rather than being stacked separately, so the top of the
 * stack always reads as the net sum.
 */
export function stackLineLayerValues(series: StackInputSeries[]): StackedSeries[] {
  const grid = getStackXGrid(series);
  const running: number[] = new Array(grid.length).fill(0);
  const broken: boolean[] = new Array(grid.length).fill(false);

  return series.map(({ interpolation, layerId, resourceName, values }) => {
    const stepwise = (interpolation ?? DEFAULT_INTERPOLATION) === 'step';
    // Hold values are dropped for an interpolating layer before resampling, exactly as LayerLine drops
    // them before drawing -- otherwise the stack would sum a shape the layer does not draw
    const prepared = stepwise ? values : values.filter((_value, index) => !isDroppableHoldPoint(values, index));
    const resampled = resampleOntoStackGrid(prepared, grid, stepwise);
    return {
      layerId,
      resourceName,
      values: grid.map((x, index) => {
        if (broken[index] || resampled[index] === null) {
          broken[index] = true;
          return { x, y: null, y0: null };
        }
        const y0 = running[index];
        running[index] = y0 + (resampled[index] as number);
        return { x, y: running[index], y0 };
      }),
    };
  });
}

/**
 * Whether a resource schema describes a numeric magnitude, and therefore plots against a numeric y
 * scale rather than an ordinal one.
 *
 * This is also the test for whether a resource can be *summed* with another, which is what stacking
 * needs. A boolean's 0/1 encodes false/true and an enum's y position is an arbitrary rung, so adding
 * either to anything produces a number that means nothing -- the same reason those types refuse
 * interpolation.
 */
export function isNumericResourceSchema(schema: ValueSchema): boolean {
  const { type } = schema;
  return (
    type === 'int' ||
    type === 'real' ||
    type === 'duration' ||
    (type === 'struct' && schema?.items?.rate?.type === 'real' && schema?.items?.initial?.type === 'real')
  );
}

/** What a stacked layer needs in order to draw: its cumulative series, and the total beneath it. */
export type StackedLayerRender = { baseline: (number | null)[]; resource: Resource };

/**
 * Builds the stacked series for every line layer on a stacked axis, keyed by layer id. Layers on
 * unstacked axes, and layers whose resource cannot be summed, are absent -- they draw normally.
 *
 * This is the cross-layer pass stacking needs, and it belongs at the row level because that is the
 * only place that sees every layer and every loaded resource at once. `getYAxesWithScaleDomains`
 * already ran there for the same reason.
 */
export function getLineLayerStacks(
  yAxes: Axis[],
  layers: Layer[],
  resources: Resource[],
): Record<number, StackedLayerRender> {
  const byLayerId: Record<number, StackedLayerRender> = {};
  for (const yAxis of yAxes) {
    if (!yAxis.stack) {
      continue;
    }
    const schemasByLayerId: Record<number, Resource> = {};
    const input: StackInputSeries[] = [];
    // Layer order is stack order, bottom up
    for (const layer of layers) {
      if (layer.yAxisId !== yAxis.id || !isLineLayer(layer)) {
        continue;
      }
      const resource = getResourceForLayer(layer, resources) as Resource | undefined;
      if (!resource || !isNumericResourceSchema(resource.schema)) {
        continue;
      }
      schemasByLayerId[layer.id] = resource;
      input.push({
        interpolation: layer.interpolation,
        layerId: layer.id,
        resourceName: resource.name,
        values: resource.values,
      });
    }
    // A single series stacks to itself, so there is nothing to gain from the extra resampling
    if (input.length < 2) {
      continue;
    }
    for (const series of stackLineLayerValues(input)) {
      byLayerId[series.layerId] = {
        baseline: series.values.map(value => value.y0),
        resource: {
          name: series.resourceName,
          schema: schemasByLayerId[series.layerId].schema,
          // Untagged on purpose: these values are already resampled to the shape the layer draws, so a
          // second round of hold dropping downstream would thin the stack out of alignment with its
          // own baseline
          values: series.values.map(value => ({ x: value.x, y: value.y })),
        },
      };
    }
  }
  return byLayerId;
}

/**
 * Whether the value at `valueIndex` is a hold value that a layer interpolating between segments can
 * drop. See `ResourceValue.is_hold`.
 *
 * A resource's last value is kept even when it is a hold value, because it is the only value
 * carrying the profile's end time -- dropping it would end the plotted line at the start of the last
 * segment instead of at the end of the profile.
 */
export function isDroppableHoldPoint(values: ResourceValue[], valueIndex: number): boolean {
  return values[valueIndex]?.is_hold === true && valueIndex < values.length - 1;
}

/**
 * Returns the CSS-pixel dimension of the square sprite used to draw a point of the given radius.
 * Rounded up so the sprite's backing canvas lands on whole pixels.
 */
export function getPointSpriteSize(pointRadius: number): number {
  return Math.ceil(pointRadius * 2 * POINT_SPRITE_PADDING);
}

/**
 * Returns the d3-shape symbol `size` (an *area* in square pixels, not a radius) that draws the given
 * shape at the same visual weight as a circle of `pointRadius`. d3 normalizes every symbol to the
 * requested area, so passing the circle's area keeps shapes interchangeable without the diamond
 * reading as smaller than the square.
 */
export function getPointSymbolSize(pointRadius: number): number {
  return Math.PI * pointRadius * pointRadius;
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
 * Returns the next thing ID based on all things
 */
export function getNextThingID(things: { id: number }[]): number {
  let maxID = -1;
  things.forEach(thing => {
    if (thing.id > maxID) {
      maxID = thing.id;
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
    scaleType: DEFAULT_AXIS_SCALE_TYPE,
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
    filter: { activity: {} },
    id,
    name: 'Activity Layer',
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
      externalEvent: {},
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
  const isNumericSchema = isNumericResourceSchema(schema);

  const yAxis = createYAxis(timelines, {
    label: { text: `${name}${unit ? ` (${unit})` : ''}` },
    tickCount: isNumericSchema ? 5 : 0,
  });

  const layer = isDiscreteSchema
    ? createTimelineXRangeLayer(timelines, [yAxis], { filter: { resource: name } })
    : isNumericSchema
      ? createTimelineLineLayer(timelines, [yAxis], { filter: { resource: name } })
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
    fillOpacity: DEFAULT_LINE_FILL_OPACITY,
    filter: {},
    id,
    interpolation: DEFAULT_INTERPOLATION,
    lineColor: ViewLineLayerColorPresets[0],
    lineStyle: DEFAULT_LINE_STYLE,
    lineWidth: 1,
    name: '',
    opacity: DEFAULT_LINE_OPACITY,
    pointRadius: 2,
    pointShape: DEFAULT_POINT_SHAPE,
    showFill: false,
    showPoints: DEFAULT_SHOW_POINTS_MODE,
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
    filter: {},
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
  stacks: Record<number, StackedLayerRender> = {},
): number[] {
  // Find all layers that are associated with this y axis
  const yAxisLayers = layers.filter(layer => layer.yAxisId === yAxis.id);

  // Find min and max of associated layers
  let minY: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  yAxisLayers.forEach(layer => {
    // A stacked layer is measured by its cumulative series, not its own values: the axis has to hold
    // the stack total, and the topmost layer's cumulative series *is* that total. Reusing this loop
    // rather than special casing stacking keeps the left/right and fitTimeWindow handling identical.
    const layerResource = (stacks[layer.id]?.resource ?? getResourceForLayer(layer, resources)) as Resource;
    if (layerResource) {
      let leftValue: ResourceValue | undefined;
      let rightValue: ResourceValue | undefined;
      layerResource.values.forEach(value => {
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
    }
  });

  const scaleDomain = [...(yAxis.scaleDomain || [])];
  if (minY !== undefined) {
    scaleDomain[0] = minY;
  }
  if (maxY !== undefined) {
    scaleDomain[1] = maxY;
  }

  // A stack is built up from zero, so zero has to be on the axis. Without it the bands still sit on
  // each other correctly but stop encoding proportion: a bottom band covering 95% of the total renders
  // as a sliver of it, which is the one reading a filled stacked chart invites. Manual domains are left
  // alone -- an explicit domain is the operator overriding exactly this kind of inference.
  if (yAxis.stack && yAxis.domainFitMode !== 'manual') {
    if (typeof scaleDomain[0] === 'number') {
      scaleDomain[0] = Math.min(0, scaleDomain[0]);
    }
    if (typeof scaleDomain[1] === 'number') {
      scaleDomain[1] = Math.max(0, scaleDomain[1]);
    }
  }

  return scaleDomain as number[];
}

/**
 * Smallest non-zero absolute value across the resources feeding an axis, or undefined when the axis has
 * no non-zero data. Only used to derive a log axis's symlog constant.
 */
export function getSmallestMagnitudeForAxis(
  yAxis: Axis,
  layers: Layer[],
  resources: Resource[],
  viewTimeRange?: TimeRange,
): number | undefined {
  let smallest: number | undefined = undefined;
  for (const layer of layers.filter(layer => layer.yAxisId === yAxis.id)) {
    const layerResource = getResourceForLayer(layer, resources) as Resource;
    if (!layerResource) {
      continue;
    }
    for (const value of layerResource.values) {
      if (typeof value.y !== 'number') {
        continue;
      }
      // Mirrors the window getYAxisBounds considers, so the constant matches the domain on screen
      if (
        viewTimeRange &&
        yAxis.domainFitMode === 'fitTimeWindow' &&
        (value.x < viewTimeRange.start || value.x > viewTimeRange.end)
      ) {
        continue;
      }
      const magnitude = Math.abs(value.y);
      if (magnitude > 0 && (smallest === undefined || magnitude < smallest)) {
        smallest = magnitude;
      }
    }
  }
  return smallest;
}

/**
 * Populates y-axes with scaleDomain, plus the render-time logConstant a log axis needs. Both are
 * derived here rather than stored in the view so they cannot go stale as data changes.
 */
export function getYAxesWithScaleDomains(
  yAxes: Axis[],
  layers: Layer[],
  resources: Resource[],
  viewTimeRange: TimeRange,
  stacks: Record<number, StackedLayerRender> = {},
): ComputedAxis[] {
  return yAxes.map(yAxis => {
    const computed: ComputedAxis =
      yAxis.domainFitMode !== 'manual'
        ? { ...yAxis, scaleDomain: getYAxisBounds(yAxis, layers, resources, viewTimeRange, stacks) }
        : { ...yAxis };
    if (yAxis.scaleType === 'log') {
      computed.logConstant = getLogConstant(getSmallestMagnitudeForAxis(yAxis, layers, resources, viewTimeRange));
    }
    return computed;
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
    const truncX = Math.trunc(x);

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
export function getResourceForLayer(layer: Layer, resources: Resource[] | ResourceType[]) {
  return resources.find(resource => layer.filter.resource === resource.name);
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
      .sort(stringCompare)
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
        .sort(stringCompare)
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
      .sort(stringCompare)
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

export function applyActivityLayerFilter(
  filter: ActivityLayerFilter | undefined,
  directives: ActivityDirective[],
  spans: Span[],
  types: ActivityType[],
  defaultArgumentsMap: DefaultEffectiveArgumentsMap,
): { directives: ActivityDirective[]; spans: Span[] } {
  if (
    !filter ||
    (!filter.dynamic_type_filters?.length &&
      !filter.other_filters?.length &&
      !filter.static_types?.length &&
      (!filter.type_subfilters || !Object.keys(filter.type_subfilters).length))
  ) {
    return { directives, spans };
  }

  const staticTypeMap: Record<string, boolean> = (filter.static_types || []).reduce(
    (acc: Record<string, boolean>, cur: string) => {
      acc[cur] = true;
      return acc;
    },
    {},
  );

  const typeDefMap: Record<string, ActivityType> = (types || []).reduce(
    (acc: Record<string, ActivityType>, cur: ActivityType) => {
      acc[cur.name] = cur;
      return acc;
    },
    {},
  );

  const filteredDirectives = directives.filter(directive => {
    return applyFiltersToDirectiveOrSpan(directive, filter, staticTypeMap, typeDefMap, defaultArgumentsMap);
  });

  const filteredSpans = spans.filter(span => {
    return applyFiltersToDirectiveOrSpan(span, filter, staticTypeMap, typeDefMap, defaultArgumentsMap);
  });
  return { directives: filteredDirectives, spans: filteredSpans };
}

export function applyExternalEventLayerFilter(
  filter: ExternalEventLayerFilter | undefined,
  externalEvents: ExternalEvent[],
): { externalEvents: ExternalEvent[] } {
  if (
    !filter ||
    (!filter.dynamic_type_filters?.length &&
      !filter.other_filters?.length &&
      !filter.static_types?.length &&
      (!filter.type_subfilters || !Object.keys(filter.type_subfilters).length))
  ) {
    return { externalEvents: [] };
  }

  const staticTypeMap: Record<string, boolean> = (filter.static_types || []).reduce(
    (acc: Record<string, boolean>, cur: string) => {
      acc[cur] = true;
      return acc;
    },
    {},
  );

  const filteredExternalEvents: ExternalEvent[] = externalEvents.filter(externalEvent => {
    return applyFiltersToExternalEvent(externalEvent, filter, staticTypeMap);
  });

  return { externalEvents: filteredExternalEvents };
}

function applyFiltersToDirectiveOrSpan(
  directiveOrSpan: ActivityDirective | Span,
  filter: ActivityLayerFilter,
  staticTypeMap: Record<string, boolean>,
  typeDefMap: Record<string, ActivityType>,
  defaultArgumentsMap: DefaultEffectiveArgumentsMap,
) {
  const anyTypeFiltersSpecified = !!(filter.static_types?.length || filter.dynamic_type_filters?.length);
  const anyMainFiltersSpecified = anyTypeFiltersSpecified || !!filter.other_filters?.length;
  let included = !anyMainFiltersSpecified;

  // Check to see if directive is included in static list
  if (filter.static_types?.length) {
    included = !!staticTypeMap[directiveOrSpan.type];
  }

  // Check if necessary to see if directive is included in dynamic list
  if ((!filter.static_types?.length || !included) && filter.dynamic_type_filters?.length) {
    included = directiveOrSpanMatchesDynamicFilters(
      directiveOrSpan,
      filter.dynamic_type_filters,
      typeDefMap,
      defaultArgumentsMap,
    );
  }

  // Apply other filters on top of the types
  if (filter.other_filters?.length) {
    included =
      directiveOrSpanMatchesDynamicFilters(directiveOrSpan, filter.other_filters, typeDefMap, defaultArgumentsMap) &&
      (anyTypeFiltersSpecified ? included : true);
  }

  // Apply type specific filters if found and if the type is already included or
  // if no other filters were specified (case where all types are included by default)
  if (
    filter.type_subfilters &&
    filter.type_subfilters[directiveOrSpan.type] &&
    filter.type_subfilters[directiveOrSpan.type].length
  ) {
    included =
      directiveOrSpanMatchesDynamicFilters(
        directiveOrSpan,
        filter.type_subfilters[directiveOrSpan.type],
        typeDefMap,
        defaultArgumentsMap,
      ) && (anyMainFiltersSpecified ? included : true);
  }
  return included;
}

function applyFiltersToExternalEvent(
  externalEvent: ExternalEvent,
  filter: ExternalEventLayerFilter,
  staticTypeMap: Record<string, boolean>,
) {
  const anyTypeFiltersSpecified = !!(filter.static_types?.length || filter.dynamic_type_filters?.length);
  const anyMainFiltersSpecified = anyTypeFiltersSpecified || !!filter.other_filters?.length;
  let included = !anyMainFiltersSpecified;

  // Check to see if external event is included in static list
  if (filter.static_types?.length) {
    included = !!staticTypeMap[externalEvent.pkey.event_type_name];
  }

  // Check if necessary to see if directive is included in dynamic list
  if ((!filter.static_types?.length || !included) && filter.dynamic_type_filters?.length) {
    included = externalEventMatchesDynamicFilters(externalEvent, filter.dynamic_type_filters);
  }

  // Apply other filters on top of the types
  if (filter.other_filters?.length) {
    included =
      externalEventMatchesDynamicFilters(externalEvent, filter.other_filters) &&
      (anyTypeFiltersSpecified ? included : true);
  }

  // Apply type specific filters if found and if the type is already included or
  // if no other filters were specified (case where all types are included by default)
  if (
    filter.type_subfilters &&
    filter.type_subfilters[externalEvent.pkey.event_type_name] &&
    filter.type_subfilters[externalEvent.pkey.event_type_name].length
  ) {
    included =
      externalEventMatchesDynamicFilters(externalEvent, filter.type_subfilters[externalEvent.pkey.event_type_name]) &&
      (anyMainFiltersSpecified ? included : true);
  }

  return included;
}

export function getMatchingTypesForActivityLayerFilter(filter: ActivityLayerFilter | undefined, types: ActivityType[]) {
  if (
    !filter ||
    (!filter.dynamic_type_filters?.length &&
      !filter.other_filters?.length &&
      !filter.static_types?.length &&
      (!filter.type_subfilters || !Object.keys(filter.type_subfilters).length))
  ) {
    return types;
  }

  const staticTypeMap: Record<string, boolean> = (filter.static_types || []).reduce(
    (acc: Record<string, boolean>, cur: string) => {
      acc[cur] = true;
      return acc;
    },
    {},
  );

  const anyTypeFiltersSpecified = !!(filter.static_types?.length || filter.dynamic_type_filters?.length);

  return types.filter(type => {
    let included = !anyTypeFiltersSpecified;

    // Check to see if type is included in static list
    if (filter.static_types?.length) {
      included = !!staticTypeMap[type.name];
    }

    // Check if necessary to see if type is included in dynamic list
    if ((!filter.static_types?.length || !included) && filter.dynamic_type_filters?.length) {
      included = typeMatchesDynamicFilters(type, filter.dynamic_type_filters);
    }
    return included;
  });
}

export function getMatchingTypesForExternalEventLayerFilter(
  filter: ExternalEventLayerFilter | undefined,
  types: ExternalEventType[],
) {
  if (
    !filter ||
    (!filter.dynamic_type_filters?.length &&
      !filter.other_filters?.length &&
      !filter.static_types?.length &&
      (!filter.type_subfilters || !Object.keys(filter.type_subfilters).length))
  ) {
    return types;
  }

  const staticTypeMap: Record<string, boolean> = (filter.static_types || []).reduce(
    (acc: Record<string, boolean>, cur: string) => {
      acc[cur] = true;
      return acc;
    },
    {},
  );

  const anyTypeFiltersSpecified = !!(filter.static_types?.length || filter.dynamic_type_filters?.length);

  return types.filter(type => {
    let included = !anyTypeFiltersSpecified;

    // Check to see if type is included in static list
    if (filter.static_types?.length) {
      included = !!staticTypeMap[type.name];
    }

    // Check if necessary to see if type is included in dynamic list
    if ((!filter.static_types?.length || !included) && filter.dynamic_type_filters?.length) {
      included = externalEventTypeMatchesDynamicFilters(type, filter.dynamic_type_filters);
    }
    return included;
  });
}

function directiveOrSpanMatchesDynamicFilters(
  directiveOrSpan: ActivityDirective | Span,
  dynamicFilters: DynamicFilter<typeof ActivityFilterField>[],
  activityTypeDefMap: Record<string, ActivityType>,
  defaultArgumentsMap: DefaultEffectiveArgumentsMap,
): boolean {
  return dynamicFilters.reduce((acc, curr) => {
    let matches = false;
    if (curr.field === 'Type') {
      matches = matchesDynamicFilter(directiveOrSpan.type, curr.operator, curr.value);
    } else if (curr.field === 'Name') {
      matches = matchesDynamicFilter((directiveOrSpan as ActivityDirective).name, curr.operator, curr.value);
    } else if (curr.field === 'Subsystem') {
      // Get subsystem tag for this directive
      let subsystemTagId = -1;
      const typeDef = activityTypeDefMap[directiveOrSpan.type];
      if (typeDef?.subsystem_tag?.id) {
        subsystemTagId = typeDef.subsystem_tag.id;
      }
      matches = matchesDynamicFilter(subsystemTagId, curr.operator, curr.value);
    } else if (curr.field === 'Tags' && isArray((directiveOrSpan as ActivityDirective).tags)) {
      const ids = (directiveOrSpan as ActivityDirective).tags.map(tag => tag.tag.id);
      matches = matchesDynamicFilter(ids, curr.operator, curr.value);
    } else if (curr.field === 'Parameter' && curr.subfield) {
      const subfield = curr.subfield;
      const args = (directiveOrSpan as ActivityDirective).arguments || (directiveOrSpan as Span).attributes.arguments;
      let argument = args[subfield.name];
      if (argument === undefined) {
        const isSpan = (directiveOrSpan as Span).span_id !== undefined;
        if (!isSpan) {
          // Get default
          const defaultArgsForType = defaultArgumentsMap[directiveOrSpan.type];
          if (defaultArgsForType) {
            argument = defaultArgsForType[subfield.name];
          }
        }
      }
      matches = matchesDynamicFilter(argument, curr.operator, curr.value);
    } else if (curr.field === 'SchedulingGoalId') {
      const goalId = (directiveOrSpan as ActivityDirective).source_scheduling_goal_id;
      if (typeof goalId === 'number') {
        matches = matchesDynamicFilter(goalId, curr.operator, curr.value);
      }
    }
    return acc && matches;
  }, true);
}

// TODO: Does typeDefMap have any use for External Events?
function externalEventMatchesDynamicFilters(
  externalEvent: ExternalEvent,
  dynamicFilters: DynamicFilter<typeof ExternalEventFilterField>[],
): boolean {
  return dynamicFilters.reduce((acc, curr) => {
    let matches = false;
    if (curr.field === 'Type') {
      matches = matchesDynamicFilter(externalEvent.pkey.event_type_name, curr.operator, curr.value);
    } else if (curr.field === 'Name') {
      matches = matchesDynamicFilter(externalEvent.pkey.key, curr.operator, curr.value);
    } else if (curr.field === 'Attribute' && curr.subfield) {
      const subfield = curr.subfield;
      const attributeKey: string = subfield.name;
      if (attributeKey.includes('->')) {
        const split = attributeKey.split(' -> ');
        let attribute = externalEvent.attributes;
        let failed = false;
        for (const subKey of split) {
          if (attribute === undefined) {
            failed = true;
            break;
          }
          attribute = attribute[subKey];
        }
        if (!failed || attribute !== undefined) {
          matches = matchesDynamicFilter(
            attribute as string | number | boolean | string[] | number[],
            curr.operator,
            curr.value,
          );
        }
      } else {
        const attribute = externalEvent.attributes[attributeKey];
        if (attribute !== undefined) {
          matches = matchesDynamicFilter(attribute, curr.operator, curr.value);
        }
      }
    }
    return acc && matches;
  }, true);
}

// TODO try consolidating with the function above
function typeMatchesDynamicFilters(
  type: ActivityType,
  dynamicFilters: DynamicFilter<typeof ActivityFilterField>[],
): boolean {
  return dynamicFilters.reduce((acc, curr) => {
    let matches = false;
    if (curr.field === 'Type') {
      matches = matchesDynamicFilter(type.name, curr.operator, curr.value);
    } else if (curr.field === 'Subsystem') {
      matches = matchesDynamicFilter(type.subsystem_tag?.id ?? -1, curr.operator, curr.value);
    }
    return acc && matches;
  }, true);
}

// TODO consolidate to Activity function
function externalEventTypeMatchesDynamicFilters(
  type: ExternalEventType,
  dynamicFilters: DynamicFilter<typeof ExternalEventFilterField>[],
): boolean {
  return dynamicFilters.reduce((acc, curr) => {
    let matches = false;
    if (curr.field === 'Type') {
      matches = matchesDynamicFilter(type.name, curr.operator, curr.value);
    }
    return acc && matches;
  }, true);
}

export function matchesDynamicFilter(
  rawItemValue: DynamicFilter<ActivityFilterField>['value'], // the actual value
  operator: DynamicFilter<ActivityFilterField>['operator'],
  rawFilterValue: DynamicFilter<ActivityFilterField>['value'], // the value(s) we're comparing against
) {
  const itemValue = lowercase(rawItemValue);
  const filterValue = lowercase(rawFilterValue);
  switch (operator) {
    case 'equals':
      return itemValue === filterValue;
    case 'does_not_equal':
      return itemValue !== filterValue;
    case 'includes':
      if (typeof filterValue === 'string' && typeof itemValue === 'string') {
        if (filterValue === '') {
          return false;
        }
        return itemValue.indexOf(filterValue) > -1;
      } else if (isArray(filterValue)) {
        return !!(isArray(itemValue) ? itemValue : [itemValue]).find(
          item => (filterValue as (typeof itemValue)[]).indexOf(item) > -1,
        );
      }
      return false;
    case 'does_not_include':
      if (typeof filterValue === 'string' && typeof itemValue === 'string') {
        if (filterValue === '') {
          return true;
        }
        return itemValue.indexOf(filterValue) < 0;
      } else if (isArray(filterValue)) {
        return !(isArray(itemValue) ? itemValue : [itemValue]).find(
          item => (filterValue as (typeof itemValue)[]).indexOf(item) > -1,
        );
      }
      return false;
    case 'is_greater_than':
      return itemValue > filterValue;
    case 'is_less_than':
      return itemValue < filterValue;
    case 'is_within':
      if (
        isArray(filterValue) &&
        filterValue.length === 2 &&
        typeof filterValue[0] === 'number' &&
        typeof filterValue[1] === 'number'
      ) {
        // TODO should upper bound be inclusive or exclusive?
        return itemValue >= filterValue[0] && itemValue <= filterValue[1];
      }
      return false;
    case 'is_not_within':
      if (
        isArray(filterValue) &&
        filterValue.length === 2 &&
        typeof filterValue[0] === 'number' &&
        typeof filterValue[1] === 'number'
      ) {
        // TODO should upper bound be inclusive or exclusive?
        return itemValue < filterValue[0] || itemValue > filterValue[1];
      }
      return false;
    default:
      return false;
  }
}
