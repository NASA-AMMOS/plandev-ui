export interface ActivityInstance {
  children: string[];
  duration: number;
  id: string;
  parameters: ActivityInstanceParameter[];
  parent: string | null;
  startTimestamp: string;
  type: string;
}

export type ActivityInstanceFormParameterType =
  | 'boolean'
  | 'duration'
  | 'int'
  | 'real'
  | 'series'
  | 'string'
  | 'struct'
  | 'variant';

export interface ActivityInstanceFormParameter {
  error: string | null;
  loading: boolean;
  name: string;
  schema: any;
  type: ActivityInstanceFormParameterType;
  value: any;
}

export interface ActivityInstanceFormParameterChange {
  newValue: any;
  parameter: ActivityInstanceFormParameter;
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

export type UpdateActivityInstance = {
  id: string;
} & Partial<CreateActivityInstance>;

export interface UpdateActivityInstanceResponse {
  message: string | null;
  success: boolean;
}

export interface ValidationResponse {
  errors: string[] | null;
  success: boolean;
}
