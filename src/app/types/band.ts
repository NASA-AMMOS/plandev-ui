import { ActivityType } from './activity-type';

export interface Axis {
  id: string;
  color?: string;
  label?: Label;
  scaleDomain?: number[];
  tickCount?: number;
}

export interface Band {
  height?: number;
  horizontalGuides?: Guide[];
  id: string;
  subBands: SubBand[];
  yAxes?: Axis[];
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

export interface Guide {
  bandId?: string;
  color?: string;
  id: string;
  label: Label;
  position?: number;
  time?: number;
  timestamp?: string;
  type: 'horizontal' | 'vertical';
  width?: number;
}

export interface GuideDialogData {
  bandId?: string;
  guide?: Guide;
  maxPosition: number;
  mode: 'create' | 'edit';
  type: 'horizontal' | 'vertical';
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

export interface Point {
  color?: string;
  id: string;
  selected?: boolean;
  type: 'activity' | 'line' | 'x-range';
  x: number;
}

export interface PointActivity extends Point {
  duration: number;
  label?: Label;
}

export interface PointLine extends Point {
  radius?: number;
  y: number;
}

export interface PointXRange extends Point {
  duration: number;
  label?: Label;
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

export interface SubBand {
  chartType: 'activity' | 'line' | 'x-range';
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
}

export type SubBandWithPoints = SubBandActivity | SubBandLine | SubBandXRange;

export interface SubBandActivity extends SubBand {
  layout?: string;
  points?: PointActivity[];
}

export interface SubBandLine extends SubBand {
  color?: string;
  interpolationType?: string;
  points?: PointLine[];
  yAxisId: string;
}

export interface SubBandXRange extends SubBand {
  points?: PointXRange[];
}

export interface UpdatePoint {
  id: string;
  type: string;
  value: any;
}
