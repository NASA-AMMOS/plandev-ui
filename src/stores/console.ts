import { capitalize, keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityDirectiveId } from '../types/activity';
import type {
  ActivityDirectiveValidationFailureStatus,
  ActivityDirectiveValidationStatus,
  ActivityDirectiveValidationUnavailableStatus,
  ActivityStatusRollup,
  ActivityValidationStatuses,
  AnchorValidationError,
  ConsoleEntry,
  ErrorCategory,
  LogLevel,
  LogMessage,
} from '../types/console';
import type { ModelLog, ModelStatus } from '../types/model';
import { ErrorTypes, generateActivityValidationStatusRollups } from '../utilities/errors';
import { compare, filterEmpty } from '../utilities/generic';
import { getModelStatusRollup } from '../utilities/model';
import { CompoundError } from '../utilities/requests';
import { pluralize } from '../utilities/text';
import { activityDirectivesMap, activityDirectiveValidationStatuses, anchorValidationStatuses } from './activities';
import { relevantConstraintRuns } from './constraints';
import { plan } from './plan';
import { simulationDataset } from './simulation';

export function parseErrorReason(error: string) {
  return error.replace(/\s*at\s(gov|com)/, ' : ').replace(/gov\S*:\s*(?<reason>[^:]+)\s*:(.|\s|\n|\t|\r)*/, '$1');
}

function isActivityDirectiveValidationFailureOrUnavailable(
  status: ActivityDirectiveValidationStatus,
): status is ActivityDirectiveValidationFailureStatus | ActivityDirectiveValidationUnavailableStatus {
  const { validations } = status;
  if (!validations.success) {
    return true;
  }
  return 'type' in validations && validations.type === 'UNAVAILABLE';
}

/* Derived. */

export const activityDirectiveValidationFailures: Readable<
  (ActivityDirectiveValidationFailureStatus | ActivityDirectiveValidationUnavailableStatus)[]
