import type { ActionDefinition } from '../types/actions';
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
