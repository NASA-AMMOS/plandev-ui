import { ActivityType } from './activity-type';

export interface Adaptation {
  activityTypes?: ActivityType[];
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
