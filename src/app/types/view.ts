import { Timeline } from './timeline';

export type ViewSectionMenuItemAction = 'link' | 'restore' | 'simulate';

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
  name: string;
  sections: ViewSection[];
}
