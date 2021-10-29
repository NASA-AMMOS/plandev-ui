import type { Timeline } from './timeline';

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
