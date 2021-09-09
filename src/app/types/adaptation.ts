import { ActivityType } from './activity-type';
import { Constraint } from './constraints';
import { SimulationModelParameters } from './simulation';

export interface Adaptation {
  activityTypes?: ActivityType[];
  constraints?: Constraint[];
  id: string;
  mission: string;
  modelParameters?: SimulationModelParameters;
  name: string;
  owner: string;
  version: string;
}

export interface CreateAdaptation {
  file: File;
  mission: string;
  name: string;
  owner: string;
  version: string;
}

export interface CreateAdaptationResponse {
  id: string | null;
  message: string | null;
  success: boolean;
}

export interface DeleteAdaptationResponse {
  message: string | null;
  success: boolean;
}
