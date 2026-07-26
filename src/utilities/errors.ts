import type {
  ActivityDirectiveInstantiationFailure,
  ActivityDirectiveUnknownTypeFailure,
  ActivityDirectiveValidationFailures,
  ActivityDirectiveValidationNoticesFailure,
  ActivityErrorRollup,
  ActivityValidationErrors,
  AnchorValidationError,
  ConsoleEntry,
  LogMessage,
} from '../types/console';

export enum ErrorTypes {
  ACTIVITY_VALIDATION_ERROR = 'ACTIVITY_VALIDATION_ERROR', // TODO this is made up by client, is that ok?
  ANCHOR_VALIDATION_ERROR = 'ANCHOR_VALIDATION_ERROR',
  CAUGHT_ERROR = 'CAUGHT_ERROR',
  CONSTRAINT_RUN_ERROR = 'CONSTRAINT_RUN_ERROR', // TODO this is made up by client, is that ok?
  DATABASE_EXCEPTION = 'DATABASE_EXCEPTION',
  ENDPOINT_VALIDATION_EXCEPTION = 'ENDPOINT_VALIDATION_EXCEPTION',
  FILE_LOCKED = 'FILE_LOCKED',
  FILE_OPERATION_EXCEPTION = 'FILE_OPERATION_EXCEPTION',
  FORBIDDEN = 'FORBIDDEN',
  GLOBAL_SCHEDULING_CONDITIONS_FAILED = 'GLOBAL_SCHEDULING_CONDITIONS_FAILED',
  GRAPHQL_SERVICE_EXCEPTION = 'GRAPHQL_SERVICE_EXCEPTION',
  HTTP_RESPONSE_EXCEPTION = 'HTTP_RESPONSE_EXCEPTION',
  ILLEGAL_ARGUMENT = 'ILLEGAL_ARGUMENT',
  INPUT_MISMATCH_EXCEPTION = 'INPUT_MISMATCH_EXCEPTION',
  INSTANTIATION_ERRORS = 'INSTANTIATION_ERRORS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  IO_EXCEPTION = 'IO_EXCEPTION',
  JSON_PARSING_EXCEPTION = 'JSON_PARSING_EXCEPTION',
  LOG = 'LOG',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST',
  MISSION_MODEL_LOAD_EXCEPTION = 'MISSION_MODEL_LOAD_EXCEPTION',
  NO_SUCH_ACTIVITY_TYPE = 'NO_SUCH_ACTIVITY_TYPE',
  NO_SUCH_CONSTRAINT = 'NO_SUCH_CONSTRAINT',
  NO_SUCH_FILE = 'NO_SUCH_FILE',
  NO_SUCH_MISSION_MODEL = 'NO_SUCH_MISSION_MODEL',
  NO_SUCH_PLAN = 'NO_SUCH_PLAN',
  NO_SUCH_PLAN_DATASET = 'NO_SUCH_PLAN_DATASET',
  NO_SUCH_SCHEDULING_SPECIFICATION = 'NO_SUCH_SCHEDULING_SPECIFICATION',
  NO_SUCH_WORKSPACE = 'NO_SUCH_WORKSPACE',
  NULL_POINTER_EXCEPTION = 'NULL_POINTER_EXCEPTION',
  NUMBER_PARSING_EXCEPTION = 'NUMBER_PARSING_EXCEPTION',
  PERMISSIONS_SERVICE_EXCEPTION = 'PERMISSIONS_SERVICE_EXCEPTION',
  PLAN_CONTAINS_UNCONSTRUCTABLE_ACTIVITIES = 'PLAN_CONTAINS_UNCONSTRUCTABLE_ACTIVITIES',
  PLAN_SERVICE_EXCEPTION = 'PLAN_SERVICE_EXCEPTION',
  PROCEDURE_LOAD_EXCEPTION = 'PROCEDURE_LOAD_EXCEPTION',
  RESULTS_PROTOCOL_FAILURE = 'RESULTS_PROTOCOL_FAILURE',
  SCHEDULING_GOALS_FAILED = 'SCHEDULING_GOALS_FAILED',
  SECURITY_EXCEPTION = 'SECURITY_EXCEPTION',
  SIMULATION_EXCEPTION = 'SIMULATION_EXCEPTION',
  SIMULATION_REQUEST_NOT_RELEVANT = 'SIMULATION_REQUEST_NOT_RELEVANT',
  SIM_DATASET_MISMATCH_EXCEPTION = 'SIM_DATASET_MISMATCH_EXCEPTION',
  SPECIFICATION_LOAD_EXCEPTION = 'SPECIFICATION_LOAD_EXCEPTION',
  SQL_EXCEPTION = 'SQL_EXCEPTION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNEXPECTED_SCHEDULER_EXCEPTION = 'UNEXPECTED_SCHEDULER_EXCEPTION',
  UNEXPECTED_SIMULATION_EXCEPTION = 'UNEXPECTED_SIMULATION_EXCEPTION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_NOTICES = 'VALIDATION_NOTICES',
  WORKSPACE_ACTION_RUN = 'WORKSPACE_ACTION_RUN',
  WORKSPACE_ADAPTATION_ERROR = 'WORKSPACE_ADAPTATION_ERROR',
  WORKSPACE_ADAPTATION_LOG = 'WORKSPACE_ADAPTATION_LOG',
  WORKSPACE_LINT_ERROR = 'WORKSPACE_LINT_ERROR',
}

