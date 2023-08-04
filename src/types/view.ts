import type { ColDef, ColumnState } from 'ag-grid-community';
import type { UserId } from './app';
import type { Timeline } from './timeline';

export type ViewTable = {
  columnDefs: ColDef[];
  columnStates: ColumnState[];
};

export type ViewSaveEvent = Partial<View>;
export type ViewToggleType = 'left' | 'left-split' | 'bottom' | 'right' | 'right-split';
export type ViewToggleEvent = {
  state: boolean;
  type: ViewToggleType;
  update?: Partial<ViewGrid>;
};

export type ViewIFrame = {
  id: number;
  src: string;
  title: string;
};

export type ViewInsertInput = {
  definition: ViewDefinition;
  name: string;
};
export type ViewUpdateInput = ViewInsertInput;

export type ViewGridComponent =
  | 'ActivityDirectivesTablePanel'
  | 'ActivityFormPanel'
  | 'ActivitySpansTablePanel'
  | 'ActivityTypesPanel'
  | 'ConstraintsPanel'
  | 'ExpansionPanel'
  | 'IFramePanel'
  | 'PlanMetadataPanel'
  | 'SchedulingConditionsPanel'
  | 'SchedulingGoalsPanel'
  | 'SimulationPanel'
  | 'TimelineEditorPanel';

export type ViewGridSection = 'LeftBottom' | 'LeftTop' | 'MiddleBottom' | 'RightBottom' | 'RightTop';

export type ViewGridColumns = {
  col1?: string;
  col2?: string;
  col3?: string;
};

export type ViewGridRows = {
  row1?: string;
  row2?: string;
};

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
    activityDirectivesTable: ViewTable;
    activitySpansTable: ViewTable;
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
  owner: UserId;
  updated_at: string;
};
