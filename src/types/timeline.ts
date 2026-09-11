import type { ScaleLinear, ScaleSymLog } from 'd3-scale';
import type { Selection } from 'd3-selection';
import type { ActivityFilterField, ExternalEventFilterField } from '../enums/filter';
import type { ActivityDirective, ActivityDirectiveId, ActivityType } from './activity';
import type { ConstraintResultWithName } from './constraint';
import type { ExternalEvent, ExternalEventId, ExternalEventType } from './external-event';
import type { DynamicFilter, DynamicFilterDataType } from './filter';
import type { ResourceType, Span, SpanId } from './simulation';

export type DiscreteTree = DiscreteTreeNode[];

export type DiscreteTreeNode = {
  activity_type: undefined | 'aggregation' | 'directive' | 'span'; // when items are activity related, this applies. TODO: this design is a little awkward.
  children: DiscreteTreeNode[];
  expanded: boolean;
  id: string;
  isLeaf: boolean;
  items: DiscreteTreeNodeItem[];
  label: string;
  type: 'Activity' | 'ExternalEvent';
};

export type DiscreteTreeNodeItem = { directive?: ActivityDirective; externalEvent?: ExternalEvent; span?: Span };

export type DiscreteTreeNodeDrawItem = DiscreteTreeNodeItem & { startX: number };

export type DiscreteTreeExpansionMap = Record<string, boolean>;

export interface ActivityLayer extends Layer {
  activityColor: string;
}
export interface ExternalEventLayer extends Layer {
  externalEventColor: string;
  /**
   * Opacity of events that have a duration, which are drawn translucent by default so a busy row of
   * overlapping bars stays readable. Does not apply to a zero-duration event: its marker has no area
   * to overlap, so it always draws opaque.
   */
  opacity?: number;
}

export type ActivityLayerFilter = {
  dynamic_type_filters?: DynamicFilter<Pick<typeof ActivityFilterField, 'Type' | 'Subsystem'>>[];
  other_filters?: DynamicFilter<Pick<typeof ActivityFilterField, 'Tags' | 'Parameter' | 'SchedulingGoalId' | 'Name'>>[];
  static_types?: string[];
  type_subfilters?: Record<
    string,
    DynamicFilter<Pick<typeof ActivityFilterField, 'Tags' | 'Parameter' | 'SchedulingGoalId' | 'Name'>>[]
  >;
};

export type ExternalEventLayerFilter = {
  dynamic_type_filters?: DynamicFilter<Pick<typeof ExternalEventFilterField, 'Type'>>[];
  other_filters?: DynamicFilter<Pick<typeof ExternalEventFilterField, 'Attribute' | 'Name'>>[];
  static_types?: string[];
  type_subfilters?: Record<string, DynamicFilter<Pick<typeof ExternalEventFilterField, 'Attribute' | 'Name'>>[]>;
};

export type ActivityLayerFilterSubfield = { name: string; type: DynamicFilterDataType };
export type ActivityLayerFilterSubfieldSchema = ActivityLayerFilterSubfield & {
  activityTypes: string[];
  label: string;
  unit?: string;
  values?: string[];
};

// TODO: Is this still valid for External Events?
export type ExternalEventLayerFilterSubfield = { name: string; type: DynamicFilterDataType };
export type ExternalEventLayerFilterSubfieldSchema = ExternalEventLayerFilterSubfield & {
  externalEventTypes: string[];
  label: string;
  unit?: string;
  values?: string[];
};

export type AxisDomainFitMode = 'fitPlan' | 'fitTimeWindow' | 'manual';

/**
 * How an axis maps values to pixels. 'log' is backed by d3's symlog, which is logarithmic away from
 * zero and linear through it, so samples at zero and below still get a position -- a true log scale
 * would drop them, and mission resources routinely sit at zero.
 */
export type AxisScaleType = 'linear' | 'log';

/** Any numeric y scale an axis can produce. Both are callable d3 continuous scales. */
export type YScale = ScaleLinear<number, number> | ScaleSymLog<number, number>;

