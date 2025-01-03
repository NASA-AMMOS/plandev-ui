import type { JSONType, SchemaObject } from 'ajv';
import { isEqual, omitBy } from 'lodash-es';
import type {
  Argument,
  ArgumentsMap,
  FormParameter,
  ParametersMap,
  RequiredParametersList,
  ValueSource,
} from '../types/parameter';
import type { ValueSchema, ValueSchemaInt, ValueSchemaSeries, ValueSchemaStruct } from '../types/schema';
import { isEmpty } from './generic';

/**
 * Derive argument given input value, value schema, and optional default value.
 * Returns the derived value and the source of the value which follows this logic:
 * if the value is not null or undefined: "user"
 * else if the default value is not undefined: "mission"
 * otherwise there is no value so there is no value source: "none"
 */
export function getArgument(
  value: Argument,
  schema: ValueSchema,
  presetValue?: Argument,
  defaultValue?: Argument,
): { value: any; valueSource: ValueSource } {
  const type = schema.type;
  if (value !== null && value !== undefined) {
    if (presetValue === undefined) {
      return { value, valueSource: 'user on model' };
    } else {
      if (isEqual(value, presetValue)) {
        return { value, valueSource: 'preset' };
      }
      return { value, valueSource: 'user on preset' };
    }
  } else if ((value === null || value === undefined) && presetValue !== undefined) {
    return { value: presetValue, valueSource: 'preset' };
  } else if (defaultValue !== undefined) {
    return { value: defaultValue, valueSource: 'mission' };
  } else if (type === 'series') {
    return { value: [], valueSource: 'none' };
  } else if (type === 'struct') {
    const struct = Object.entries(schema.items).reduce((struct, [key, subSchema]) => {
      const { value } = getArgument(null, subSchema);
      return { ...struct, [key]: value };
    }, {});
    return { value: struct, valueSource: 'none' };
  } else {
    return { value: null, valueSource: 'none' };
  }
}

export function getArguments(argumentsMap: ArgumentsMap, formParameter: FormParameter): ArgumentsMap {
  const { name, value } = formParameter;
  const newArgument = { [name]: value };
  return omitBy({ ...argumentsMap, ...newArgument }, isEmpty);
}

export function getFormParameters(
  parametersMap: ParametersMap,
  argumentsMap: ArgumentsMap,
  requiredParameters: RequiredParametersList,
  presetArgumentsMap: ArgumentsMap = {},
  defaultArgumentsMap: ArgumentsMap = {},
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(([name, { order, schema }]) => {
    const arg: Argument = argumentsMap[name];
    const preset: Argument = presetArgumentsMap[name];
    const defaultArg: Argument | undefined = defaultArgumentsMap[name];
    const { value, valueSource } = getArgument(arg, schema, preset, defaultArg);
    const required = requiredParameters.indexOf(name) > -1;

    const formParameter: FormParameter = {
      errors: null,
      externalEvent: true,
      name,
      order,
      required,
      schema,
      value,
      valueSource,
    };

    return formParameter;
  });

  return formParameters;
}

/**
 * Returns a boolean for whether or not the provided parameter is recursive
 */
export function isRecParameter(parameter: FormParameter) {
  return parameter.schema.type === 'series' || parameter.schema.type === 'struct';
}

/**
 * Returns a default value for a given value schema.
 */
export function getValueSchemaDefaultValue(schema: ValueSchema): any {
  if (schema.type === 'boolean') {
    return false;
  } else if (schema.type === 'duration') {
    return 0;
  } else if (schema.type === 'int') {
    return 0;
  } else if (schema.type === 'path') {
    return '';
  } else if (schema.type === 'real') {
    return 0;
  } else if (schema.type === 'series') {
    const seriesValue = getValueSchemaDefaultValue(schema.items);
    return [seriesValue];
  } else if (schema.type === 'struct') {
    const struct = Object.entries(schema.items).reduce((struct, [key, subSchema]) => {
      const value = getValueSchemaDefaultValue(subSchema);
      return { ...struct, [key]: value };
    }, {});
    return struct;
  } else if (schema.type === 'string') {
    return '';
  } else if (schema.type === 'variant') {
    const variant = schema.variants.length ? schema.variants[0].key : '';
    return variant;
  } else {
    throw new Error('Cannot get a default value for given value schema');
  }
}

