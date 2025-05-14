import type { ActionDefinition, ActionRunSlim } from '../types/actions';
import type { ParametersMap } from '../types/parameter';
import { getSearchParameterNumber } from './generic';
import { SearchParameters } from '../enums/searchParameters';
import { goto } from '$app/navigation';
import { base } from '$app/paths';

/**
 * Transforms a value schema record to a parameters map
 */
export function valueSchemaRecordToParametersMap(
  valueSchemaRecord: ActionDefinition['parameter_schema'],
): ParametersMap {
  return Object.entries(valueSchemaRecord).reduce((acc: ParametersMap, [key, valueSchema], i) => {
    acc[key] = { order: i, schema: valueSchema };
    return acc;
  }, {});
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