export type Axis = {
  color: string;
  domainFitMode: AxisDomainFitMode;
  id: number;
  label: Label;
  logBase?: number;
  renderTickLines?: boolean;
  scaleDomain?: (number | null)[];
  scaleType?: AxisScaleType;
  /**
   * Stacks this axis's line layers bottom-up in layer order, so the topmost layer's line is the
   * total. On the axis rather than the layer: only series sharing a scale can be summed, and the
   * axis domain has to become the stack total.
   */
  stack?: boolean;
  tickCount: number | null;
};

/**
 * An Axis plus the fields derived at render time. Kept separate from Axis because these must never be
 * written back into a view definition -- the schema sets additionalProperties: false and rejects them.
 */
export type ComputedAxis = Axis & {
  /** Width of symlog's linear region, derived from the data. See getLogConstant. */
  logConstant?: number;
};

export type BoundingBox = {
  maxTimeX: number;
  maxX: number;
  maxY: number;
  minX: number;
};

export type PointBounds = {
  maxXCanvas: number;
  x: number;
  xCanvas: number;
  xEnd: number;
  xEndCanvas: number;
};

export type SpanTimeBounds = {
  duration: number;
  end: number;
  start: number;
};

export type HorizontalGuide = {
  id: number;
  label: Label;
  y: number;
  /**
   * Turns the guide into a shaded band between `y` and `y2`. Order does not matter. Absent for an
   * ordinary single-value guide, which stays a line.
   */
  y2?: number;
  yAxisId: number;
};

export type Label = {
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  color?: string;
  fontFace?: string;
  fontSize?: number;
  hidden?: boolean;
  text: string;
};

export type ChartType = 'activity' | 'line' | 'x-range' | 'externalEvent';

export interface Layer {
  chartType: ChartType;
  filter: {
    activity?: ActivityLayerFilter;
    externalEvent?: ExternalEventLayerFilter;
    resource?: ResourceLayerFilter;
  };
  id: number;
  name: string;
  yAxisId: number | null;
}

/**
 * How the line between two sampled values is drawn. Only affects discretely-sampled data; a real
 * profile carries its own slope, so every mode draws it identically.
 *
 * - `step` holds each value until the next segment starts, and is the default.
 * - `linear` ramps straight from each value to the next.
 * - `smooth` ramps along a monotone curve -- monotone so it cannot overshoot a value the model never
 *   produced, which a cardinal or basis spline would.
 */
export type InterpolationMode = 'step' | 'linear' | 'smooth';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type PointShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross';

export type ShowPointsMode = 'auto' | 'always' | 'never';

/**
 * Every field beyond the three the view schema requires is optional, so a view saved before that field
 * existed stays valid. Readers supply the defaults in `utilities/timeline.ts`.
 */
export interface LineLayer extends Layer {
  fillColor?: string; // When undefined the area fill uses lineColor
  fillOpacity?: number;
  interpolation?: InterpolationMode;
  lineColor: string;
  lineStyle?: LineStyle;
  lineWidth: number;
  opacity?: number;
  pointColor?: string; // When undefined the points use lineColor
  pointRadius: number;
  pointShape?: PointShape;
  showFill?: boolean;
  showPoints?: ShowPointsMode;
}

export interface LinePoint extends Point {
  y:
    | number
    | string
    | null /* TODO this type leaves much to be desired – could make an OrdinalLinePoint and a NumericLinePoint? */;
  /**
   * Lower edge of this point's area fill when the layer is stacked: the total of the layers beneath it
   * at this x. Carried per point rather than as a parallel array because decimation reorders and thins
   * points. Undefined for an unstacked layer, which fills to one baseline for the whole series.
   */
  y0?: number | null;
}

export type MouseDown = {
  activityDirectives?: ActivityDirective[];
  e: MouseEvent;
  externalEvents?: ExternalEvent[];
  layerId?: number;
  rowId?: number;
  spans?: Span[];
  timelineId?: number;
};

