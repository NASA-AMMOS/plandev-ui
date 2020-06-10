import { TimeRange } from './time-range';

export interface Associations {
  activityInstanceIds?: string[];
  stateIds?: string[];
}

export interface Constraint {
  category: string;
  message: string;
  name: string;
  id: string;
}

export interface Violation {
  associations?: Associations;
  constraint: Constraint;
  windows: TimeRange[];
}
