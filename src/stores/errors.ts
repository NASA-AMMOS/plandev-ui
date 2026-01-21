import { capitalize, keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityDirectiveId } from '../types/activity';
import type {
  ActivityDirectiveValidationFailureStatus,
  ActivityErrorRollup,
  ActivityValidationErrors,
  AnchorValidationError,
  BaseError,
  ConstraintRunError,
  LogLevel,
  LogMessage,
  SchedulingError,
  SimulationDatasetError,
} from '../types/errors';
import type { ModelLog, ModelStatus } from '../types/model';
import { ErrorTypes, generateActivityValidationErrorRollups } from '../utilities/errors';
import { compare } from '../utilities/generic';
import { getModelStatusRollup } from '../utilities/model';
import type { CompoundError } from '../utilities/requests';
import { pluralize } from '../utilities/text';
import { activityDirectiveValidationStatuses, activityDirectivesMap, anchorValidationStatuses } from './activities';
import { relevantConstraintRuns } from './constraints';
import { plan } from './plan';
import { simulationDataset } from './simulation';

export function parseErrorReason(error: string) {
  return error.replace(/\s*at\s(gov|com)/, ' : ').replace(/gov\S*:\s*(?<reason>[^:]+)\s*:(.|\s|\n|\t|\r)*/, '$1');
}

/* Derived. */

export const activityDirectiveValidationFailures: Readable<ActivityDirectiveValidationFailureStatus[]> = derived(
  [activityDirectiveValidationStatuses],
  ([$activityDirectiveValidationStatuses]) => {
    return $activityDirectiveValidationStatuses.filter(
      ({ validations }) => !validations.success,
    ) as ActivityDirectiveValidationFailureStatus[];
  },
  [],
);

export const anchorValidationErrors: Readable<AnchorValidationError[]> = derived(
  [anchorValidationStatuses],
  ([$anchorValidationStatuses]) => {
    return $anchorValidationStatuses
      .filter(({ reason_invalid }) => !!reason_invalid)
      .map(({ activity_id, reason_invalid }) => {
        const error: AnchorValidationError = {
          data: {
            activityId: activity_id,
          },
          message: reason_invalid,
          timestamp: `${new Date()}`,
          type: ErrorTypes.ANCHOR_VALIDATION_ERROR,
        };
        return error;
      });
  },
  [],
);

export const activityValidationErrors: Readable<ActivityValidationErrors[]> = derived(
  [activityDirectiveValidationFailures, anchorValidationErrors, activityDirectivesMap],
  ([$activityDirectiveValidationFailures, $anchorValidationErrors, $activityDirectivesMap]) => {
    const activityValidationsErrorMap: Record<string, ActivityValidationErrors> = {};
    $activityDirectiveValidationFailures.forEach(({ validations, directive_id: directiveId, status }) => {
      if (activityValidationsErrorMap[directiveId] === undefined) {
        activityValidationsErrorMap[directiveId] = {
          activityId: directiveId,
          errors: [validations],
          status,
          type: ($activityDirectivesMap || {})[directiveId]?.type, // TODO maybe this whole thing should also be a nullable list?
        };
      } else {
        activityValidationsErrorMap[directiveId].errors.push(validations);
      }
    });

    $anchorValidationErrors.forEach(anchorValidationError => {
      const activityId = anchorValidationError.data.activityId;
      if (activityValidationsErrorMap[activityId] === undefined) {
        activityValidationsErrorMap[activityId] = {
          activityId,
          errors: [anchorValidationError],
          status: 'complete',
          type: ($activityDirectivesMap || {})[activityId]?.type,
        };
      } else {
        activityValidationsErrorMap[activityId].errors.push(anchorValidationError);
      }
    });

    return Object.values(activityValidationsErrorMap);
  },
);

export const activityErrorRollups: Readable<ActivityErrorRollup[]> = derived(
  [activityValidationErrors],
  ([$activityValidationErrors]) => generateActivityValidationErrorRollups($activityValidationErrors),
);

export const activityErrorRollupsMap: Readable<Record<ActivityDirectiveId, ActivityErrorRollup>> = derived(
  [activityErrorRollups],
  ([$activityErrorRollups]) => keyBy($activityErrorRollups, 'id'),
);

export const constraintRunErrors: Readable<ConstraintRunError[]> = derived(
  [relevantConstraintRuns],
  ([$relevantConstraintRuns]) => {
    return $relevantConstraintRuns
      .filter(run => run.results.violations?.length || run.errors?.length)
      .map(run => {
        return {
          data: {
            constraintId: run.constraint_id,
            errors: run.errors,
            violations: run.results.violations || undefined,
          },
          message: run.errors?.length
            ? run.errors[0].message
            : `Constraint "${run.results.constraintName}" has ${run.results.violations?.length ?? 0} violation${pluralize(run.results.violations?.length ?? 0)}`,
          timestamp: run.requested_at,
          type: ErrorTypes.CONSTRAINT_RUN_ERROR,
        } as ConstraintRunError;
      });
  },
);

export const simulationDatasetErrors: Readable<SimulationDatasetError[]> = derived(
  [simulationDataset],
  ([$simulationDataset]) => {
    return $simulationDataset && $simulationDataset.reason
      ? [
          {
            ...$simulationDataset.reason,
            message: parseErrorReason($simulationDataset.reason.message),
          },
        ]
      : [];
  },
  [],
);

