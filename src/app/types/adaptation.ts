export interface Adaptation {
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
