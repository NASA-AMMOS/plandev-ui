export type ActivityTypeParameter = {
  default: any;
  name: string;
  schema: any;
};

export type ActivityType = {
  name: string;
  parameters: ActivityTypeParameter[];
};
