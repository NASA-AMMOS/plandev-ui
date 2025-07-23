import type { ActionValueSchema } from '@nasa-jpl/aerie-actions';
import type { JSONType, SchemaObject } from 'ajv';
import { isEqual, omitBy } from 'lodash-es';
import type { ActionParametersMap } from '../types/actions';
import type {
  Argument,
  ArgumentsMap,
  FormParameter,
  ParametersMap,
  RequiredParametersList,
  ValueSource,
} from '../types/parameter';
import type {
  UIValueSchemaWithOptionsMultiple,
  UIValueSchemaWithOptionsSingle,
  ValueSchema,
  ValueSchemaInt,
  ValueSchemaOption,
  ValueSchemaSeries,
  ValueSchemaStruct,
} from '../types/schema';
import { isActionValueSchemaSequence } from './actions';
import { isEmpty } from './generic';

export function isParameterWithOptions(
  schema: ValueSchema | UIValueSchemaWithOptionsSingle | UIValueSchemaWithOptionsMultiple,
): schema is UIValueSchemaWithOptionsSingle | UIValueSchemaWithOptionsMultiple {
  return (
    (schema as UIValueSchemaWithOptionsSingle).type === 'options-single' ||
    (schema as UIValueSchemaWithOptionsMultiple).type === 'options-multiple'
  );
}

/**
 * Derive argument given input value, value schema, and optional default value.
 * Returns the derived value and the source of the value which follows this logic:
 * if the value is not null or undefined: "user"
 * else if the default value is not undefined: "mission"
 * otherwise there is no value so there is no value source: "none"
 */
export function getArgument(
  value: Argument,
  schema: ValueSchema | ActionValueSchema,
  presetValue?: Argument,
  defaultValue?: Argument,
  ignoreValueSource?: boolean,
): { value: any; valueSource: ValueSource } {
  const type = schema.type;
  if (value !== null && value !== undefined) {
    if (ignoreValueSource === true) {
      return { value, valueSource: 'none' };
    } else if (presetValue === undefined) {
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
  parametersMap: ParametersMap | ActionParametersMap,
  argumentsMap: ArgumentsMap,
  requiredParameters: RequiredParametersList,
  presetArgumentsMap: ArgumentsMap = {},
  defaultArgumentsMap: ArgumentsMap = {},
  dropdownOptions: ValueSchemaOption[] = [],
  optionLabel: string = 'option',
  ignoreValueSource?: boolean,
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(([name, { order, schema }]) => {
    const formParameterSchema: ValueSchema | UIValueSchemaWithOptionsSingle | UIValueSchemaWithOptionsMultiple = schema;

    const arg: Argument = argumentsMap[name];
    const preset: Argument = presetArgumentsMap[name];
    const defaultArg: Argument | undefined = defaultArgumentsMap[name];
    const { value, valueSource } = getArgument(arg, schema, preset, defaultArg, ignoreValueSource);
    const required = requiredParameters.indexOf(name) > -1;
    let errors: string[] | null = null;
    let isMultiSelect: boolean = false;
    const newFormParameterSchema: ValueSchema | UIValueSchemaWithOptionsSingle | UIValueSchemaWithOptionsMultiple = {
      ...formParameterSchema,
    };
    if (isActionValueSchemaSequence(schema) || schema.type === 'options-single' || schema.type === 'options-multiple') {
      (newFormParameterSchema as UIValueSchemaWithOptionsSingle | UIValueSchemaWithOptionsMultiple).options =
        dropdownOptions;
      (newFormParameterSchema as UIValueSchemaWithOptionsSingle | UIValueSchemaWithOptionsMultiple).label = optionLabel;
      if (schema.type === 'sequence') {
        newFormParameterSchema.type = 'options-single';
      } else if (schema.type === 'sequenceList') {
        newFormParameterSchema.type = 'options-multiple';
      }

      if (schema.type === 'options-multiple') {
        isMultiSelect = true;
      }

      if (value) {
        const optionValues: string[] = isMultiSelect ? value : [value];
        // Determine if there are selected options in the value that are no longer present in the list of options
        const missingOptions = optionValues.filter(optionValue => {
          const option = dropdownOptions.find(dropdownOption => dropdownOption.display === optionValue);
          return option === undefined;
        });

        if (dropdownOptions.length > 0 && missingOptions.length > 0) {
          // format missing options like: 'option 1', 'option 2' not found
          errors = [`'${missingOptions.join("', '")}' not found`];
        }
      }
    }

    const formParameter: FormParameter = {
      errors,
      externalEvent: true,
      name,
      order,
      required,
      schema: newFormParameterSchema,
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

/**
 * Returns a finalized arguments object that does not include any extraneous arguments
 * using the provided schema for structs
 */
export function getCleansedStructArguments(structArguments: ArgumentsMap, schema?: ValueSchema) {
  let cleansedArguments: Argument = {};
  if (schema && schema.type === 'struct') {
    cleansedArguments = Object.keys(structArguments).reduce((prevCleansedArguments: Argument, argumentKey: string) => {
      const argumentValue = structArguments[argumentKey];

      const doesArgumentExistInSchema =
        Object.keys(schema.items).find(parameterName => parameterName === argumentKey) != null;
      if (doesArgumentExistInSchema) {
        return {
          ...prevCleansedArguments,
          [argumentKey]: argumentValue,
        };
      }
      return prevCleansedArguments;
    }, {});
  }
  return cleansedArguments;
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
        const itemsToTranslate =
          propTranslated.items.type === 'struct' ? propTranslated.items.items : propTranslated.items;
        const translatedItems = Object.entries(itemsToTranslate).reduce(
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
        if (propTranslated.items.type === 'struct') {
          propTranslated.items.items = translatedItems;
        } else {
          propTranslated.items = translatedItems;
        }
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
  jsonSchemaItems?: Record<string, JSONType> | { properties: Record<string, object>; type: string },
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
    const firstItemType = jsonSchemaItems.type;

    let translatedItem: ValueSchema | undefined = undefined;
    // Required to properly nest objects within arrays (i.e., structs within series)
    if (firstItemType === 'object') {
      const nestedProperties = jsonSchemaItems.properties as Record<string, object>;
      translatedItem = translateJsonSchemaTypeToValueSchema(firstItemType, nestedProperties);
    } else {
      translatedItem = translateJsonSchemaTypeToValueSchema(firstItemType as JSONType);
    }
    return { items: translatedItem, type: 'series' } as ValueSchemaSeries;
  } else {
    return { type: jsonSchemaType } as ValueSchema;
  }
}
