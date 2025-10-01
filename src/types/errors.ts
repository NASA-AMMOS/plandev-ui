import type { ErrorTypes } from '../utilities/errors';
import type { ConstraintResult, UserCodeError } from './constraint';

export type LogLevel = 'error' | 'warn' | 'info';

export interface BaseError {
  cause?: string; // longer human-readable string, explaining detailed cause of error & any recommendations to fix
  data?: Record<string, any>; // optional unstructured data object with any additional useful error data
  message: string; // short (1-2 sentences) human-readable string explaining the cause of the error
  service?: string; // optional string identifying the backend service that threw the error
  timestamp: string; // ISO 8601 UTC string timestamp at the time the error happened
  trace?: string; // stack trace of error
  type: ErrorTypes; // very short, semi-human-readable string representing the category/class/type of error, in all caps and underscores, eg. “INVALID_SIMULATION_ID”
}

export interface LogMessage extends BaseError {
  duration?: number; // optional ms
  level: LogLevel;
  type: ErrorTypes.CAUGHT_ERROR | ErrorTypes.LOG;
}

export interface AnchorValidationError extends BaseError {
  data: {
    activityId: number;
  };
  type: ErrorTypes.ANCHOR_VALIDATION_ERROR;
}

export type ActivityValidationStatus = 'complete' | 'pending';

export interface ActivityValidationErrors {
  activityId: number;
  errors: (ActivityDirectiveValidationFailures | AnchorValidationError)[];
  status: ActivityValidationStatus;
  type: string;
}

export interface ConstraintRunError extends BaseError {
  data: {
    constraintId: number;
    errors?: UserCodeError[];
    violations?: Pick<ConstraintResult, 'violations'>;
  };
}

export interface SchedulingError extends BaseError {
  data: {
    errors: {
      [activityId: string]: unknown;
    };
    success: boolean;
  };
}

export interface SimulationDatasetError extends BaseError {
  data: {
    activityStackStrace?: string;
    elapsedTime?: string;
    errors?: {
      [activityId: string]: unknown;
    };
    executingActivityType?: string;
    executingDirectiveId?: number;
    success?: boolean;
    utcTimeDoy?: string;
  };
}

export interface ActivityDirectiveInstantiationError {
  extraneousArguments: string[];
  missingArguments: string[];
  unconstructableArguments: {
    failure: string;
    name: string;
  }[];
}

export interface ActivityDirectiveUnknownTypeError {
  noSuchActivityError: {
    activity_type: string;
    message: string;
  };
}

export interface ActivityDirectiveValidationNoticesError {
  validationNotices: {
    message: string;
    subjects: string[];
  }[];
}

export interface ActivityDirectiveValidationFailureStatus {
  directive_id: number;
  plan_id: number;
  status: ActivityValidationStatus;
  validations: ActivityDirectiveValidationFailures;
}

export type ActivityDirectiveValidationFailures =
  | ActivityDirectiveInstantiationFailure
  | ActivityDirectiveUnknownTypeFailure
  | ActivityDirectiveValidationNoticesFailure;

interface BaseActivityDirectiveValidation {
  success: boolean;
}

interface ActivityDirectiveValidationFailure extends BaseActivityDirectiveValidation {
  success: false;
  type: ErrorTypes;
}

export interface ActivityDirectiveInstantiationFailure extends ActivityDirectiveValidationFailure {
  errors: ActivityDirectiveInstantiationError;
  type: ErrorTypes.INSTANTIATION_ERRORS;
}

export interface ActivityDirectiveUnknownTypeFailure extends ActivityDirectiveValidationFailure {
  errors: ActivityDirectiveUnknownTypeError;
  type: ErrorTypes.NO_SUCH_ACTIVITY_TYPE;
}

export interface ActivityDirectiveValidationNoticesFailure extends ActivityDirectiveValidationFailure {
  errors: ActivityDirectiveValidationNoticesError;
  type: ErrorTypes.VALIDATION_NOTICES;
}

export interface ActivityErrorCounts {
  all?: number;
  extra: number;
  invalidAnchor: number;
  invalidParameter: number;
  missing: number;
  outOfBounds: number;
  pending: number;
  wrongType: number;
}

export type ActivityErrorCategories = keyof ActivityErrorCounts;

export interface ActivityErrorRollup {
  errorCounts: ActivityErrorCounts;
  id: number;
  location: string[];
  type: string;
}