export function translateJsonSchemaArgumentsToValueSchema(jsonArguments: ArgumentsMap): ArgumentsMap {
  const translatedArgumentsMap = Object.entries(jsonArguments).reduce(
    (acc: ArgumentsMap, currentAttribute: [string, any]) => {
      const output = currentAttribute[1];
      if (typeof output === 'object' && 'properties' in output) {
        Object.entries(output['properties']).forEach((prop: [string, any]) => {
          output[prop[0]] = prop[1];
        });
        delete output['properties'];
      }
      acc[currentAttribute[0]] = output;
      return acc;
    },
    {} as ArgumentsMap,
  );
  return translatedArgumentsMap;
}

/**
 * Returns a list of ValueSchema objects that represent a JSON schema's properties.
 */
export function translateJsonSchemaToValueSchema(jsonSchema: SchemaObject | undefined): Record<string, ValueSchema> {
  if (jsonSchema === undefined) {
    throw new Error('Cannot convert a JSON schema of "undefined" to ValueSchema');
  }
  const properties: Record<string, object> | undefined = jsonSchema?.properties;
  const propertiesAsValueSchema: Record<string, ValueSchema> = {};
  if (properties === undefined) {
    throw new Error('Cannot convert invalid JSON schema without "properties" to a set of ValueSchema');
  }
  Object.entries(properties).forEach((property: [string, object]) => {
    // Handle nested objects, 'properties' => 'items'
    const propName: string = property[0];
    if ('type' in property[1]) {
      const {
        type: propType,
        properties: propProperties,
        items: propItems,
      } = property[1] as {
        items?: Record<'type', JSONType>;
        properties?: Record<string, object>;
        type: JSONType;
      };
      const propTranslated = translateJsonSchemaTypeToValueSchema(propType as JSONType, propProperties, propItems);
      if ('items' in propTranslated) {
        propTranslated.items = Object.entries(propTranslated.items).reduce(
          (acc: Record<string, ValueSchema>, currentItem: [string, ValueSchema]) => {
            const {
              type: currentType,
              properties: currentProperties,
              items: currentItems,
            } = currentItem[1] as {
              items?: Record<'type', JSONType>;
              properties?: Record<string, object>;
              type: JSONType;
            };
            const translatedItem = translateJsonSchemaTypeToValueSchema(
              currentType as JSONType,
              currentProperties,
              currentItems,
            );
            acc[currentItem[0]] = translatedItem;
            return acc;
          },
          {} as Record<string, ValueSchema>,
        );
      }
      propertiesAsValueSchema[propName] = propTranslated;
    } else {
      throw new Error('Cannot convert invalid JSON schema property - no "type" field exists');
    }
  });
  return propertiesAsValueSchema;
}

function translateJsonSchemaTypeToValueSchema(
  jsonSchemaType: JSONType,
  jsonSchemaProperties?: Record<string, object>,
  jsonSchemaItems?: Record<'type', JSONType>,
): ValueSchema {
  if (jsonSchemaType === 'number' || jsonSchemaType === 'integer') {
    return { type: 'int' } as ValueSchemaInt;
  } else if (jsonSchemaType === 'null') {
    throw new Error('Cannot convert "null" type property from JsonSchema to ValueSchema');
  } else if (jsonSchemaType === 'object') {
    if (jsonSchemaProperties === undefined) {
      throw new Error('Cannot convert "object" from JSON Schema without any nested "properties" defined');
    }
    return { items: jsonSchemaProperties, type: 'struct' } as ValueSchemaStruct;
  } else if (jsonSchemaType === 'array') {
    if (jsonSchemaItems === undefined) {
      throw new Error('Cannot convert "array" from JSON Schema without any nested "items" defined');
    } else if (Object.keys(jsonSchemaItems).length === 0) {
      throw new Error('Cannot convert "array" from JSON Schema without an "items" field defined');
    }
    // ValueSchema expects a singular type for the series where JSON Schema allows multiple. Take the first if the user gave multiple
    const firstItem = Object.entries(jsonSchemaItems)[0];
    const translatedItem: ValueSchema = translateJsonSchemaTypeToValueSchema(firstItem[1]);
    return { items: translatedItem, type: 'series' } as ValueSchemaSeries;
  } else {
    return { type: jsonSchemaType } as ValueSchema;
  }
}