// Structural mirror of CompoundError from ./requests. Avoiding the value import keeps callers
// off the requests.ts → $env/dynamic/public chain at runtime.
type CompoundErrorShape = Error & { errors: LogMessage[] };

const MULTIPLE_ERRORS_MESSAGE = 'Multiple errors occurred';

// Returns "<label>: <backend message>" when a backend message can be extracted, else just <label>.
export function composeErrorMessage(label: string, error: unknown): string {
  const backendMessage = extractBackendMessage(error);
  return backendMessage !== null ? `${label}: ${backendMessage}` : label;
}

// Pulls a user-facing message out of a CompoundError when one is available.
// Returns null when the caller should fall back to its own static label.
//
// Backend convention (FormattedError.java): `message` is the developer-written
// wrapper sentence ("Unable to move X to Y"); `cause` is the underlying
// exception's getMessage() ("./foo already exists.") — the actionable bit.
// Prefer cause when it's substantive.
export function extractBackendMessage(error: unknown): string | null {
  if (!isCompoundError(error)) {
    return null;
  }

  // Single-error branch: check inner cause/message, NOT outer. Path-1 CompoundErrors
  // (HTTP not-OK in reqHasura) have a non-user-friendly outer and empty inner — fall through.
  if (error.errors.length === 1) {
    const { cause, message } = error.errors[0];
    if (isSubstantive(cause)) {
      return cause;
    }
    return isSubstantive(message) ? message : null;
  }

  // Multi-error / bulk-op branch: outer message is the constructed summary
  // ("Some files failed to move") and is fine to surface.
  if (error.errors.length > 1 && isSubstantive(error.message)) {
    return error.message;
  }

  return null;
}

export function isNoSuchFileCompoundError(error: unknown): boolean {
  return isCompoundError(error) && error.errors.some(({ type }) => type === ErrorTypes.NO_SUCH_FILE);
}

function isCompoundError(error: unknown): error is CompoundErrorShape {
  return (
    error instanceof Error && error.name === 'CompoundError' && Array.isArray((error as CompoundErrorShape).errors)
  );
}

function isSubstantive(msg: string | undefined): msg is string {
  return typeof msg === 'string' && msg.trim().length > 0 && msg !== MULTIPLE_ERRORS_MESSAGE;
}

export function isInstantiationError(
  validation: ActivityDirectiveValidationFailures | AnchorValidationError,
): validation is ActivityDirectiveInstantiationFailure {
  return (validation as ActivityDirectiveInstantiationFailure).type === ErrorTypes.INSTANTIATION_ERRORS;
}

export function isUnknownTypeError(
  validation: ActivityDirectiveValidationFailures | AnchorValidationError,
): validation is ActivityDirectiveUnknownTypeFailure {
  return (validation as ActivityDirectiveUnknownTypeFailure).type === ErrorTypes.NO_SUCH_ACTIVITY_TYPE;
}