export const modelLogs: Readable<LogMessage[]> = derived(
  [plan],
  ([$plan]) => {
    if ($plan) {
      const { activityLog, activityLogStatus, parameterLog, parameterLogStatus, resourceLog, resourceLogStatus } =
        getModelStatusRollup($plan.model);
      return [
        generateLogMessageForModelLog(activityLog, activityLogStatus, 'activity types'),
        generateLogMessageForModelLog(parameterLog, parameterLogStatus, 'model parameter'),
        generateLogMessageForModelLog(resourceLog, resourceLogStatus, 'resource types'),
      ];
    }
    return [];
  },
  [],
);

export const modelErrors: Readable<LogMessage[]> = derived(
  [modelLogs],
  ([$modelLogs]) => {
    return $modelLogs.filter(log => log.level === 'error');
  },
  [],
);

export const schedulingErrors: Writable<SchedulingError[]> = writable([]);

export const allLogs: Writable<LogMessage[]> = writable([]);

export const errorLogs: Readable<LogMessage[]> = derived([allLogs], ([$allLogs]) =>
  $allLogs.filter(log => log.type === ErrorTypes.CAUGHT_ERROR),
);

export const allProblems: Readable<BaseError[]> = derived(
  [
    simulationDatasetErrors,
    schedulingErrors,
    anchorValidationErrors,
    constraintRunErrors,
    modelErrors,
    activityValidationErrors,
    activityErrorRollupsMap,
  ],
  ([
    $simulationDatasetErrors,
    $schedulingErrors,
    $anchorValidationErrors,
    $constraintRunErrors,
    $modelErrors,
    $activityValidationErrors,
    $activityErrorRollupsMap,
  ]) =>
    [
      ...($simulationDatasetErrors ?? []),
      ...($schedulingErrors ?? []),
      ...($anchorValidationErrors ?? []),
      ...($constraintRunErrors ?? []),
      ...($modelErrors ?? []),
      ...($activityValidationErrors
        ? $activityValidationErrors
            .filter(error => error.status === 'complete')
            .map(error => {
              const errorCount = Object.entries($activityErrorRollupsMap[error.activityId]?.errorCounts || {}).reduce(
                (count, [key, value]) => {
                  if (key !== 'pending') {
                    count += value;
                  }
                  return count;
                },
                0,
              );
              const errorMessage: BaseError = {
                data: {
                  ...error,
                },
                message: `Activity Directive ${error.activityId} (${error.type}) has ${errorCount} validation error${pluralize(errorCount)}.`,
                timestamp: `${new Date()}`,
                type: ErrorTypes.ACTIVITY_VALIDATION_ERROR,
              };
              return errorMessage;
            })
        : []),
    ].sort((errorA: BaseError, errorB: BaseError) =>
      compare(`${new Date(errorA.timestamp)}`, `${new Date(errorB.timestamp)}`, false),
    ),
);

/* Helper Functions. */

// Clean log message by removing redundant prefixes
function cleanLogMessage(message: string): string {
  return message.replace(/^(CAUGHT_ERROR|Error:\s+)+/i, '').trim();
}

function generateLogMessageForModelLog(modelLog: ModelLog | null, status: ModelStatus, name: string): LogMessage {
  const log: LogMessage = {
    level: 'info',
    message: '',
    timestamp: modelLog?.created_at || `${new Date()}`,
    type: ErrorTypes.LOG,
  };
  if (status === 'none') {
    return { ...log, message: 'None' };
  } else if (status === 'extracting') {
    return { ...log, message: `Extracting ${name}...` };
  } else if (status === 'error') {
    return {
      ...log,
      level: 'error',
      message: `${capitalize(name)} extraction has errors${modelLog?.error ? `: ${modelLog.error}` : ''}`,
      trace: modelLog?.error_message || '',
    };
  } else {
    return { ...log, message: `${capitalize(name)} extraction successful` };
  }
}

export function logMessage(
  message: string,
  details?: string,
  duration?: number,
  level: LogLevel = 'info',
  shouldLog: boolean = false,
): void {
  allLogs.update(l => {
    l.push({
      level,
      message: cleanLogMessage(message),
      timestamp: `${new Date()}`,
      ...(details ? { cause: details } : {}),
      ...(typeof duration === 'number' ? { duration } : {}),
      type: ErrorTypes.LOG,
    });
    return [...l];
  });

  if (shouldLog) {
    console.log(details ?? message);
  }
}

export function catchError(message: string, error: Error | CompoundError, shouldLog: boolean = true): void {
  let errors: LogMessage[] = [];

  // ignore the error if it is an AbortError
  if ((error as Error).name && (error as Error).name === 'AbortError') {
    return;
  }

  if ((error as CompoundError).name === 'CompoundError') {
    errors = (error as CompoundError).errors.map(e => ({ ...e, message: `${message}: ${e.message}` }));
  } else {
    errors = [
      {
        cause: `${error.cause}` || '',
        level: 'error',
        message: `${message}: ${cleanLogMessage(`${error}`)}`,
        timestamp: `${new Date()}`,
        trace: error.stack,
        type: ErrorTypes.CAUGHT_ERROR,
      },
    ];
  }

  allLogs.update(l => {
    return l.concat(errors);
  });

  if (shouldLog) {
    console.log(error);
  }
}

export function catchSchedulingError(error: SchedulingError) {
  schedulingErrors.update(errors => {
    errors.push({
      ...error,
      message: parseErrorReason(error.message),
    });
    return [...errors];
  });
}

export function clearSchedulingErrors(): void {
  schedulingErrors.set([]);
}

export function clearLogs(): void {
  allLogs.set([]);
}

export function resetErrorStores(): void {
  clearLogs();
  clearSchedulingErrors();
}
