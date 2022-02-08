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

type ViewMeta = {
  owner: string;
  timeCreated: number;
  timeUpdated: number;
  version: string;
};

type ViewPlan = {
  sections: ViewPlanSection[];
};

type ViewPlanSection = {
  id: number;
  iframe?: {
    src: string;
  };
  size: number;
  table?: {
    columns: string[];
    type: 'activity';
  };
  timeline?: Timeline;
  type: 'iframe' | 'table' | 'timeline';
};

type View = {
  id: number;
  meta: ViewMeta;
  name: string;
  plan: ViewPlan;
};
