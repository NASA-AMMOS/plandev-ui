import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type {
  ActionValueSchema,
  ActionValueSchemaFile,
  ActionValueSchemaFileList,
  ActionValueSchemaSequence,
  ActionValueSchemaSequenceList,
} from '@nasa-jpl/aerie-actions';
import { Status } from '../enums/status';
import type { ActionDefinition, ActionDefinitionVersion, ActionParametersMap, ActionRunSlim } from '../types/actions';
import type { ArgumentsMap } from '../types/parameter';
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
    } else if (schema.type === 'variant' && schema.variants.length > 0) {
      acc[key] = schema.variants[0].key;
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
    const formatted = typeof value === 'string' ? `'${value}'` : JSON.stringify(value);
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
