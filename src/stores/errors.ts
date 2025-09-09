import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityDirectiveId } from '../types/activity';
import type {
  ActivityDirectiveValidationFailureStatus,
  ActivityErrorRollup,
  ActivityValidationErrors,
  AnchorValidationError,
  BaseError,
  LogLevel,
  LogMessage,
  SchedulingError,
  SimulationDatasetError,
} from '../types/errors';
import { ErrorTypes, generateActivityValidationErrorRollups } from '../utilities/errors';
import { compare } from '../utilities/generic';
import { activityDirectiveValidationStatuses, activityDirectivesMap, anchorValidationStatuses } from './activities';
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
          activityId: activity_id,
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
      const { activityId } = anchorValidationError;
      if (activityValidationsErrorMap[activityId] === undefined) {
        activityValidationsErrorMap[activityId] = {
          activityId: activityId,
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

export const schedulingErrors: Writable<SchedulingError[]> = writable([]);

export const allLogs: Writable<LogMessage[]> = writable([]);

export const errorLogs: Readable<LogMessage[]> = derived([allLogs], ([$allLogs]) =>
  $allLogs.filter(log => log.type === ErrorTypes.CAUGHT_ERROR),
);

export const allProblems: Readable<BaseError[]> = derived(
  [simulationDatasetErrors, schedulingErrors, anchorValidationErrors],
  ([$simulationDatasetErrors, $schedulingErrors, $anchorValidationErrors]) =>
    [...($simulationDatasetErrors ?? []), ...($schedulingErrors ?? []), ...($anchorValidationErrors ?? [])].sort(
      (errorA: BaseError, errorB: BaseError) =>
        compare(`${new Date(errorA.timestamp)}`, `${new Date(errorB.timestamp)}`, false),
    ),
);

/* Helper Functions. */

export function logMessage(
  message: string,
  details?: string,
  level: LogLevel = 'info',
  shouldLog: boolean = false,
): void {
  allLogs.update(l => {
    l.push({
      level,
      message,
      timestamp: `${new Date()}`,
      ...(details ? { trace: details } : {}),
      type: ErrorTypes.LOG,
    });
    return [...l];
  });

  if (shouldLog) {
    console.log(details ?? message);
  }
}

export function catchError(error: string | Error, details?: string | Error, shouldLog: boolean = true): void {
  // ignore the error if it is an AbortError
  if ((error as Error).name && (error as Error).name === 'AbortError') {
    return;
  }

  allLogs.update(l => {
    l.push({
      level: 'error',
      message: `${error}`,
      timestamp: `${new Date()}`,
      ...(details ? { trace: `${details}` } : {}),
      type: ErrorTypes.CAUGHT_ERROR,
    });
    return [...l];
  });

  if (shouldLog) {
    console.log(details ?? error);
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
