import type { ActionDefinition, ActionRunSlim } from '../types/actions';
import type { ParametersMap } from '../types/parameter';

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