export type MouseOver = {
  activityDirectives?: ActivityDirective[];
  constraintResults?: ConstraintResultWithName[];
  e: MouseEvent;
  externalEvents?: ExternalEvent[];
  gapsByLayer?: Record<number, Point[]>;
  layerId?: number; //TODO not relevant since we sometimes have multiple layers per click
  origin?: MouseOverOrigin; //TODO perhaps remove this
  pointsByLayer?: Record<number, Point[]>;
  row?: Row;
  selectedActivityDirectiveId?: ActivityDirectiveId | undefined;
  selectedExternalEventId?: ExternalEventId | undefined;
  selectedSpanId?: SpanId;
  spans?: Span[];
};

export type RowMouseOverEvent = Omit<
  MouseOver,
  'activityDirectivesByLayer' | 'externalEventsByLayer' | 'gapsByLayer' | 'pointsByLayer' | 'spansByLayer'
> & {
  activityDirectives?: ActivityDirective[];
  externalEvents?: ExternalEvent[];
  gaps?: Point[];
  points?: Point[];
  spans?: Span[];
};

export type MouseOverOrigin = 'row-header' | 'layer-line' | 'layer-discrete' | 'layer-x-range';

export interface Point {
  id: number;
  name: string;
  type: ChartType;
  x: number;
}

export type QuadtreePoint = {
  id: number;
  x: number;
  y: number;
};

export type QuadtreeRect = {
  height: number;
  id: number | string;
  width: number;
  x: number;
  y: number;
};

export type ResourceLayerFilter = string;

export type ActivityOptions = {
  // Whether or not to display only directives, only spans, or both in the row
  composition: 'directives' | 'spans' | 'both';

  // If 'directive' the activities are grouped starting with directive types, if 'flat' activities are grouped by type regardless of hierarchy
  hierarchyMode: 'directive' | 'flat';
};

// included in Discrete, bearing exclusive properties for drawing ExternalEvents
export type ExternalEventOptions = {
  // Determines whether to group the External Events by their event type, or their external source
  groupBy: 'event_type_name' | 'source_key';
};

/**
 * Shape used to mark a discrete item that occupies a single moment: a 2px full-height tick (`line`,
 * the default), a `dot`, or a `diamond` for the Gantt milestone convention.
 *
 * Every style is centered on the moment it marks, so switching between them never moves the mark --
 * `getMarkerGlyphExtents` owns that geometry. A marker therefore anchors its center to the start time,
 * where a bar anchors its left edge, since a bar represents an interval rather than a moment.
 */
export type MarkerStyle = 'line' | 'dot' | 'diamond';

/**
 * Horizontal extent of a drawn marker, in pixels either side of the item's start x, plus its drawn
 * size. See `getMarkerGlyphExtents`.
 */
export type MarkerGlyph = { left: number; right: number; size: number };

export type DiscreteOptions = {
  // Activity-Layer-specific Options
  activityOptions?: ActivityOptions;

  /**
   * Shape every activity directive is drawn with. Applied unconditionally -- a directive marks a start
   * time and has no duration to detect. Kept separate from `zeroDurationMarker` so that making
   * zero-duration spans into milestones does not also put a diamond on every directive in the plan.
   */
  directiveMarker?: MarkerStyle;

  // Describes the primary method in which external events are visualized within this row
  displayMode: 'grouped' | 'compact';

  // External-Event-Layer-specific Options
  externalEventOptions?: ExternalEventOptions;

  // Height of subrows
  height: number;

  // Item text label behavior
  labelVisibility: 'on' | 'off' | 'auto';

  /**
   * Shape for a span or external event whose duration is zero; anything with a duration keeps its bar.
   * Keyed off the data rather than rendered width, so an item does not change shape as the operator
   * zooms -- a one second span at a two week zoom is a small interval, not a moment.
   */
  zeroDurationMarker?: MarkerStyle;
};

