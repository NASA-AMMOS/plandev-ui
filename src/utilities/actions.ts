import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type {
  ActionValueSchema,
  ActionValueSchemaFile,
  ActionValueSchemaFileList,
  ActionValueSchemaSequence,
  ActionValueSchemaSequenceList,
} from '@nasa-jpl/aerie-actions';
import type { ActionDefinition, ActionParametersMap, ActionRunSlim } from '../types/actions';
import type { ValueSchema, ValueSchemaOption } from '../types/schema';
import type { WorkspaceTreeNodeWithFullPath } from '../types/workspace-tree-view';
import { getActionsUrl } from './routes';

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
  valueSchemaRecord: ActionDefinition['parameter_schema'],
): ActionParametersMap {
  return Object.entries(valueSchemaRecord).reduce((acc: ActionParametersMap, [key, valueSchema], i) => {
    acc[key] = { order: i, schema: valueSchema };
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

export function getActionParametersOfType(action: ActionDefinition, parameterType: string): string[] {
  const parametersOfType: string[] = [];
  for (const [key, value] of Object.entries(action.parameter_schema)) {
    if (parameterType === value.type) {
      parametersOfType.push(key);
    }
  }
  return parametersOfType;
}

export function openActionRun(workspaceId: number, id: number, newTab?: boolean) {
  const actionRunUrl = getActionsUrl(base, workspaceId, id);
  if (newTab === true) {
    window.open(actionRunUrl, '_blank');
  } else {
    goto(actionRunUrl);
  }
}
