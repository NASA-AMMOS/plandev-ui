import type { ActionDefinition, ActionRunSlim } from '../types/actions';
import type {
  ActionValueSchemaOption,
  ActionValueSchemaSequenceListWithOptions,
  ActionValueSchemaSequenceWithOptions,
  ParametersMap,
  UIActionValueSchema,
} from '../types/parameter';
import type { UserSequence } from '../types/sequencing';
import type { ValueSchema } from '../types/schema';

// TODO explain yourself
export function isActionValueSchemaWithOptions(
  schema: UIActionValueSchema | ValueSchema,
): schema is ActionValueSchemaSequenceWithOptions | ActionValueSchemaSequenceListWithOptions {
  return (
    (schema as ActionValueSchemaSequenceWithOptions | ActionValueSchemaSequenceListWithOptions).type === 'sequence' ||
    (schema as ActionValueSchemaSequenceWithOptions | ActionValueSchemaSequenceListWithOptions).type === 'sequenceList'
  );
}

/**
 * Transforms a value schema record to a parameters map
 */
export function valueSchemaRecordToParametersMap(
  valueSchemaRecord: ActionDefinition['parameter_schema'],
  options?: ActionValueSchemaOption[],
): ParametersMap {
  return Object.entries(valueSchemaRecord).reduce((acc: ParametersMap, [key, valueSchema], i) => {
    const actionValueSchema: UIActionValueSchema = valueSchema as UIActionValueSchema;
    if (isActionValueSchemaWithOptions(actionValueSchema) && options !== undefined) {
      actionValueSchema.options = options;
    }
    acc[key] = { order: i, schema: actionValueSchema };
    return acc;
  }, {});
}

export function getUserSequencesInWorkspace(
  sequences: UserSequence[],
  workspaceId: number | null,
): ActionValueSchemaOption[] {
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
