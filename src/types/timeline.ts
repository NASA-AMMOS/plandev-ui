import type { Selection } from 'd3-selection';
import type { ActivityLayerFilterField, FilterOperator } from '../enums/timeline';
import type { ActivityDirective, ActivityDirectiveId, ActivityType } from './activity';
import type { ConstraintResultWithName } from './constraint';
import type { ExternalEvent, ExternalEventId, ExternalEventType } from './external-event';
import type { ValueSchema } from './schema';
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

export type DynamicFilterDataType = ValueSchema['type'] | 'tag';

export type ActivityLayerFilter = {
  dynamic_type_filters?: ActivityLayerDynamicFilter<Pick<typeof ActivityLayerFilterField, 'Type' | 'Subsystem'>>[];
  other_filters?: ActivityLayerDynamicFilter<
    Pick<typeof ActivityLayerFilterField, 'Tags' | 'Parameter' | 'SchedulingGoalId' | 'Name'>
  >[];
  static_types?: string[];
  type_subfilters?: Record<
    string,
    ActivityLayerDynamicFilter<
      Pick<typeof ActivityLayerFilterField, 'Tags' | 'Parameter' | 'SchedulingGoalId' | 'Name'>
    >[]
  >;
};
export type ExternalEventLayerFilter = {
  event_types: string[];
};

export type ActivityLayerDynamicFilter<T> = {
  field: keyof T;
  id: number;
  operator: keyof typeof FilterOperator;
  subfield?: { name: string; type: DynamicFilterDataType };
  value: string | string[] | number | number[] | boolean;
};

export type ActivityLayerFilterSubfield = { name: string; type: DynamicFilterDataType };
export type ActivityLayerFilterSubfieldSchema = ActivityLayerFilterSubfield & {
  activityTypes: string[];
  label: string;
  unit?: string;
  values?: string[];
};

export type AxisDomainFitMode = 'fitPlan' | 'fitTimeWindow' | 'manual';

export type Axis = {
  color: string;
  domainFitMode: AxisDomainFitMode;
  id: number;
  label: Label;
  renderTickLines?: boolean;
  scaleDomain?: (number | null)[];
  tickCount: number | null;
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

export interface LineLayer extends Layer {
  lineColor: string;
  lineWidth: number;
  pointRadius: number;
}

export interface LinePoint extends Point {
  y:
    | number
    | string
    | null /* TODO this type leaves much to be desired – could make an OrdinalLinePoint and a NumericLinePoint? */;
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

export type DiscreteOptions = {
  // Activity-Layer-specific Options
  activityOptions?: ActivityOptions;

  // Describes the primary method in which external events are visualized within this row
  displayMode: 'grouped' | 'compact';

  // External-Event-Layer-specific Options
  externalEventOptions?: ExternalEventOptions;

  // Height of subrows
  height: number;

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
