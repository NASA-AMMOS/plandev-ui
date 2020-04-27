import { ActivityInstance } from './activity-instance';
import { Adaptation } from './adaptation';

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

export interface PlanDetail {
  activityInstances: ActivityInstance[];
  adaptation: Adaptation;
  adaptationId: string;
  endTimestamp: string;
  id: string;
  name: string;
  startTimestamp: string;
}
