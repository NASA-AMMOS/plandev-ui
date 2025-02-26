import type { SyntaxNode } from '@lezer/common';
import type {
  CommandDictionary,
  Enum,
  FswCommand,
  FswCommandArgument,
  FswCommandArgumentEnum,
  FswCommandArgumentFloat,
  FswCommandArgumentInteger,
  FswCommandArgumentUnsigned,
  FswCommandArgumentVarString,
  Header,
  HwCommand,
  NumericRange,
} from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { LibrarySequence } from '../../../../types/sequencing';
import { filterEmpty } from '../../../generic';
import { VmlLanguage } from './vml';
import {
  RULE_BLOCK,
  RULE_COMMENT,
  RULE_COMMON_FUNCTION,
  RULE_CONSTANT,
  RULE_DATA_KIND,
  RULE_FUNCTION,
  RULE_FUNCTION_NAME,
  RULE_FUNCTIONS,
  RULE_INPUT_OUTPUT_PARAMETER,
  RULE_INPUT_RANGE,
  RULE_INPUT_VALUE,
  RULE_OPTIONAL_DEFAULT_INPUT_VALUE,
  RULE_OPTIONAL_VALUE_LIST,
  RULE_PARAMETER,
  RULE_PARAMETERS,
  RULE_VARIABLE_NAME,
  TOKEN_ABSOLUTE_TIME,
  TOKEN_DOUBLE,
  TOKEN_DOUBLE_CONST,
  TOKEN_HEX_CONST,
  TOKEN_INT,
  TOKEN_INT_CONST,
  TOKEN_INT_RANGE_CONST,
  TOKEN_RELATIVE_TIME,
  TOKEN_STRING,
  TOKEN_TIME,
  TOKEN_UINT,
  TOKEN_UINT_CONST,
} from './vml-constants';

export function vmlBlockLibraryToCommandDictionary(vml: string, id?: string, path?: string): CommandDictionary {
  const parsed = VmlLanguage.parser.parse(vml);

  const enums: Enum[] = [];
  const hwCommands: HwCommand[] = [];
  const fswCommands: FswCommand[] = [
    ...(parsed.topNode.getChild(RULE_FUNCTIONS)?.getChildren(RULE_FUNCTION) ?? []).map(blockNode =>
      blockToCommandDef(blockNode, vml),
    ),
  ].filter(filterEmpty);

  const missionName = '';
  const spacecraftIds = [0];
  const version = '';

  const header: Readonly<Header> = {
    mission_name: missionName,
    schema_version: '1.0',
    spacecraft_ids: spacecraftIds,
    version,
  };

  return {
    enumMap: Object.fromEntries(enums.map(e => [e.name, e])),
    enums,
    fswCommandMap: Object.fromEntries(fswCommands.map(cmd => [cmd.stem, cmd])),
    fswCommands,
    header,
    hwCommandMap: Object.fromEntries(hwCommands.map(cmd => [cmd.stem, cmd])),
    hwCommands,
    id: id ?? '',
    path: path ?? '',
  };
}

function blockToCommandDef(functionNode: SyntaxNode, vml: string): FswCommand | null {
  const commonFunctionNode = functionNode.getChild(RULE_BLOCK)?.getChild(RULE_COMMON_FUNCTION);

  const stemNode = commonFunctionNode?.getChild(RULE_FUNCTION_NAME);
  const stem = stemNode && vml.slice(stemNode.from, stemNode.to);

  const parameterNodes = commonFunctionNode?.getChild(RULE_PARAMETERS)?.getChildren(RULE_PARAMETER) ?? [];
  const fswArguments: FswCommandArgument[] = parameterNodes
    ?.map(parameterNode => inputToArgument(parameterNode, vml))
    .filter(filterEmpty);

  if (stem) {
    return {
      argumentMap: Object.fromEntries(fswArguments.map(arg => [arg.name, arg])),
      arguments: fswArguments,
      description: '',
      stem,
      type: 'fsw_command',
    };
  }
  return null;
}

function inputToArgument(parameterNode: SyntaxNode, vml: string): FswCommandArgument | null {
  const nameNode = parameterNode.firstChild?.getChild(RULE_VARIABLE_NAME);
  const name = nameNode && vml.slice(nameNode?.from, nameNode.to);

  if (!name) {
    return null;
  }

  const defaultValue: number | string | null = parseDefaultValue(parameterNode.firstChild, vml);
  const description = parameterNodeToDescription(parameterNode, vml);
  const units = ''; // not specified in VML
  const range = parseRange(parameterNode.firstChild, vml);
  // string arguments with ranges of string[] could converted to enums
  // consider making singleton ranges 'fixed_string' type

  const dataKindNode = parameterNode.firstChild?.getChild(RULE_DATA_KIND)?.firstChild;
  if (dataKindNode) {
    switch (dataKindNode.name) {
      case TOKEN_UINT:
      case TOKEN_INT:
      case TOKEN_DOUBLE: {
        const argType: 'float' | 'integer' | 'unsigned' = (
          {
            [TOKEN_DOUBLE]: 'float',
            [TOKEN_INT]: 'integer',
            [TOKEN_UINT]: 'unsigned',
          } as const
        )[dataKindNode.name];

        const bitLength: number = dataKindNode.name === TOKEN_DOUBLE ? 64 : 32;

        return {
          arg_type: argType,
          bit_length: bitLength,
          default_value: typeof defaultValue === 'number' ? defaultValue : null,
          description,
          name,
          range: isNumericRange(range) ? range : null,
          units,
        };
      }
      case TOKEN_STRING: {
        return {
          arg_type: 'var_string',
          default_value: typeof defaultValue === 'string' ? defaultValue : null,
          description,
          max_bit_length: null,
          name,
          prefix_bit_length: null,
          valid_regex: null,
        };
      }
      case TOKEN_TIME:
      case TOKEN_ABSOLUTE_TIME:
      case TOKEN_RELATIVE_TIME: {
        return {
          arg_type: 'time',
          bit_length: 32,
          default_value: defaultValue,
          description,
          name,
          units,
        };
      }
    }
  }

  // default to string type, no specific handling for LOGICAL, UNKNOWN
  return {
    arg_type: 'var_string',
    default_value: '',
    description,
    max_bit_length: null,
    name,
    prefix_bit_length: null,
    valid_regex: null,
  };
}

