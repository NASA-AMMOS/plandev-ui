export interface ActivityInstance {
  id: string;
  parameters: ActivityInstanceParameter[];
  startTimestamp: string;
  type: string;
}

export interface ActivityInstanceFormParameter {
  name: string;
  type: string;
  value: any;
}

export interface ActivityInstanceParameter {
  name: string;
  value: any;
}

export interface CreateActivityInstance {
  parameters: ActivityInstanceParameter[];
  startTimestamp: string;
  type: string;
}

export interface CreateActivityInstancesResponse {
  ids: string[];
  message: string | null;
  success: boolean;
}

export interface DeleteActivityInstanceResponse {
  message: string | null;
  success: boolean;
}

export type UpdateActivityInstance = { id: string } & Partial<
  CreateActivityInstance
>;

export interface UpdateActivityInstanceResponse {
  message: string | null;
  success: boolean;
}

export interface ValidationResponse {
  errors: string[] | null;
  success: boolean;
}
