import type { ArgumentsMap, ParametersMap } from '.';

export type ActivityType = {
  name: string;
  parameters: ParametersMap;
};

export type Activity = {
  arguments: ArgumentsMap;
  children: string[] | null;
  duration: number | null;
  id: number;
  parent: string | null;
  startTime: string;
  type: string;
};

export type ActivitiesMap = { [id: number]: Activity };

export type CreateActivity = Pick<Activity, 'arguments' | 'startTime' | 'type'>;

export type UpdateActivity = { id: number } & Partial<Activity>;
