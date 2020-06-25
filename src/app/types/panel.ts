import { Band, Guide } from './band';

export type PanelMenuItemAction = 'restore' | 'simulate';

export interface PanelMenuItem {
  action: PanelMenuItemAction;
  icon: string;
  title: string;
}

export interface Panel {
  bands?: Band[];
  id: string;
  menu?: PanelMenuItem[];
  table?: {
    columns: string[];
    type: 'activity';
  };
  title: string;
  type: 'table' | 'timeline';
  verticalGuides?: Guide[];
}
