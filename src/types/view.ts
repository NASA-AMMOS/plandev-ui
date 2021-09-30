import type { Timeline } from './timeline';

export type ViewSectionMenuItemAction = 'link' | 'restore' | 'simulate';

export interface ViewMeta {
  owner: string;
  timeCreated: number;
  timeUpdated: number;
}

export interface ViewSectionMenuItem {
  action: ViewSectionMenuItemAction;
  data?: {
    url?: string;
  };
  icon: string;
  title: string;
}

export interface ViewSection {
  id: string;
  iframe?: {
    src: string;
  };
  menu?: ViewSectionMenuItem[];
  size: number;
  table?: {
    columns: string[];
    type: 'activity';
  };
  timeline?: Timeline;
  title: string;
  type: 'iframe' | 'table' | 'timeline';
}

export interface View {
  id: string;
  meta: ViewMeta;
  name: string;
  sections: ViewSection[];
}
