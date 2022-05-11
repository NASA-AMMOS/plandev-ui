type GridChangeSizesEvent = {
  gridId: number;
  newSizes: string;
};

type GridComponent = {
  activityTableId?: number;
  componentName: string;
  gridName?: string;
  iFrameId?: number;
  id: number;
  props?: unknown;
  timelineId?: number;
  type: 'component';
};

type GridColumns = {
  gridName?: string;
  id: number;
  columns: Grid[];
  columnSizes: string;
  type: 'columns';
};

type GridGutter = {
  gridName?: string;
  id: number;
  track: number;
  type: 'gutter';
};

type GridRows = {
  gridName?: string;
  id: number;
  rows: Grid[];
  rowSizes: string;
  type: 'rows';
};

type Grid = GridColumns | GridComponent | GridGutter | GridRows;
