import { Timeline } from './timeline';

export type PanelMenuItemAction = 'link' | 'restore' | 'simulate';

export interface PanelMenuItem {
  action: PanelMenuItemAction;
  data?: {
    url?: string;
  };
  icon: string;
  title: string;
}

export interface Panel {
  id: string;
  iframe?: {
    src: string;
  };
  menu?: PanelMenuItem[];
  size: number;
  table?: {
    columns: string[];
    type: 'activity';
  };
  timeline?: Timeline;
  title: string;
  type: 'iframe' | 'table' | 'timeline';
}

export interface UiState {
  id: string;
  name: string;
  panels: Panel[];
}
