import type { Selection } from 'd3-selection';
import type { ActivityId, ActivityUniqueId } from './activity';

export interface ActivityLayer extends Layer {
  activityColor: string;
  activityHeight: number;
}

export type ActivityLayerFilter = {
  type: string;
};

export interface ActivityPoint extends Point {
  children: ActivityPoint[];
  duration: number;
  label: Label;
  parentUniqueId: ActivityUniqueId | null;
  parent_id: ActivityId | null;
  unfinished: boolean;
  uniqueId: string;
}

export type Axis = {
  color: string;
  id: number;
  label: Label;
  scaleDomain: (number | null)[];
  tickCount: number | null;
};

export type BoundingBox = {
  maxX: number;
  maxY: number;
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

export interface Layer {
  chartType: 'activity' | 'line' | 'x-range';
  filter: {
    activity?: ActivityLayerFilter;
    resource?: ResourceLayerFilter;
  };
  id: number;
  yAxisId: number | null;
}

export interface LineLayer extends Layer {
  lineColor: string;
  lineWidth: number;
  pointRadius: number;
}

export interface LinePoint extends Point {
  radius: number;
  y: number;
}

export type MouseDown = {
  e: MouseEvent;
  layerId: number;
  points: Point[];
  rowId: number;
  timelineId: number;
  yAxisId: number | null;
};

export type MouseOver = {
  e: MouseEvent;
  layerId: number;
  points: Point[];
};

export interface Point {
  id: number;
  name: string;
  type: 'activity' | 'line' | 'x-range';
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

export type ResourceLayerFilter = {
  name: string;
};

export type Row = {
  autoAdjustHeight: boolean;
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
  coarseTime: string;
  date: Date;
  fineTime: string;
  hideLabel: boolean;
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
}

export interface XRangePoint extends Point {
  label: Label;
}
