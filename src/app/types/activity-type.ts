export interface ActivityTypeParameter {
  default: any;
  name: string;
  schema: any;
}

export interface ActivityType {
  name: string;
  parameters: ActivityTypeParameter[];
}