export function isValidationNoticesError(
  validation: ActivityDirectiveValidationFailures | AnchorValidationError,
): validation is ActivityDirectiveValidationNoticesFailure {
  return (validation as ActivityDirectiveValidationNoticesFailure).type === ErrorTypes.VALIDATION_NOTICES;
}

export function generateActivityValidationErrorRollups(
  activityValidationErrors: ActivityValidationErrors[],
): ActivityErrorRollup[] {
  return activityValidationErrors.map(({ activityId, errors, status, type }) => {
    let extraLocations: string[] = [];
    let invalidAnchorLocations: string[] = [];
    let invalidParameterLocations: string[] = [];
    let missingLocations: string[] = [];
    let outOfBoundsLocations: string[] = [];
    let wrongTypeLocations: string[] = [];
    // Validation notices that name no subject. They have no field to highlight, so they cannot become a
    // location, but they are still errors and have to be counted somewhere or they disappear.
    let unattributedNoticeCount = 0;

    if (status === 'complete') {
      errors.forEach(error => {
        if (isInstantiationError(error)) {
          invalidParameterLocations = [
            ...new Set([
              ...invalidParameterLocations,
              ...error.errors.unconstructableArguments.map(({ name }) => name),
            ]),
          ];
          extraLocations = [...new Set([...extraLocations, ...error.errors.extraneousArguments])];
          missingLocations = [...new Set([...missingLocations, ...error.errors.missingArguments])];
        } else if (isUnknownTypeError(error)) {
          wrongTypeLocations = [...new Set([...wrongTypeLocations, error.errors.noSuchActivityError.activity_type])];
        } else if (isValidationNoticesError(error)) {
          invalidParameterLocations = [
            ...new Set([
              ...invalidParameterLocations,
              ...([] as string[]).concat(...error.errors.validationNotices.map(({ subjects }) => subjects)),
            ]),
          ];
          // A notice with NO subjects is a whole-activity failure that cannot be blamed on one
          // parameter. External models produce these routinely -- a backend validates by attempting to
          // construct the activity, and the construction fails on the argument set as a whole. Counting
          // only subjects made them vanish completely: no location, no count, and an activity rendering
          // as valid while the backend was refusing it.
          unattributedNoticeCount += error.errors.validationNotices.filter(
            ({ subjects }) => !subjects || subjects.length === 0,
          ).length;
        } else {
          const { message } = error;
          if (/end-time\sanchor/i.test(message)) {
            invalidAnchorLocations = [...new Set([...invalidAnchorLocations, message])];
          } else if (/plan\sstart/i.test(message)) {
            outOfBoundsLocations = [...new Set([...invalidAnchorLocations, message])];
          }
        }
      });
    }

    const location = [...new Set([...extraLocations, ...missingLocations, ...invalidParameterLocations])];

    return {
      errorCounts: {
        extra: extraLocations.length,
        invalidAnchor: invalidAnchorLocations.length,
        invalidParameter: invalidParameterLocations.length + unattributedNoticeCount,
        missing: missingLocations.length,
        outOfBounds: outOfBoundsLocations.length,
        pending: status === 'pending' ? 1 : 0,
        wrongType: wrongTypeLocations.length,
      },
      id: activityId,
      location,
      type,
    };
  });
}

export function getActivityIdsFromError(error: ConsoleEntry): number[] {
  if (error.type === ErrorTypes.ANCHOR_VALIDATION_ERROR || error.type === ErrorTypes.ACTIVITY_VALIDATION_ERROR) {
    return [(error as AnchorValidationError).data.activityId];
  } else if (
    error.type === ErrorTypes.GLOBAL_SCHEDULING_CONDITIONS_FAILED ||
    error.type === ErrorTypes.SCHEDULING_GOALS_FAILED ||
    error.type === ErrorTypes.UNEXPECTED_SIMULATION_EXCEPTION
  ) {
    const errors = error.data?.errors;
    if (errors && typeof errors === 'object') {
      return Object.keys(errors)
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
    }
  } else if (error.type === ErrorTypes.SIMULATION_EXCEPTION) {
    const id = error.data?.executingDirectiveId;
    if (typeof id === 'number') {
      return [id];
    }
  }
  return [];
}
