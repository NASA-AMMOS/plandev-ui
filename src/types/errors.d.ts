interface BaseError {
  data: unknown;
  message: string;
  timestamp: string;
  trace?: string;
  type: import('../utilities/errors').ErrorTypes;
}

interface SchedulingError extends BaseError {
  data: {
    errors: {
      [activityId: string]: unknown;
    };
    success: boolean;
  };
}

interface SimulationDatasetError extends BaseError {
  data: {
    errors: {
      [activityId: string]: unknown;
    };
    success: boolean;
  };
}
