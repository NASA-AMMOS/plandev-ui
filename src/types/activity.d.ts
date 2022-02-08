type ActivityType = {
  name: string;
  parameters: ParametersMap;
};

type Activity = {
  arguments: ArgumentsMap;
  children: string[] | null;
  duration: number | null;
  id: number;
  parent: string | null;
  startTime: string;
  type: string;
};

type ActivitiesMap = { [id: number]: Activity };

type CreateActivity = Pick<Activity, 'arguments' | 'startTime' | 'type'>;

type CreateActivityResponse = {
  ids: string[];
  message: string;
  success: boolean;
};

type UpdateActivity = { id: number } & Partial<Activity>;

type UpdateActivityInput = {
  arguments?: ArgumentsMap;
  start_offset?: string;
};
