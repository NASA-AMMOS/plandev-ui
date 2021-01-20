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
    state?: {
      name?: string;
    };
  };
  id: string;
  type: 'activity' | 'state';
  yAxisId?: string;
}

export interface LineLayer extends Layer {
  curveType?:
    | 'curveLinear'
    | 'curveNatural'
    | 'curveStep'
    | 'curveStepAfter'
    | 'curveStepBefore';
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
  violations?: ConstraintViolation[];
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
  x?: number;
}

export interface XAxisTick {
  date: Date;
  time: string;
  yearDay: string;
}

export interface XRangeLayer extends Layer {
  color?: string;
  points?: XRangePoint[];
}

export interface XRangePoint extends Point {
  label?: Label;
}
