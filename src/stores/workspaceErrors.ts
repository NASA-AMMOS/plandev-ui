import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActionRunSlim } from '../types/actions';
import type { BaseError, LintDiagnostic, LintError, LogMessage } from '../types/errors';
import { ErrorTypes } from '../utilities/errors';
import { actionDefinitionsByWorkspace, actionRunsByWorkspace } from './actions';
import { allLogs } from './errors';
import { workspaceId } from './workspaces';

/* Writable Stores */

// Adaptation errors (sequence adaptation loading failures)
export const workspaceAdaptationErrors: Writable<BaseError[]> = writable([]);

// Linting errors (individual CodeMirror diagnostics, grouped by file)
export const workspaceLintErrors: Writable<LintError[]> = writable([]);

/* Derived Stores */

// Filter global logs for workspace-relevant entries (file ops, dictionary errors, general logs)
export const workspaceLogs: Readable<LogMessage[]> = derived([allLogs], ([$allLogs]) => $allLogs);

// Action runs for current workspace
export const workspaceActionRuns: Readable<ActionRunSlim[]> = derived(
  [actionRunsByWorkspace, workspaceId],
  ([$actionRunsByWorkspace, $workspaceId]) => $actionRunsByWorkspace[$workspaceId] ?? [],
);

// Failed/errored action runs only (for error counts)
export const workspaceActionErrors: Readable<BaseError[]> = derived(
  [workspaceActionRuns, actionDefinitionsByWorkspace, workspaceId],
  ([$workspaceActionRuns, $actionDefinitionsByWorkspace, $workspaceId]) => {
    const actionDefs = $actionDefinitionsByWorkspace[$workspaceId] ?? {};
    return $workspaceActionRuns
      .filter(run => run.status === 'failed' || run.error?.message)
      .map(run => {
        const actionDef = actionDefs[run.action_definition_id];
        const actionName = actionDef?.name ?? `Action #${run.action_definition_id}`;
        return {
          cause: run.error?.message,
          data: { actionName, actionRunId: run.id, error: run.error, status: run.status },
          message: `${actionName} failed`,
          timestamp: run.requested_at,
          trace: run.error?.stack,
          type: ErrorTypes.WORKSPACE_ACTION_RUN,
        };
      });
  },
);

// Aggregate all workspace problems for "All Problems" tab
export const allWorkspaceProblems: Readable<BaseError[]> = derived(
  [workspaceAdaptationErrors, workspaceLintErrors, workspaceActionErrors],
  ([$adaptationErrors, $lintErrors, $actionErrors]) =>
    [...$adaptationErrors, ...$lintErrors, ...$actionErrors].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
);

/* Helper Functions */

export function addWorkspaceAdaptationError(error: BaseError): void {
  workspaceAdaptationErrors.update(errors => [...errors, error]);
}

export function setWorkspaceLintErrors(filePath: string, diagnostics: LintDiagnostic[]): void {
  workspaceLintErrors.update(errors => {
    // Remove old errors for this file, add new ones
    const filtered = errors.filter(e => e.data?.filePath !== filePath);
    const newErrors: LintError[] = diagnostics.map(d => ({
      data: {
        column: d.from.column,
        filePath,
        line: d.from.line,
        severity: d.severity,
      },
      level: d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warn' : 'info', // 'info' and 'hint' both map to 'info'
      message: `${filePath}:${d.from.line}:${d.from.column} - ${d.message}`,
      timestamp: new Date().toISOString(),
      type: ErrorTypes.WORKSPACE_LINT_ERROR,
    }));
    return [...filtered, ...newErrors];
  });
}

export function clearWorkspaceLintErrors(filePath?: string): void {
  if (filePath) {
    workspaceLintErrors.update(errors => errors.filter(e => e.data?.filePath !== filePath));
  } else {
    workspaceLintErrors.set([]);
  }
}

export function clearWorkspaceAdaptationErrors(): void {
  workspaceAdaptationErrors.set([]);
}

export function resetWorkspaceErrorStores(): void {
  clearWorkspaceAdaptationErrors();
  clearWorkspaceLintErrors();
}
