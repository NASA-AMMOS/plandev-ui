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
  props?: any;
  timelineId?: number;
  type: 'component';
};

type GridColumns = {
  columnSizes: string;
  columns: Grid[];
  gridName?: string;
  id: number;
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
  rowSizes: string;
  rows: Grid[];
  type: 'rows';
};

type Grid = GridColumns | GridComponent | GridGutter | GridRows;

type DataGridColumnDef = import('ag-grid-community').ColDef;

type TRowData = any;

interface ICellRendererParams {
  data: TRowData;
}
