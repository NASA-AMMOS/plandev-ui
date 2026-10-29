import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type {
  ActionValueSchema,
  ActionValueSchemaFile,
  ActionValueSchemaFileList,
  ActionValueSchemaSequence,
  ActionValueSchemaSequenceList,
} from '@nasa-jpl/plandev-actions';
import { Status } from '../enums/status';
import type {
  ActionDefinition,
  ActionDefinitionVersion,
  ActionParametersMap,
  ActionRunSlim,
  FileRef,
} from '../types/actions';
import type { Argument, ArgumentsMap } from '../types/parameter';
import type { ValueSchema, ValueSchemaOption } from '../types/schema';
import type { WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import { isMetaOrCtrlPressed } from './keyboardEvents';
import { getActionsUrl } from './routes';

/**
 * Returns the latest non-archived version, or null if all versions are archived.
 */
export function getLatestRunnableVersion(versions: ActionDefinitionVersion[]): ActionDefinitionVersion | null {
  return versions.find(v => !v.archived) ?? null;
}

/**
 * Returns non-archived versions.
 */
export function getRunnableVersions(versions: ActionDefinitionVersion[]): ActionDefinitionVersion[] {
  return versions.filter(v => !v.archived);
}

/**
 * Typeguard for determining if a schema is an action sequence/sequenceList schema
 */
export function isActionValueSchemaSequence(
  schema: ValueSchema | ActionValueSchema,
): schema is ActionValueSchemaSequence | ActionValueSchemaSequenceList {
  return (schema as ActionValueSchema).type === 'sequence' || (schema as ActionValueSchema).type === 'sequenceList';
}

export function isActionValueSchemaFile(
  schema: ValueSchema | ActionValueSchema,
): schema is ActionValueSchemaFile | ActionValueSchemaFileList {
  return (schema as ActionValueSchema).type === 'file' || (schema as ActionValueSchema).type === 'fileList';
}

/** Whether a file/sequence parameter takes `FileRef`s (a path plus a revision) rather than paths. */
export function isWithRevision(schema: object): boolean {
  // ponytail: the installed plandev-actions predates `withRevision`; read it untyped until the UI depends on a release with it.
  return (schema as { withRevision?: boolean }).withRevision === true;
}

/** Whether a `withRevision` parameter may use the working copy (the default) or must pin a named revision. */
export function allowsWorkingCopy(schema: object): boolean {
  // ponytail: untyped like `withRevision`; the installed plandev-actions predates `allowWorkingCopy` too.
  return (schema as { allowWorkingCopy?: boolean }).allowWorkingCopy !== false;
}

/** Whether a parameter that must pin revisions has a selected file without one (the working copy is not allowed). */
export function isMissingRevision(schema: object, value: unknown): boolean {
  if (!isWithRevision(schema) || allowsWorkingCopy(schema)) {
    return false;
  }
  return [value ?? []].flat().some(file => !isFileRef(file) || file.revision === undefined);
}

/** The revision name that is resolved to the file's newest revision each time the action reads it. */
export const LATEST_REVISION = 'latest';

/** A newly selected file's reference: the working copy, or the latest revision when the working copy isn't allowed. */
export function getDefaultFileRef(schema: object, path: string): FileRef {
  return allowsWorkingCopy(schema) ? { path } : { path, revision: LATEST_REVISION };
}

/** The value of a file or sequence action parameter prefilled with these workspace paths (default revisions if it takes them). */
export function getFileArgumentForPaths(schema: ActionValueSchema, paths: string[]): Argument {
  const values = isWithRevision(schema) ? paths.map(path => getDefaultFileRef(schema, path)) : paths;
  return schema.type.endsWith('List') ? values : values[0];
}

/**
 * Converts file and sequence arguments to what their schemas take, e.g. after switching to another action version:
 * paths become FileRefs where the parameter has `withRevision` (and back to paths where it no longer does), and working
 * copies become the latest revision where the working copy isn't allowed. A single file becomes a one-file list where the
 * parameter is now a list, and a list becomes its first file where it no longer is. Chosen revisions are never changed.
 */
export function normalizeFileArguments(
  schemas: Record<string, ActionValueSchema>,
  argumentsMap: ArgumentsMap,
): ArgumentsMap {
  let normalized = argumentsMap;
  for (const [name, schema] of Object.entries(schemas)) {
    const value = argumentsMap[name];
    if (
      !(isActionValueSchemaFile(schema) || isActionValueSchemaSequence(schema)) ||
      value === undefined ||
      value === null
    ) {
      continue;
    }
    const convert = (file: unknown) => {
      if (!isWithRevision(schema)) {
        return isFileRef(file) ? file.path : file;
      }
      if (typeof file === 'string') {
        return getDefaultFileRef(schema, file);
      }
      return isFileRef(file) && file.revision === undefined && !allowsWorkingCopy(schema)
        ? { ...file, revision: LATEST_REVISION }
        : file;
    };
    const files: unknown[] = [value].flat();
    const converted = files.map(convert);
    const isList = schema.type.endsWith('List');
    if (Array.isArray(value) !== isList || converted.some((file, i) => file !== files[i])) {
      // A list keeps every file; a single file keeps the first (and is cleared if there was none)
      const { [name]: _, ...rest } = normalized;
      normalized = isList || converted.length > 0 ? { ...rest, [name]: isList ? converted : converted[0] } : rest;
    }
  }
  return normalized;
}

/** "Working copy" or "Revision B" (revision letters are displayed uppercase, as in the revisions panel). */
export function getFileRefRevisionLabel(fileRef: FileRef): string {
  if (fileRef.revision === undefined) {
    return 'Working copy';
  }
  return fileRef.revision === LATEST_REVISION ? 'Latest revision' : `Revision ${fileRef.revision.toUpperCase()}`;
}

export function formatFileRef(fileRef: FileRef): string {
  return `${fileRef.path} · ${getFileRefRevisionLabel(fileRef)}`;
}

export function isFileRef(value: unknown): value is FileRef {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { path, revision, ...rest } = value as Record<string, unknown>;
  return (
    typeof path === 'string' &&
    (revision === undefined || typeof revision === 'string') &&
    Object.keys(rest).length === 0
  );
}

/**
 * Transforms a value schema record to a parameters map
 */
export function valueSchemaRecordToParametersMap(
  valueSchemaRecord: Record<string, ActionValueSchema>,
): ActionParametersMap {
  return Object.entries(valueSchemaRecord).reduce((acc: ActionParametersMap, [key, valueSchema], i) => {
    acc[key] = { order: i, schema: valueSchema };
    return acc;
  }, {});
}

/**
 * Extracts defaultValue from each entry in a value schema record into an ArgumentsMap.
 */
export function getDefaultsFromSchema(schemaRecord: Record<string, ActionValueSchema>): ArgumentsMap {
  return Object.entries(schemaRecord).reduce((acc: ArgumentsMap, [key, schema]) => {
    if ('defaultValue' in schema && schema.defaultValue !== undefined) {
      acc[key] = schema.defaultValue;
    }
    return acc;
  }, {});
}

export function getUserSequenceValueSchemaOptions(
  workspaceFiles: WorkspaceTreeNodeWithFullPath[],
  workspaceId: number | null,
): ValueSchemaOption[] {
  if (workspaceId === null) {
    return [];
  }
  return workspaceFiles.map(({ fullPath, type }) => ({
    display: fullPath,
    type: `${type}`,
    value: fullPath,
  }));
}

/***
 * Returns the corresponding action definition given an action run and
 * the map of action definitions by workspace
 */
export function getActionDefinitionForRun(
  actionRun: ActionRunSlim,
  actionDefinitionsByWorkspace: Record<number, Record<number, ActionDefinition>>,
  workspaceId: number | null,
): ActionDefinition | null {
  if (typeof workspaceId === 'number') {
    const workspaceDefinitions = actionDefinitionsByWorkspace[workspaceId];
    if (workspaceDefinitions) {
      return workspaceDefinitions[actionRun.action_definition_id] ?? null;
    }
  }
  return null;
}

export function getLatestVersion(action: ActionDefinition): ActionDefinitionVersion | null {
  return action.versions[0] ?? null;
}

/**
 * Maps an ActionRunSlim's status fields to the UI Status enum.
 */
export function getStatusForActionRun(actionRun: ActionRunSlim): Status {
  if (actionRun.canceled === true) {
    return Status.Canceled;
  }

  if (actionRun.error?.message || actionRun.results?.status === 'FAILED') {
    return Status.Failed;
  }

  switch (actionRun.status) {
    case 'success':
      return Status.Complete;
    case 'pending':
      return Status.Pending;
    case 'incomplete':
      return Status.Incomplete;
    case 'failed':
      return Status.Failed;
    default:
      return Status.Unchecked;
  }
}

export function getActionRunDeepLink(workspaceId: number, runId: number, actionId?: number | null): string {
  return getActionsUrl(base, workspaceId, runId, actionId);
}

export function openActionRun(workspaceId: number, runId: number, eventOrNewTab?: MouseEvent | boolean) {
  const url = getActionRunDeepLink(workspaceId, runId);
  const newTab =
    typeof eventOrNewTab === 'boolean' ? eventOrNewTab : eventOrNewTab != null && isMetaOrCtrlPressed(eventOrNewTab);
  if (newTab) {
    window.open(url, '_blank');
  } else {
    goto(url);
  }
}

export type ParsedActionLogLevel = 'debug' | 'error' | 'info' | 'warn';

export interface ParsedActionLog {
  data?: Record<string, unknown>;
  level: ParsedActionLogLevel;
  message: string;
  timestamp: string;
  trace?: string;
}

/**
 * Parses an action server log string into structured entries.
 *
 * Action server log format:
 *   TIMESTAMP [LEVEL] message
 * Continuation lines (multi-line errors / stack traces) appear as:
 *   [LEVEL] text  (indented, no timestamp)
 *
 * Continuation lines are merged into the previous entry's `trace`. As a
 * post-process, when a message ends with `{` and `trace` contains the rest
 * of a JSON object, the JSON is reassembled into `data`.
 */
export function parseActionLogLines(logString: string): ParsedActionLog[] {
  const serverLogPattern = /^(\S+)\s+\[(INFO|WARN|ERROR|DEBUG)]\s(.*)$/;
  const continuationLevelPattern = /^\s*\[(INFO|WARN|ERROR|DEBUG)]\s(.*)$/;
  const results: ParsedActionLog[] = [];

  for (const line of logString.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const mainMatch = line.match(serverLogPattern);
    if (mainMatch) {
      const [, timestamp, rawLevel, message] = mainMatch;
      results.push({
        level: rawLevel.toLowerCase() as ParsedActionLogLevel,
        message,
        timestamp,
      });
      continue;
    }

    const contMatch = line.match(continuationLevelPattern);
    const cleanLine = contMatch ? contMatch[2] : line;

    if (results.length > 0) {
      const prev = results[results.length - 1];
      prev.trace = prev.trace ? `${prev.trace}\n${cleanLine}` : cleanLine;
    } else {
      results.push({
        level: 'info',
        message: cleanLine,
        timestamp: '',
      });
    }
  }

  for (const entry of results) {
    if (entry.message.endsWith('{') && entry.trace) {
      const jsonCandidate = '{\n' + entry.trace;
      try {
        const parsed = JSON.parse(jsonCandidate);
        entry.message = entry.message.slice(0, -1).trimEnd();
        entry.data = parsed;
        entry.trace = undefined;
      } catch {
        // Not valid JSON, leave as-is
      }
    }
  }

  return results;
}

/**
 * Formats action run parameters as a truncated summary string.
 * Prioritizes parameters with `primary: true`, then by `order`.
 */
export function truncateRunParameters(
  parameters: ArgumentsMap,
  parameterSchema: Record<string, ActionValueSchema> | undefined,
  maxLength: number = 60,
): string {
  if (!parameters || !parameterSchema) {
    return '';
  }

  const entries = Object.entries(parameters);
  if (entries.length === 0) {
    return '';
  }

  // Sort: primary params first, then by schema order (or alphabetically as fallback)
  const sorted = entries.sort(([keyA], [keyB]) => {
    const schemaA = parameterSchema[keyA];
    const schemaB = parameterSchema[keyB];
    const primaryA = schemaA && 'primary' in schemaA && schemaA.primary ? 0 : 1;
    const primaryB = schemaB && 'primary' in schemaB && schemaB.primary ? 0 : 1;
    if (primaryA !== primaryB) {
      return primaryA - primaryB;
    }
    return keyA.localeCompare(keyB);
  });

  let result = '';
  for (const [key, value] of sorted) {
    const formatFileRefs = (refs: FileRef[]) => refs.map(ref => `'${formatFileRef(ref)}'`);
    let formatted: string;
    if (isFileRef(value)) {
      formatted = formatFileRefs([value])[0];
    } else if (Array.isArray(value) && value.length > 0 && value.every(isFileRef)) {
      formatted = `[${formatFileRefs(value).join(', ')}]`;
    } else {
      formatted = typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
    }
    const pair = `${key}: ${formatted}`;
    if (result.length === 0) {
      result = pair;
    } else {
      const next = `${result}, ${pair}`;
      if (next.length > maxLength) {
        break;
      }
      result = next;
    }
  }

  if (result.length > maxLength) {
    result = result.substring(0, maxLength - 3) + '...';
  }

  return result;
}
