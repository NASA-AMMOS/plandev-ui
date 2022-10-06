interface BaseError {
  reason: string;
  sourceId?: string;
  trace?: string;
  type: import('../utilities/errors').ErrorTypes;
}

type SchedulingError = BaseError;
type SimulationDatasetError = BaseError;
