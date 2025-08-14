import type {
  ActionValueSchema,
  ActionValueSchemaSequence,
  ActionValueSchemaSequenceList,
} from '@nasa-jpl/aerie-actions';
import type { ActionDefinition, ActionParametersMap, ActionRunSlim } from '../types/actions';
import type { ValueSchema, ValueSchemaOption } from '../types/schema';
import type { UserSequence } from '../types/sequencing';
import { getSearchParameterNumber } from './generic';
import { SearchParameters } from '../enums/searchParameters';
import { base } from '$app/paths';
import { goto } from '$app/navigation';

/**
 * Typeguard for determining if a schema is an action sequence/sequenceList schema
 */
export function isActionValueSchemaSequence(
  schema: ValueSchema | ActionValueSchema,
): schema is ActionValueSchemaSequence | ActionValueSchemaSequenceList {
  return (schema as ActionValueSchema).type === 'sequence' || (schema as ActionValueSchema).type === 'sequenceList';
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

export function getUserSequencesInWorkspace(
  sequences: UserSequence[],
  workspaceId: number | null,
): ValueSchemaOption[] {
  if (workspaceId === null) {
    return [];
  }
  return sequences
    .filter(seq => workspaceId === seq.workspace_id)
    .map(seq => ({
      display: seq.name,
      value: `${seq.id}`,
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

export function openActionRun(id: number, newTab?: boolean) {
  const workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  const actionRunUrl = `${base}/sequencing/actions/runs/${id}${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`;
  if (newTab === true) {
    window.open(actionRunUrl, '_blank');
  } else {
    goto(actionRunUrl);
  }
}
