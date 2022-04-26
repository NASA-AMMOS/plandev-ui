type GridComponentName =
  | 'ActivityForm'
  | 'ActivityTable'
  | 'ActivityTypes'
  | 'ConstraintEditor'
  | 'Constraints'
  | 'ConstraintViolations'
  | 'IFrame'
  | 'SchedulingEditor'
  | 'Scheduling'
  | 'Simulation'
  | 'Timeline'
  | 'TimelineForm'
  | 'ViewEditor'
  | 'Views';

type GridComponent = {
  activityTableId?: number;
  componentName: GridComponentName;
  gridName?: GridName;
  iFrameId?: number;
  id: number;
  timelineId?: number;
  type: 'component';
};

type GridColumns = {
  gridName?: GridName;
  id: number;
  columns: Grid[];
  columnSizes: string;
  type: 'columns';
};

type GridGutter = {
  gridName?: GridName;
  id: number;
  track: number;
  type: 'gutter';
};

type GridName = 'Activities' | 'Constraints' | 'Custom' | 'Scheduling' | 'Simulation' | 'Timeline' | 'Views';

type GridRows = {
  gridName?: GridName;
  id: number;
  rows: Grid[];
  rowSizes: string;
  type: 'rows';
};

type Grid = GridColumns | GridComponent | GridGutter | GridRows;
