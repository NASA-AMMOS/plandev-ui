import type { Parameter } from './parameter';

export type Activity = {
  children: string[] | null;
  duration: number | null;
  id: string;
  parameters: Parameter[];
  parent: string | null;
  startTimestamp: string;
  type: string;
};

export type NewActivity = {
  parameters: Parameter[];
  startTimestamp: string;
  type: string;
};

export type UpdateActivity = { id: string } & Partial<Activity>;
