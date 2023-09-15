import type { ErrorTypes } from '../utilities/errors';

export interface BaseError {
  data?: unknown;
  message: string;
  timestamp: string;
  trace?: string;
  type: ErrorTypes;
}

export interface CaughtError extends BaseError {
  type: ErrorTypes.CAUGHT_ERROR;
}

export interface AnchorValidationError extends BaseError {
  type: ErrorTypes.ANCHOR_VALIDATION_ERROR;
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
    elapsedTime?: string;
    errors?: {
      [activityId: string]: unknown;
    };
    success?: boolean;
    utcTimeDoy?: string;
  };
}
