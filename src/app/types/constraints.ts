import { TimeRange } from './time-range';

export type ConstraintAssociation = 'adaptation' | 'plan';

export interface Constraint {
  association: ConstraintAssociation;
  definition: string;
  name: string;
}

export interface ConstraintViolation {
  associations: ConstraintViolationAssociations;
  constraint: Constraint;
  windows: TimeRange[];
}

export interface ConstraintViolationAssociations {
  activityInstanceIds?: string[];
  resourceIds?: string[];
}

export interface UpdateConstraintsResponse {
  message: string;
  success: boolean;
}
