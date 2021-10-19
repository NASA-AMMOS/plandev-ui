import type { Timeline } from './timeline';

export interface ViewMeta {
  owner: string;
  timeCreated: number;
  timeUpdated: number;
  version: string;
}

export interface ViewSection {
  id: string;
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
  sections: ViewSection[];
}
