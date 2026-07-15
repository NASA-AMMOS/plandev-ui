import type { ErrorTypes } from '../utilities/errors';

export type LogLevel = 'error' | 'warn' | 'info';

// Universal shape for anything renderable in a Console row: backend exceptions, thrown JS errors,
// info/timing logs, validation problems, adaptation events, etc. Optional fields are populated as available.
export interface ConsoleEntry {
  cause?: string; // longer human-readable detail or recommendations
  data?: Record<string, any>; // optional unstructured payload
  message: string; // short (1-2 sentences) human-readable description
  service?: string; // optional backend service identifier (set on backend-sourced entries)
  timestamp: string; // ISO 8601 UTC timestamp
  trace?: string; // stack or backend trace (errors only)
  type: ErrorTypes; // category/class identifier in SCREAMING_SNAKE_CASE, e.g. "NO_SUCH_SCHEDULING_SPECIFICATION"
}

export type ErrorCategory = 'constraint' | 'log' | 'scheduling' | 'simulation';

export interface LogMessage extends ConsoleEntry {
  category?: ErrorCategory; // set when the entry enters consoleEntries; unset for pre-categorization shapes
  duration?: number;
  level: LogLevel;
  type: ErrorTypes;
}

export interface AnchorValidationError extends ConsoleEntry {
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

export type LintSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface LintDiagnostic {
  from: { column: number; line: number };
  message: string;
  severity: LintSeverity;
  to: { column: number; line: number };
}

export interface LintError extends ConsoleEntry {
  data: {
    column: number;
    filePath: string;
    line: number;
    severity: LintSeverity;
  };
  level: LogLevel;
  type: ErrorTypes.WORKSPACE_LINT_ERROR;
}

export interface AdaptationLog extends ConsoleEntry {
  data: any[];
  level: LogLevel;
  type: ErrorTypes.WORKSPACE_ADAPTATION_LOG;
}

export type AdaptationError = ConsoleEntry & { level: LogLevel };
export type AdaptationMessage = AdaptationLog | AdaptationError;
