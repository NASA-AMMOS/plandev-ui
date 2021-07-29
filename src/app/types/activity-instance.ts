import { Parameter } from './parameter';

export interface ActivityInstance {
  children: string[];
  duration: number;
  id: string;
  parameters: Parameter[];
  parent: string | null;
  startTimestamp: string;
  type: string;
}

export interface CreateActivityInstance {
  parameters: Parameter[];
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
