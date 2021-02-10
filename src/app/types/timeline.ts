import { ActivityType } from './activity-type';
import { ConstraintViolation } from './simulation';
import { StringTMap } from './string-t-map';

export interface ActivityLayer extends Layer {
  points?: ActivityPoint[];
}

export interface ActivityPoint extends Point {
  children?: ActivityPoint[];
  duration: number;
  label?: Label;
  parent: string | null;
}

export interface Axis {
  id: string;
  color?: string;
  label?: Label;
  scaleDomain?: number[];
  tickCount?: number;
}

export interface CreatePoint {
  activityType: ActivityType;
  startTimestamp: string;
  type: string;
}

export interface DeletePoint {
  id: string;
  type: string;
}

export interface HorizontalGuide {
  id: string;
  label: Label;
  y: number;
  yAxisId: string;
}

export interface HorizontalGuideEvent {
  guide?: HorizontalGuide;
  mode: 'create' | 'delete' | 'edit';
  rowId: string;
  yAxes?: Axis[];
}

export interface Label {
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  color?: string;
  fontFace?: string;
  fontSize?: number;
  hidden?: boolean;
  text: string;
}

export interface Layer {
  chartType: 'activity' | 'line' | 'x-range';
  color?: string;
  filter?: {
    activity?: {
      type?: string;
    };
    resource?: {
      name?: string;
    };
  };
  id: string;
  type: 'activity' | 'resource';
  yAxisId?: string;
}

export interface LayerEvent {
  layer?: Layer;
  mode: 'create' | 'edit';
  rowId: string;
}

export type LineCurveType =
  | 'curveLinear'
  | 'curveNatural'
  | 'curveStep'
  | 'curveStepAfter'
  | 'curveStepBefore';

export interface LineLayer extends Layer {
  curveType?: LineCurveType;
  points?: LinePoint[];
}

export interface LinePoint extends Point {
  radius?: number;
  y: number;
}

export interface MouseOverConstraintViolations {
  constraintViolations: ConstraintViolation[];
  e: MouseEvent;
}

export interface MouseOverPoints {
  e: MouseEvent;
  points: Point[];
  pointsById?: StringTMap<Point>;
}

export interface MouseSelectPoints {
  e: MouseEvent;
  points: Point[];
  pointsById?: StringTMap<Point>;
}

export interface Point {
  color?: string;
  id: string;
  selected?: boolean;
  type: 'activity' | 'line' | 'x-range';
  x: number;
}

export interface QuadtreePoint {
  id: string;
  x: number;
  y: number;
}

export interface QuadtreeRect {
  height: number;
  id: string;
  width: number;
  x: number;
  y: number;
}

export interface Row {
  autoAdjustHeight?: boolean;
  height?: number;
  horizontalGuides?: HorizontalGuide[];
  id: string;
  layers: Layer[];
  yAxes?: Axis[];
}

export interface SavePoint {
  id: string;
  type: string;
  value: any;
}

export interface SelectPoint {
  id: string;
  type: string;
}

export interface Timeline {
  id: string;
  rows: Row[];
  verticalGuides: VerticalGuide[];
}

export interface UpdatePoint {
  id: string;
  type: string;
  value: any;
}

export interface UpdateRow {
  rowId: string;
  update: any;
}

export interface VerticalGuide {
  id: string;
  label: Label;
  timestamp: string;
}

export interface VerticalGuideEvent {
  guide?: VerticalGuide;
  mode: 'create' | 'delete' | 'edit';
  timelineId: string;
}

export interface XAxisTick {
  date: Date;
  time: string;
  yearDay: string;
}

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
  | 'schemeTableau10'
  | string[];

export interface XRangeLayer extends Layer {
  colorScheme?: XRangeLayerColorScheme;
  domain?: string[];
  opacity?: number;
  points?: XRangePoint[];
}

export interface XRangePoint extends Point {
  label?: Label;
}
