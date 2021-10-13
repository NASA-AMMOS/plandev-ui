import type { ArgumentsMap, ParametersMap } from '.';

export type ActivityType = {
  name: string;
  parameters: ParametersMap;
};

export type Activity = {
  arguments: ArgumentsMap;
  children: string[] | null;
  duration: number | null;
  id: string;
  parent: string | null;
  startTime: string;
  type: string;
};

export type ActivitiesMap = { [id: string]: Activity };

export type NewActivity = {
  arguments: ArgumentsMap;
  startTime: string;
  type: string;
};

export type UpdateActivity = { id: string } & Partial<Activity>;
