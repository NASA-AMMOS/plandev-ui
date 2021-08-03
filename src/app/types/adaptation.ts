import { ActivityType } from './activity-type';
import { Constraint } from './constraints';
import { SimulationConfigurationSchema } from './simulation';

export interface Adaptation {
  activityTypes?: ActivityType[];
  constraints?: Constraint[];
  configurationSchema?: SimulationConfigurationSchema;
  id: string;
  mission: string;
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
