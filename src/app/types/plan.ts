import { SActivityInstance } from './activity-instance';
import { StringTMap } from './string-t-map';

export interface CreatePlan {
  adaptationId: string;
  endTimestamp: string;
  name: string;
  startTimestamp: string;
}

export interface CreatePlanResponse {
  id: string | null;
  message: string | null;
  success: boolean;
}

export interface DeletePlanResponse {
  message: string | null;
  success: boolean;
}

export interface Plan {
  adaptationId: string;
  endTimestamp: string;
  id: string;
  name: string;
  startTimestamp: string;
}

export interface CPlan {
  activityInstanceIds: string[];
  adaptationId: string;
  endTimestamp: string;
  id: string;
  name: string;
  startTimestamp: string;
}
export type CPlanMap = StringTMap<CPlan>;

export interface SPlan {
  activityInstances: StringTMap<SActivityInstance>;
  adaptationId: string;
  endTimestamp: string;
  name: string;
  startTimestamp: string;
}
export type SPlanMap = StringTMap<SPlan>;
