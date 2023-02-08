import type { ColDef, ColumnState } from 'ag-grid-community';
import type { Grid } from './grid';
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

export type ViewDefinition = {
  plan: {
    activityTables: ViewActivityTable[];
    iFrames: ViewIFrame[];
    layout: Grid;
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
