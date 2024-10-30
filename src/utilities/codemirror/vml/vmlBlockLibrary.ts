import type { SyntaxNode } from '@lezer/common';
import type {
  CommandDictionary,
  Enum,
  FswCommand,
  FswCommandArgument,
  Header,
  HwCommand,
  NumericRange,
} from '@nasa-jpl/aerie-ampcs';
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
} from './vmlConstants';

export function vmlBlockLibraryToCommandDictionary(vml: string, id?: string, path?: string): CommandDictionary {
  const parsed = VmlLanguage.parser.parse(vml);

  const enums: Enum[] = [];
  const hwCommands: HwCommand[] = [];
  const fswCommands: FswCommand[] = [
    ...(parsed.topNode.getChild(RULE_FUNCTIONS)?.getChildren(RULE_FUNCTION) ?? []).map(blockNode =>
      blockToCommandDef(blockNode, vml),
    ),
  ].filter((maybeCommandDef): maybeCommandDef is FswCommand => !!maybeCommandDef);

  const mission_name = '';
  const spacecraft_ids = [0];
  const version = '';

  const header: Readonly<Header> = {
    mission_name,
    schema_version: '1.0',
    spacecraft_ids,
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
    .filter((maybeArg): maybeArg is FswCommandArgument => !!maybeArg);

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

  const default_value: number | string | null = parseDefaultValue(parameterNode.firstChild, vml);
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
        const arg_type: 'float' | 'integer' | 'unsigned' = (
          {
            [TOKEN_DOUBLE]: 'float',
            [TOKEN_INT]: 'integer',
            [TOKEN_UINT]: 'unsigned',
          } as const
        )[dataKindNode.name];

        const bit_length: number = dataKindNode.name === TOKEN_DOUBLE ? 64 : 32;

        return {
          arg_type,
          bit_length,
          default_value: typeof default_value === 'number' ? default_value : null,
          description,
          name,
          range: isNumericRange(range) ? range : null,
          units,
        };
      }
      case TOKEN_STRING: {
        return {
          arg_type: 'var_string',
          default_value: typeof default_value === 'string' ? default_value : null,
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
          default_value,
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
      .filter((maybeRangeValue): maybeRangeValue is number | string | NumericRange => !!maybeRangeValue);

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
