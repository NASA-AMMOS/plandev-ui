import type { Timeline } from './timeline';

export type CreateViewResponse = {
  message: string;
  success: boolean;
  view: View | null;
};

export type DeleteViewResponse = {
  message: string;
  nextView: View | null;
  success: boolean;
};

export type GetViewResponse = {
  message: string;
  success: boolean;
  view: View | null;
};

export type UpdateViewResponse = {
  message: string;
  success: boolean;
};

export type ViewMeta = {
  owner: string;
  timeCreated: number;
  timeUpdated: number;
  version: string;
};

export type ViewPlan = {
  sections: ViewPlanSection[];
};

export interface ViewPlanSection {
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
}

export interface View {
  id: string;
  meta: ViewMeta;
  name: string;
  plan: ViewPlan;
}
