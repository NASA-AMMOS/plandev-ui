type CreateViewResponse = {
  errors: any[] | null;
  message: string;
  success: boolean;
  view: View | null;
};

type DeleteViewResponse = {
  message: string;
  nextView: View | null;
  success: boolean;
};

type GetViewResponse = {
  message: string;
  success: boolean;
  view: View | null;
};

type UpdateViewResponse = {
  errors: any[] | null;
  message: string;
  success: boolean;
};

type ViewActivityTable = {
  columnDefs: ColumnDef[];
  id: number;
};

type ViewIFrame = {
  id: number;
  src: string;
  title: string;
};

type ViewMeta = {
  owner: string;
  timeCreated: number;
  timeUpdated: number;
  version: string;
};

type ViewPlan = {
  activityTables: ViewActivityTable[];
  iFrames: ViewIFrame[];
  layout: Grid;
  timelines: Timeline[];
};

type View = {
  id: number;
  meta: ViewMeta;
  name: string;
  plan: ViewPlan;
};
