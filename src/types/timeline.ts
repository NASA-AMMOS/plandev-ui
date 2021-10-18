export interface ActivityLayer extends Layer {
  points?: ActivityPoint[];
}

export interface ActivityLayerFilter {
  type?: string;
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

export interface DropActivity {
  activityTypeName: string;
  startTime: string;
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
    activity?: ActivityLayerFilter;
    resource?: ResourceLayerFilter;
  };
  id: string;
  yAxisId?: string;
}

export interface LayerEvent {
  layer?: Layer;
  mode: 'create' | 'edit';
  rowId: string;
}

export interface LineLayer extends Layer {
  points?: LinePoint[];
}

export interface LinePoint extends Point {
  radius?: number;
  y: number;
}

export interface MouseDown {
  e: MouseEvent;
  layerId: string;
  points: Point[];
  rowId: string;
  timelineId: string;
}

export interface MouseOver {
  e: MouseEvent;
  layerId: string;
  points: Point[];
}

export interface Point {
  color?: string;
  id: string;
  name: string;
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

export interface ResourceLayerFilter {
  name?: string;
}

export interface Row {
  autoAdjustHeight?: boolean;
  height?: number;
  horizontalGuides?: HorizontalGuide[];
  id: string;
  layers: Layer[];
  yAxes?: Axis[];
}

export interface Timeline {
  id: string;
  marginLeft: number;
  marginRight: number;
  rows: Row[];
  verticalGuides: VerticalGuide[];
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
  | 'schemeTableau10';

export interface XRangeLayer extends Layer {
  colorScheme?: XRangeLayerColorScheme;
  domain?: string[];
  opacity?: number;
  points?: XRangePoint[];
}

export interface XRangePoint extends Point {
  label?: Label;
}