export type Row = {
  autoAdjustHeight: boolean;
  discreteOptions: DiscreteOptions;
  expanded: boolean;
  height: number;
  horizontalGuides: HorizontalGuide[];
  id: number;
  layers: Layer[];
  name: string;
  yAxes: Axis[];
};

/**
 * One layer's contribution to a stack, resampled onto the stack's shared x grid. `y` is the running
 * total through this layer, `y0` the total beneath it; both are null where the total is unknown.
 */
export type StackedSeries = {
  layerId: number;
  resourceName: string;
  values: { x: number; y: number | null; y0: number | null }[];
};

export type TimeRange = {
  end: number;
  start: number;
};

export type Timeline = {
  id: number;
  marginLeft: number;
  marginRight: number;
  rows: Row[];
  verticalGuides: VerticalGuide[];
};

export type VerticalGuide = {
  id: number;
  label: Label;
  timestamp: string;
  /**
   * Turns the guide into a shaded time region between `timestamp` and `timestamp2`, spanning every row
   * -- an eclipse, a keep-out window. Order does not matter. Absent for an ordinary single-time guide.
   */
  timestamp2?: string;
};

export type VerticalGuideSelection = {
  group: Selection<SVGGElement, unknown, null, undefined>;
  label: Selection<SVGTextElement, unknown, null, undefined>;
};

export type XAxisTick = {
  additionalLabels: string[];
  date: Date;
  label: string;
};

/**
 * @see https://github.com/d3/d3-scale-chromatic#categorical
 */
export type XRangeLayerColorScheme =
  | 'schemeAccent'
  | 'schemeCategory10'
  | 'schemeDark2'
  | 'schemePaired'
  | 'schemePastel1'
  | 'schemePastel2'
  | 'schemeSet1'
  | 'schemeSet2'
  | 'schemeSet3'
  | 'schemeTableau10';

/**
 * Per-value overrides for one x-range layer, keyed by the resource value. A value with no entry keeps
 * the color its layer's `colorScheme` assigns it, so a partly configured map is the normal case.
 */
export type XRangeValueAppearance = {
  /** Replaces the scheme color for this value. */
  color?: string;
  /**
   * Draw nothing for this value -- no box, no label, no hover target. Not the same as a gap, which
   * means the profile had no value and is hatched by `LayerGaps`. Hiding every value but one turns the
   * layer into background shading for that state, since x-range layers paint behind the rest of a row.
   */
  hidden?: boolean;
  /**
   * Replaces the text drawn in this value's boxes. The value still decides the color and the box
   * boundaries, so shortening `SUBSYSTEM_STATE_NOMINAL` to `NOM` neither recolors it nor merges it
   * with a neighbor that shortens the same way.
   */
  label?: string;
};

/**
 * Whether an x-range box is labelled with its value. `auto` fits the text and truncates when it has
 * to; `off` is for a layer read as shape rather than text. There is no `on`: unlike a discrete row, an
 * x-range box cannot grow to fit its label.
 */
export type XRangeLabelVisibility = 'auto' | 'off';

export interface XRangeLayer extends Layer {
  colorScheme: XRangeLayerColorScheme;
  labelVisibility?: XRangeLabelVisibility;
  opacity: number;
  showAsLinePlot: boolean;
  /** Inert while `showAsLinePlot` is on, which draws the whole resource as one line in one color. */
  valueAppearance?: Record<string, XRangeValueAppearance>;
}

export interface XRangePoint extends Point {
  is_gap?: boolean;
  is_null?: boolean;
  label: Label;
  /**
   * The resource value behind this point, which colors and per-value overrides key off. Separate from
   * `label.text`, the text drawn in the box, even where the two hold the same string: conflating them
   * would color two values alike and merge them into one box. Absent on gap points.
   */
  value?: string;
}

export type TimelineItemType = ResourceType | ActivityType | ExternalEventType;

export type TimelineItemMetadata = {
  selectedFilters?: Record<string, TimelineItemListFilterOption>;
  textFilters?: string[];
};

export type TimelineItemListFilterOption = {
  color?: string;
  label: string;
  value: string | number;
};