> = derived(
  [activityDirectiveValidationStatuses],
  ([$activityDirectiveValidationStatuses]) => {
    return $activityDirectiveValidationStatuses.filter(isActivityDirectiveValidationFailureOrUnavailable);
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

export const activityValidationErrors: Readable<ActivityValidationStatuses[]> = derived(
  [activityDirectiveValidationFailures, anchorValidationErrors, activityDirectivesMap],
  ([$activityDirectiveValidationFailures, $anchorValidationErrors, $activityDirectivesMap]) => {
    const activityValidationsErrorMap: Record<string, ActivityValidationStatuses> = {};
    $activityDirectiveValidationFailures.forEach(({ validations, directive_id: directiveId, status }) => {
      if (activityValidationsErrorMap[directiveId] === undefined) {
        activityValidationsErrorMap[directiveId] = {
          activityId: directiveId,
          status,
          statuses: [validations],
          type: ($activityDirectivesMap || {})[directiveId]?.type, // TODO maybe this whole thing should also be a nullable list?
        };
      } else {
        activityValidationsErrorMap[directiveId].statuses.push(validations);
      }
    });

    $anchorValidationErrors.forEach(anchorValidationError => {
      const activityId = anchorValidationError.data.activityId;
      if (activityValidationsErrorMap[activityId] === undefined) {
        activityValidationsErrorMap[activityId] = {
          activityId,
          status: 'complete',
          statuses: [anchorValidationError],
          type: ($activityDirectivesMap || {})[activityId]?.type,
        };
      } else {
        activityValidationsErrorMap[activityId].statuses.push(anchorValidationError);
      }
    });

    return Object.values(activityValidationsErrorMap);
  },
);

export const activityStatusRollups: Readable<ActivityStatusRollup[]> = derived(
  [activityValidationErrors],
  ([$activityValidationErrors]) => generateActivityValidationStatusRollups($activityValidationErrors),
);

export const activityStatusRollupsMap: Readable<Record<ActivityDirectiveId, ActivityStatusRollup>> = derived(
  [activityStatusRollups],
  ([$activityErrorRollups]) => keyBy($activityErrorRollups, 'id'),
);

export const consoleEntries: Writable<LogMessage[]> = writable([]);

export const constraintErrors: Readable<LogMessage[]> = derived(
  [relevantConstraintRuns, consoleEntries],
  ([$relevantConstraintRuns, $consoleEntries]) => {
    const fromRuns: LogMessage[] = $relevantConstraintRuns
      .filter(run => run.results.violations?.length || run.errors?.length)
      .map(run => ({
        category: 'constraint',
        data: {
          constraintId: run.constraint_id,
          errors: run.errors,
          violations: run.results.violations || undefined,
        },
        level: 'error',
        message: run.errors?.length
          ? run.errors[0].message
          : `Constraint "${run.results.constraintName}" has ${run.results.violations?.length ?? 0} violation${pluralize(run.results.violations?.length ?? 0)}`,
        timestamp: run.requested_at,
        type: ErrorTypes.CONSTRAINT_RUN_ERROR,
      }));
    const fromExceptions = $consoleEntries.filter(e => e.category === 'constraint');
    return [...fromRuns, ...fromExceptions];
  },
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

export const schedulingErrors: Readable<LogMessage[]> = derived(consoleEntries, $pe =>
  $pe.filter(e => e.category === 'scheduling'),
);

export const simulationErrors: Readable<LogMessage[]> = derived(
  [simulationDataset, consoleEntries],
  ([$simulationDataset, $consoleEntries]) => {
    const fromDataset: LogMessage[] =
      $simulationDataset && $simulationDataset.reason
        ? [
            {
              ...$simulationDataset.reason,
              category: 'simulation',
              level: 'error',
              message: parseErrorReason($simulationDataset.reason.message),
            },
          ]
        : [];
    const fromExceptions = $consoleEntries.filter(e => e.category === 'simulation');
    return [...fromDataset, ...fromExceptions];
  },
  [],
);

export const allLogs: Readable<LogMessage[]> = derived(consoleEntries, $pe => $pe.filter(e => e.category === 'log'));

export const errorLogs: Readable<LogMessage[]> = derived(consoleEntries, $pe =>
  $pe.filter(e => e.category === 'log' && e.level === 'error'),
);

export const allProblems: Readable<ConsoleEntry[]> = derived(
  [
    simulationErrors,
    schedulingErrors,
    anchorValidationErrors,
    constraintErrors,
    modelErrors,
    activityValidationErrors,
    activityStatusRollupsMap,
  ],
  ([
    $simulationErrors,
    $schedulingErrors,
    $anchorValidationErrors,
    $constraintErrors,
    $modelErrors,
    $activityValidationErrors,
    $activityErrorRollupsMap,
  ]) =>
    [
      ...($simulationErrors ?? []),
      ...($schedulingErrors ?? []),
      ...($anchorValidationErrors ?? []),
      ...($constraintErrors ?? []),
      ...($modelErrors ?? []),
      ...($activityValidationErrors
        ? $activityValidationErrors
            .filter(error => error.status === 'complete')
            .map(error => {
              const errorCount = Object.entries($activityErrorRollupsMap[error.activityId]?.statusCounts || {}).reduce(
                (count, [key, value]) => {
                  // Only count errors that are not pending or unavailable
                  if (key !== 'pending' && key !== 'unavailable') {
                    count += value;
                  }
                  return count;
                },
                0,
              );
              if (errorCount === 0) {
                return null;
              }
              const errorMessage: ConsoleEntry = {
                data: {
                  ...error,
                },
                message: `Activity Directive ${error.activityId} (${error.type}) has ${errorCount} validation error${pluralize(errorCount)}.`,
                timestamp: `${new Date()}`,
                type: ErrorTypes.ACTIVITY_VALIDATION_ERROR,
              };
              return errorMessage;
            })
            .filter(filterEmpty)
        : []),
    ].sort((errorA: ConsoleEntry, errorB: ConsoleEntry) =>
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

function compoundErrorToLogMessages(message: string, error: Error | CompoundError): LogMessage[] {
  // Returns [] for AbortError so the caller can bail without pushing.
  if ((error as Error).name === 'AbortError') {
    return [];
  }
  if (error instanceof CompoundError) {
    return error.errors.map(e => ({ ...e, message: `${message}: ${e.message}` }));
  }
  return [
    {
      cause: error.cause ? (typeof error.cause === 'object' ? JSON.stringify(error.cause) : String(error.cause)) : '',
      level: 'error',
      message: `${message}: ${cleanLogMessage(`${error}`)}`,
      timestamp: `${new Date()}`,
      trace: error.stack,
      type: ErrorTypes.CAUGHT_ERROR,
    },
  ];
}

// Dispatches on `error instanceof Error`: thrown Errors / CompoundErrors get the `message` prefix;
// plain ConsoleEntry objects (backend graceful-failure responses) are spread directly.
export function catchError(
  category: ErrorCategory,
  message: string,
  error: Error | CompoundError | ConsoleEntry,
  options?: { level?: LogLevel; shouldLog?: boolean },
): void {
  const shouldLog = options?.shouldLog ?? true;
  const level: LogLevel = options?.level ?? 'error';
  let entries: LogMessage[];

  if (error instanceof Error) {
    const logs = compoundErrorToLogMessages(message, error);
    if (!logs.length) {
      return;
    }
    entries = logs.map(l => ({ ...l, category, level }));
  } else {
    entries = [{ ...error, category, level, message: message ? `${message}: ${error.message}` : error.message }];
  }

  consoleEntries.update(arr => arr.concat(entries));

  if (shouldLog) {
    console.log(error);
  }
}

export function logMessage(
  category: ErrorCategory,
  message: string,
  options?: { details?: string; duration?: number; level?: LogLevel; shouldLog?: boolean },
): void {
  const level: LogLevel = options?.level ?? 'info';
  const entry: LogMessage = {
    category,
    level,
    message: cleanLogMessage(message),
    timestamp: `${new Date()}`,
    type: ErrorTypes.LOG,
    ...(options?.details ? { cause: options.details } : {}),
    ...(typeof options?.duration === 'number' ? { duration: options.duration } : {}),
  };
  consoleEntries.update(arr => arr.concat([entry]));

  if (options?.shouldLog) {
    console.log(options?.details ?? message);
  }
}

export function clearConsoleEntries(category?: ErrorCategory): void {
  if (category === undefined) {
    consoleEntries.set([]);
  } else {
    consoleEntries.update(arr => arr.filter(e => e.category !== category));
  }
}

export function clearSchedulingErrors(): void {
  clearConsoleEntries('scheduling');
}

export function clearLogs(): void {
  clearConsoleEntries('log');
}

export function resetErrorStores(): void {
  clearConsoleEntries();
}
