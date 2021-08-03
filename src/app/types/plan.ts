import { ActivityInstance } from './activity-instance';
import { Adaptation } from './adaptation';
import { Constraint } from './constraints';
import { SimulationConfiguration } from './simulation';

export interface CreatePlan {
  adaptationId: string;
  configuration: any;
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
  configuration: SimulationConfiguration;
  constraints: Constraint[];
  endTimestamp: string;
  id: string;
  name: string;
  startTimestamp: string;
}

export interface UpdatePlanConfigurationResponse {
  message: string;
  success: boolean;
}
