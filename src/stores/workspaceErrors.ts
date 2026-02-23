import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActionRunSlim } from '../types/actions';
import type { AdaptationLog, AdaptationMessage, BaseError, LintDiagnostic, LintError, LogLevel } from '../types/errors';
import { ErrorTypes } from '../utilities/errors';
import { compare } from '../utilities/generic';
import { actionDefinitionsByWorkspace, actionRunsByWorkspace } from './actions';
import { workspaceId } from './workspaces';

/* Writable Stores */

// Adaptation messages (errors from loading failures + console logs from adaptation code)
export const workspaceAdaptationMessages: Writable<AdaptationMessage[]> = writable([]);

export const workspaceAdaptationErrors: Readable<AdaptationMessage[]> = derived(
  [workspaceAdaptationMessages],
  ([$workspaceAdaptationMessages]) => $workspaceAdaptationMessages.filter(isWorkspaceAdaptationError),
);

// Linting errors (individual CodeMirror diagnostics, grouped by file)
export const workspaceLintErrors: Writable<LintError[]> = writable([]);

export const userInitiatedActionRunIds: Writable<Set<number>> = writable(new Set());

/* Derived Stores */

// Action runs for current workspace
export const workspaceActionRunsForSession: Readable<ActionRunSlim[]> = derived(
  [actionRunsByWorkspace, workspaceId, userInitiatedActionRunIds],
  ([$actionRunsByWorkspace, $workspaceId, $userInitiatedActionRunIds]) => {
    const runs = $actionRunsByWorkspace[$workspaceId] ?? [];
    return runs.filter(run => $userInitiatedActionRunIds.has(run.id));
  },
);

// All session action runs mapped to BaseError format (for console display)
export const workspaceActionRunMessages: Readable<(BaseError & { level: LogLevel })[]> = derived(
  [workspaceActionRunsForSession, actionDefinitionsByWorkspace, workspaceId],
  ([$workspaceActionRuns, $actionDefinitionsByWorkspace, $workspaceId]) => {
    const actionDefs = $actionDefinitionsByWorkspace[$workspaceId] ?? {};
    return $workspaceActionRuns
      .map(run => {
        const actionDef = actionDefs[run.action_definition_id];
        const actionName = actionDef?.name ?? `Action #${run.action_definition_id}`;
        const failed = run.status === 'failed';
        return {
          cause: run.error?.message,
          data: { actionName, actionRunId: run.id, error: run.error, status: run.status },
          level: (failed ? 'error' : 'info') as LogLevel,
          message: failed ? `${actionName} failed` : `${actionName}: ${run.status}`,
          timestamp: run.requested_at,
          trace: run.error?.stack,
          type: ErrorTypes.WORKSPACE_ACTION_RUN,
        };
      })
      .sort((a, b) => compare(`${new Date(a.timestamp)}`, `${new Date(b.timestamp)}`, true));
  },
);

// Failed/errored action runs only (for error counts)
export const workspaceActionErrors: Readable<BaseError[]> = derived(
  [workspaceActionRunMessages],
  ([$workspaceActionRunMessages]) => $workspaceActionRunMessages.filter(m => m.level === 'error'),
);

/* Helper Functions */

function isWorkspaceAdaptationError(message: AdaptationLog | BaseError) {
  return (
    message.type === ErrorTypes.WORKSPACE_ADAPTATION_ERROR ||
    (message as AdaptationLog).level === 'error' ||
    (message as AdaptationLog).level === 'warn'
  );
}

export function addWorkspaceAdaptationError(error: BaseError): void {
  workspaceAdaptationMessages.update(messages => [...messages, { ...error, level: 'error' as LogLevel }]);
}

export function addWorkspaceAdaptationLog(level: LogLevel, args: any[]): void {
  workspaceAdaptationMessages.update(messages => [
    ...messages,
    {
      data: args,
      level,
      message: args.map(arg => String(arg)).join(' '),
      timestamp: new Date().toISOString(),
      type: ErrorTypes.WORKSPACE_ADAPTATION_LOG,
    },
  ]);
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

export function clearWorkspaceAdaptationMessages(): void {
  workspaceAdaptationMessages.set([]);
}

export function resetWorkspaceErrorStores(): void {
  clearWorkspaceAdaptationMessages();
  clearWorkspaceLintErrors();
  userInitiatedActionRunIds.set(new Set());
}
