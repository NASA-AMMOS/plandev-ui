type ActivityId = number;

type ActivityType = {
  name: string;
  parameters: ParametersMap;
};

type Activity = {
  arguments: ArgumentsMap;
  children: string[] | null;
  duration: number | null;
  id: ActivityId;
  parent: string | null;
  startTime: string;
  type: string;
};

type ActivitiesMap = Record<ActivityId, Activity>;

type CreateActivity = Pick<Activity, 'arguments' | 'startTime' | 'type'>;

type CreateActivityResponse = {
  ids: ActivityId[];
  message: string;
  success: boolean;
};

type UpdateActivity = { id: ActivityId } & Partial<Activity>;

type UpdateActivityInput = {
  arguments?: ArgumentsMap;
  start_offset?: string;
};