function isNumericRange(range: any): range is NumericRange {
  const castedRange = range as NumericRange;
  return typeof castedRange?.min === 'number' && typeof range?.max === 'number';
}

function parseRange(parameterNode: SyntaxNode | null, vml: string): null | string[] | number[] | NumericRange {
  const defaultValueNode = parameterNode?.getChild(RULE_OPTIONAL_VALUE_LIST)?.getChildren(RULE_INPUT_VALUE);
  if (defaultValueNode) {
    const rangeValues: (number | string | NumericRange)[] = defaultValueNode
      .map(defValNode => {
        const constantNode = defValNode.getChild(RULE_CONSTANT);
        if (constantNode) {
          return getConstantValue(constantNode, vml);
        }

        const rangeNodes = defValNode.getChild(RULE_INPUT_RANGE)?.getChild(TOKEN_INT_RANGE_CONST);
        if (rangeNodes) {
          const minMaxStrings = vml.slice(rangeNodes.from, rangeNodes.to).split('..');
          if (minMaxStrings.length === 2) {
            const [min, max] = vml
              .slice(rangeNodes.from, rangeNodes.to)
              .split('..')
              .map(i => parseInt(i, 10));
            return { max, min };
          }
        }
        return null;
      })
      .filter(filterEmpty);

    // mixed arrays aren't resolved due to undefined meaning
    if (rangeValues.every(rangeValue => typeof rangeValue === 'number')) {
      return rangeValues as number[];
    } else if (rangeValues.every(rangeValue => typeof rangeValue === 'string')) {
      return rangeValues as string[];
    } else if (rangeValues.every(isNumericRange)) {
      // ampcs dictionary doesn't support discontinuous ranges for numeric values, create span covering all ranges
      return {
        max: Math.max(...rangeValues.map(range => range.max)),
        min: Math.min(...rangeValues.map(range => range.min)),
      };
    }
  }
  return null;
}

function parseDefaultValue(parameterNode: SyntaxNode | null, vml: string): number | string | null {
  const defaultValueNode = parameterNode?.getChild(RULE_OPTIONAL_DEFAULT_INPUT_VALUE)?.getChild(RULE_CONSTANT);
  return defaultValueNode ? getConstantValue(defaultValueNode, vml) : null;
}

function getConstantValue(constantNode: SyntaxNode, vml: string): number | string | null {
  const constantValueString = vml.slice(constantNode.from, constantNode.to);
  switch (constantNode.firstChild?.name) {
    case TOKEN_UINT_CONST:
    case TOKEN_INT_CONST:
      return parseInt(constantValueString, 10);
    case TOKEN_HEX_CONST:
      return parseInt(constantValueString, 16);
    case TOKEN_DOUBLE_CONST:
      return parseFloat(constantValueString);
  }

  return null;
}

function parameterNodeToDescription(parameterNode: SyntaxNode, vml: string): string {
  const isInputOutputParameter = !!parameterNode.getChild(RULE_INPUT_OUTPUT_PARAMETER);
  const ioType = isInputOutputParameter ? '[INPUT_OUTPUT] ' : '[INPUT] ';
  const commentNode = parameterNode.firstChild?.getChild(RULE_COMMENT);
  return commentNode ? ioType + vml.slice(commentNode.from, commentNode.to).slice(1).trim() : '';
}

function variableToParam(
  variable: VariableDeclaration,
):
  | FswCommandArgumentEnum
  | FswCommandArgumentFloat
  | FswCommandArgumentInteger
  | FswCommandArgumentVarString
  | FswCommandArgumentUnsigned {
  const bitLength = null;
  const defaultValue = null;
  const description = '';
  const name = variable.name;
  const range = null;
  const units = '';
  switch (variable.type) {
    case 'ENUM':
      return {
        arg_type: 'enum',
        bit_length: bitLength,
        default_value: defaultValue,
        description,
        enum_name: name,
        name,
        range,
      };
    case 'STRING':
      return {
        arg_type: 'var_string',
        default_value: defaultValue,
        description,
        max_bit_length: null,
        name,
        prefix_bit_length: null,
        valid_regex: null,
      };
    case 'INT':
      return {
        arg_type: 'integer',
        bit_length: bitLength,
        default_value: defaultValue,
        description,
        name,
        range,
        units,
      };
    case 'UINT':
      return {
        arg_type: 'unsigned',
        bit_length: bitLength,
        default_value: defaultValue,
        description,
        name,
        range,
        units,
      };
    case 'FLOAT':
      return {
        arg_type: 'float',
        bit_length: bitLength,
        default_value: defaultValue,
        description,
        name,
        range,
        units,
      };
  }
}

export function librarySequenceToFswCommand(librarySequence: LibrarySequence): FswCommand {
  const cmdArguments: FswCommandArgument[] = librarySequence.parameters.map(variable => variableToParam(variable));
  return {
    argumentMap: Object.fromEntries(cmdArguments.map(arg => [arg.name, arg])),
    arguments: cmdArguments,
    description: 'library sequence',
    stem: librarySequence.name,
    type: 'fsw_command',
  };
}
