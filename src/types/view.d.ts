type ViewActivityTable = {
  columnDefs: import('ag-grid-community').ColDef[];
  columnStates: import('ag-grid-community').ColumnState[];
  id: number;
};

type ViewIFrame = {
  id: number;
  src: string;
  title: string;
};

type ViewInsertInput = {
  definition: ViewDefinition;
  name: string;
  owner: string;
};

type ViewDefinition = {
  plan: {
    activityTables: ViewActivityTable[];
    iFrames: ViewIFrame[];
    layout: Grid;
    timelines: Timeline[];
  };
};

type View = {
  created_at: string;
  definition: ViewDefinition;
  id: number;
  name: string;
  owner: string;
  updated_at: string;
};
