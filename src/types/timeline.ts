export interface ActivityLayer extends Layer {
  activityColor: string;
  activityHeight: number;
}

export interface ActivityLayerFilter {
  type: string;
}

export interface ActivityPoint extends Point {
  children?: ActivityPoint[];
  duration: number;
  label?: Label;
  parent: string | null;
}

export interface Axis {
  color: string;
  id: number;
  label: Label;
  scaleDomain: (number | null)[];
  tickCount: number | null;
}

export interface DropActivity {
  activityTypeName: string;
  startTime: string;
}

export interface HorizontalGuide {
  id: number;
  label: Label;
  y: number;
  yAxisId: number;
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

export interface MouseDown {
  e: MouseEvent;
  layerId: number;
  points: Point[];
  rowId: number;
  timelineId: number;
  yAxisId: number | null;
}

export interface MouseOver {
  e: MouseEvent;
  layerId: number;
  points: Point[];
}

export interface Point {
  id: number;
  name: string;
  selected: boolean;
  type: 'activity' | 'line' | 'x-range';
  x: number;
}

export interface QuadtreePoint {
  id: number;
  x: number;
  y: number;
}

export interface QuadtreeRect {
  height: number;
  id: number;
  width: number;
  x: number;
  y: number;
}

export interface ResourceLayerFilter {
  name: string;
}

export interface Row {
  autoAdjustHeight: boolean;
  height: number;
  horizontalGuides: HorizontalGuide[];
  id: number;
  layers: Layer[];
  yAxes: Axis[];
}

export interface Timeline {
  id: number;
  marginLeft: number;
  marginRight: number;
  rows: Row[];
  verticalGuides: VerticalGuide[];
}

export interface VerticalGuide {
  id: number;
  label: Label;
  timestamp: string;
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
  colorScheme: XRangeLayerColorScheme;
  opacity: number;
}

export interface XRangePoint extends Point {
  label: Label;
}
