export interface Axis {
  labelFillColor: string;
  labelFontSize: number;
  labelOffset: string;
  labelText: string;
  scaleDomain: number[];
}

export interface Band {
  height: number;
  id: string;
  order: number;
  subBands: SubBand[];
  yAxis: Axis;
}

export interface DeletePoint {
  id: string;
  type: string;
}

export interface Point {
  color: string;
  id: string;
  selected: boolean;
  type: string;
  x: number;
}

export interface PointActivity extends Point {
  duration: number;
  labelAlign: CanvasTextAlign;
  labelBaseline: CanvasTextBaseline;
  labelFillColor: string;
  labelFont: string;
  labelFontSize: number;
  labelHidden: boolean;
  labelText: string;
}

export interface PointLine extends Point {
  radius: number;
  y: number;
}

export interface PointXRange extends Point {
  duration: number;
  labelFillColor: string;
  labelFont: string;
  labelFontSize: number;
  labelText: string;
}

export interface SubBand {
  id: string;
  type: string;
}

export interface SubBandActivity extends SubBand {
  layout: string;
  points: PointActivity[];
}

export interface SubBandLine extends SubBand {
  points: PointLine[];
}

export interface SubBandXRange extends SubBand {
  points: PointXRange[];
}

export interface UpdatePoint {
  id: string;
  type: string;
  value: any;
}
