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
 * How an axis maps values to pixels.
 *
 * 'log' is backed by d3's symlog rather than its log scale. A true log scale has no position for zero
 * or for negative values, and mission resources routinely sit at zero (power off, buffer empty), so a
 * true log axis silently drops those samples. Symlog is logarithmic away from zero and linear through
 * it, so every sample gets a position. With the constant derived from the data (see getLogConstant)
 * its decade spacing matches a true log scale to within a pixel except in the lowest decade.
 */
export type AxisScaleType = 'linear' | 'log';

/**
 * Any numeric y scale an axis can produce. Both are d3 continuous scales, so they are callable and
 * share domain/range/ticks/invert -- callers that only map values to pixels need not branch on which
 * one they were handed.
 */
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
   * Stacks this axis's line layers on each other instead of overlaying them, bottom-up in layer
   * order, so the topmost layer's line is the total. On the axis rather than on the layer because
   * only series sharing a scale can meaningfully be summed, and because the axis domain has to become
   * the stack total rather than the largest single series.
   */
  stack?: boolean;
  tickCount: number | null;
};

/**
 * An Axis with the fields derived at render time rather than stored in the view. Kept as a separate
 * type, and deliberately not folded into Axis, so it is obvious these must never be written back into
 * a view definition -- the schema sets additionalProperties: false and would reject them. Deriving
 * rather than persisting also means the value cannot go stale when the underlying data changes.
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
 * How the line between two sampled values is drawn.
 *
 * Only affects discretely-sampled data, which is piecewise constant and therefore arrives as a pair
 * of values per segment. Real-valued profiles already carry their own slope, so every mode draws
 * them identically.
 *
 * - `step` holds each value until the next segment starts (a staircase). The default, and how every
 *   resource was drawn before this option existed.
 * - `linear` ramps straight from each value to the next.
 * - `smooth` ramps along a monotone curve. Monotone specifically: it cannot overshoot a value the
 *   model never produced, which a cardinal or basis spline would.
 */
export type InterpolationMode = 'step' | 'linear' | 'smooth';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type PointShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'cross';

export type ShowPointsMode = 'auto' | 'always' | 'never';

export interface LineLayer extends Layer {
  fillColor?: string; // When undefined the area fill uses lineColor
  fillOpacity: number;
  interpolation?: InterpolationMode;
  lineColor: string;
  lineStyle?: LineStyle;
  lineWidth: number;
  opacity?: number;
  pointColor?: string; // When undefined the points use lineColor
  pointRadius: number;
  pointShape?: PointShape;
  showFill: boolean;
  showPoints?: ShowPointsMode;
}

export interface LinePoint extends Point {
  y:
    | number
    | string
    | null /* TODO this type leaves much to be desired – could make an OrdinalLinePoint and a NumericLinePoint? */;
  /**
   * Lower edge of this point's area fill, when the layer is part of a stack: the cumulative total of
   * the layers beneath it at this x. Undefined for an unstacked layer, which fills to a single
   * baseline for the whole series instead. Carried per point rather than as a parallel array because
   * decimation reorders and thins points, which breaks index correspondence.
   */
  y0?: number | null;
}

/**
 * One layer's contribution to a stack, resampled onto the stack's shared x grid.
 *
 * `y` is the running total through this layer and `y0` the running total beneath it, so a layer fills
 * between them and the topmost layer's `y` is the stack total. Both are null where the total is
 * unknown -- see `stackLineLayerValues`.
 */
export type StackedSeries = {
  layerId: number;
  resourceName: string;
  values: { x: number; y: number | null; y0: number | null }[];
};

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
 * How an *instant* is marked -- an activity directive's start, or a span or external event whose
 * duration is zero. Anything with a duration keeps its bar.
 *
 * - `line` is the 2px full-height tick every discrete item has always been drawn with, and the
 *   default. Its left edge sits on the instant, reading as a boundary marker.
 * - `dot` is the "represent it as an event" shape, centered on the instant.
 * - `diamond` is the Gantt milestone convention for a zero-duration item, also centered.
 */
export type InstantStyle = 'line' | 'dot' | 'diamond';

export type DiscreteOptions = {
  // Activity-Layer-specific Options
  activityOptions?: ActivityOptions;

  // Describes the primary method in which external events are visualized within this row
  displayMode: 'grouped' | 'compact';

  // External-Event-Layer-specific Options
  externalEventOptions?: ExternalEventOptions;

  // Height of subrows
  height: number;

  // Marker shape for items with no duration
  instantStyle?: InstantStyle;

  // Item text label behavior
  labelVisibility: 'on' | 'off' | 'auto';
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

export interface XRangeLayer extends Layer {
  colorScheme: XRangeLayerColorScheme;
  opacity: number;
  showAsLinePlot: boolean;
}

export interface XRangePoint extends Point {
  is_gap?: boolean;
  is_null?: boolean;
  label: Label;
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
