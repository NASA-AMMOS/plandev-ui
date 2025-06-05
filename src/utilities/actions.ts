import type {
  ActionValueSchema,
  ActionValueSchemaSequence,
  ActionValueSchemaSequenceList,
} from '@nasa-jpl/aerie-actions';
import type { ActionDefinition, ActionParametersMap, ActionRunSlim } from '../types/actions';
import type { ValueSchema, ValueSchemaOption } from '../types/schema';
import type { UserSequence } from '../types/sequencing';

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
