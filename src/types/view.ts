import type { ColDef, ColumnState } from 'ag-grid-community';
import type { Timeline } from './timeline';

export type ViewActivityTable = {
  columnDefs: ColDef[];
  columnStates: ColumnState[];
  id: number;
};

export type ViewSaveEvent = Partial<View>;

export type ViewIFrame = {
  id: number;
  src: string;
  title: string;
};

export type ViewInsertInput = {
  definition: ViewDefinition;
  name: string;
  owner: string;
};

export type ViewGridComponent =
  | 'ActivityFormPanel'
  | 'ActivityTablePanel'
  | 'ActivityTypesPanel'
  | 'ConstraintViolationsPanel'
  | 'ConstraintsPanel'
  | 'ExpansionPanel'
  | 'IFramePanel'
  | 'SchedulingConditionsPanel'
  | 'SchedulingGoalsPanel'
  | 'SimulationPanel'
  | 'TimelineEditorPanel'
  | 'ViewEditorPanel';

export type ViewGridSection = 'LeftBottom' | 'LeftTop' | 'MiddleBottom' | 'RightBottom' | 'RightTop';

export type ViewGrid = {
  columnSizes: string;
  leftComponentBottom: ViewGridComponent;
  leftComponentTop: ViewGridComponent;
  leftHidden: boolean;
  leftRowSizes: string;
  leftSplit: boolean;
  middleComponentBottom: ViewGridComponent;
  middleRowSizes: string;
  middleSplit: boolean;
  rightComponentBottom: ViewGridComponent;
  rightComponentTop: ViewGridComponent;
  rightHidden: boolean;
  rightRowSizes: string;
  rightSplit: boolean;
};

export type ViewDefinition = {
  plan: {
    activityTables: ViewActivityTable[];
    grid: ViewGrid;
    iFrames: ViewIFrame[];
    timelines: Timeline[];
  };
};

export type View = {
  created_at: string;
  definition: ViewDefinition;
  id: number;
  name: string;
  owner: string;
  updated_at: string;
};
