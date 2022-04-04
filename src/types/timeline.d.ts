interface ActivityLayer extends Layer {
  activityColor: string;
  activityHeight: number;
}

type ActivityLayerFilter = {
  type: string;
};

interface ActivityPoint extends Point {
  children: ActivityPoint[];
  duration: number;
  label: Label;
  parent: number | null;
}

type Axis = {
  color: string;
  id: number;
  label: Label;
  scaleDomain: (number | null)[];
  tickCount: number | null;
};

type HorizontalGuide = {
  id: number;
  label: Label;
  y: number;
  yAxisId: number;
};

type Label = {
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  color?: string;
  fontFace?: string;
  fontSize?: number;
  hidden?: boolean;
  text: string;
};

interface Layer {
  chartType: 'activity' | 'line' | 'x-range';
  filter: {
    activity?: ActivityLayerFilter;
    resource?: ResourceLayerFilter;
  };
  id: number;
  yAxisId: number | null;
}

interface LineLayer extends Layer {
  lineColor: string;
  lineWidth: number;
  pointRadius: number;
}

interface LinePoint extends Point {
  radius: number;
  y: number;
}

type MouseDown = {
  e: MouseEvent;
  layerId: number;
  points: Point[];
  rowId: number;
  timelineId: number;
  yAxisId: number | null;
};

type MouseOver = {
  e: MouseEvent;
  layerId: number;
  points: Point[];
};

interface Point {
  id: number;
  name: string;
  selected: boolean;
  type: 'activity' | 'line' | 'x-range';
  x: number;
}

type QuadtreePoint = {
  id: number;
  x: number;
  y: number;
};

type QuadtreeRect = {
  height: number;
  id: number;
  width: number;
  x: number;
  y: number;
};

type ResourceLayerFilter = {
  name: string;
};

type Row = {
  autoAdjustHeight: boolean;
  height: number;
  horizontalGuides: HorizontalGuide[];
  id: number;
  layers: Layer[];
  yAxes: Axis[];
};

type TimeRange = {
  end: number;
  start: number;
};

type Timeline = {
  id: number;
  marginLeft: number;
  marginRight: number;
  rows: Row[];
  verticalGuides: VerticalGuide[];
};

type VerticalGuide = {
  id: number;
  label: Label;
  timestamp: string;
};

type VerticalGuideSelection = {
  group: import('d3-selection').Selection<SVGGElement, unknown, null, undefined>;
  label: import('d3-selection').Selection<SVGTextElement, unknown, null, undefined>;
};

type XAxisTick = {
  date: Date;
  time: string;
  yearDay: string;
};

/**
 * @see https://github.com/d3/d3-scale-chromatic#categorical
 */
type XRangeLayerColorScheme =
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

interface XRangeLayer extends Layer {
  colorScheme: XRangeLayerColorScheme;
  opacity: number;
}

interface XRangePoint extends Point {
  label: Label;
}
