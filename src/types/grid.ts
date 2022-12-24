export type GridChangeSizesEvent = {
  gridId: number;
  newSizes: string;
};

export type GridComponent = {
  activityTableId?: number;
  componentName: string;
  gridName?: string;
  iFrameId?: number;
  id: number;
  props?: any;
  timelineId?: number;
  type: 'component';
};

export type GridColumns = {
  columnSizes: string;
  columns: Grid[];
  gridName?: string;
  id: number;
  type: 'columns';
};

export type GridGutter = {
  gridName?: string;
  id: number;
  track: number;
  type: 'gutter';
};

export type GridRows = {
  gridName?: string;
  id: number;
  rowSizes: string;
  rows: Grid[];
  type: 'rows';
};

export type Grid = GridColumns | GridComponent | GridGutter | GridRows;
