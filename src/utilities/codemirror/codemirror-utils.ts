import type { SyntaxNode } from '@lezer/common';
import type {
  CommandDictionary,
  FswCommand,
  FswCommandArgument,
  FswCommandArgumentBoolean,
  FswCommandArgumentEnum,
  FswCommandArgumentFixedString,
  FswCommandArgumentFloat,
  FswCommandArgumentInteger,
  FswCommandArgumentNumeric,
  FswCommandArgumentRepeat,
  FswCommandArgumentUnsigned,
  FswCommandArgumentVarString,
  HwCommand,
} from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import type { ArgTextDef, NumberArg, StringArg } from '../../types/sequencing';
import { fswCommandArgDefault } from '../sequence-editor/command-dictionary';
import type { CommandInfoMapper } from './commandInfoMapper';

export function isFswCommand(command: FswCommand | HwCommand): command is FswCommand {
  return (command as FswCommand).type === 'fsw_command';
}

export function isHwCommand(command: FswCommand | HwCommand): command is HwCommand {
  return (command as HwCommand).type === 'hw_command';
}

export function isFswCommandArgumentEnum(arg: FswCommandArgument): arg is FswCommandArgumentEnum {
  return arg.arg_type === 'enum';
}

export function isFswCommandArgumentInteger(arg: FswCommandArgument): arg is FswCommandArgumentInteger {
  return arg.arg_type === 'integer';
}

export function isFswCommandArgumentFloat(arg: FswCommandArgument): arg is FswCommandArgumentFloat {
  return arg.arg_type === 'float';
}

export function isFswCommandArgumentNumeric(arg: FswCommandArgument): arg is FswCommandArgumentNumeric {
  return arg.arg_type === 'numeric';
}

export function isFswCommandArgumentUnsigned(arg: FswCommandArgument): arg is FswCommandArgumentUnsigned {
  return arg.arg_type === 'unsigned';
}

export function isFswCommandArgumentRepeat(arg: FswCommandArgument): arg is FswCommandArgumentRepeat {
  return arg.arg_type === 'repeat';
}

export function isFswCommandArgumentVarString(arg: FswCommandArgument): arg is FswCommandArgumentVarString {
  return arg.arg_type === 'var_string';
}

export function isFswCommandArgumentFixedString(arg: FswCommandArgument): arg is FswCommandArgumentFixedString {
  return arg.arg_type === 'fixed_string';
}

export function isFswCommandArgumentBoolean(arg: FswCommandArgument): arg is FswCommandArgumentBoolean {
  return arg.arg_type === 'boolean';
}

export function isNumberArg(arg: FswCommandArgument): arg is NumberArg {
  return (
    isFswCommandArgumentFloat(arg) ||
    isFswCommandArgumentInteger(arg) ||
    isFswCommandArgumentNumeric(arg) ||
    isFswCommandArgumentUnsigned(arg)
  );
}

export function isStringArg(arg: FswCommandArgument): arg is StringArg {
  return isFswCommandArgumentVarString(arg) || isFswCommandArgumentFixedString(arg);
}

export function addDefaultArgs(
  commandDictionary: CommandDictionary,
  view: EditorView,
  commandNode: SyntaxNode,
  argDefs: FswCommandArgument[],
  commandInfoMapper: CommandInfoMapper,
) {
  const insertPosition = commandInfoMapper.getArgumentAppendPosition(commandNode);
  if (insertPosition !== undefined) {
    const str = commandInfoMapper.formatArgumentArray(
      argDefs.map(argDef => fswCommandArgDefault(argDef, commandDictionary.enumMap)),
      commandNode,
    );
    const transaction = view.state.update({
      changes: { from: insertPosition, insert: str },
    });
    view.dispatch(transaction);
  }
}

export function getMissingArgDefs(argInfoArray: ArgTextDef[]): FswCommandArgument[] {
  return argInfoArray
    .filter((argInfo): argInfo is { argDef: FswCommandArgument } => !argInfo.node && !!argInfo.argDef)
    .map(argInfo => argInfo.argDef);
}

export function getDefaultVariableArgs(parameters: VariableDeclaration[]): string[] {
  return parameters.map(parameter => {
    switch (parameter.type) {
      case 'STRING':
        return `"${parameter.name}"`;
      case 'FLOAT':
        return parameter.allowable_ranges && parameter.allowable_ranges.length > 0
          ? parameter.allowable_ranges[0].min
          : 0;
      case 'INT':
      case 'UINT':
        return parameter.allowable_ranges && parameter.allowable_ranges.length > 0
          ? parameter.allowable_ranges[0].min
          : 0;
      case 'ENUM':
        return parameter.allowable_values && parameter.allowable_values.length > 0
          ? `"${parameter.allowable_values[0]}"`
          : parameter.enum_name
            ? `"${parameter.enum_name}"`
            : 'UNKNOWN';
      default:
        return `ERROR:"${parameter.name}"`;
    }
  }) as string[];
}

export function addDefaultVariableArgs(
  parameters: VariableDeclaration[],
  view: EditorView,
  commandNode: SyntaxNode,
  commandInfoMapper: CommandInfoMapper,
) {
  const insertPosition = commandInfoMapper.getArgumentAppendPosition(commandNode);
  if (insertPosition !== undefined) {
    const str = commandInfoMapper.formatArgumentArray(getDefaultVariableArgs(parameters), commandNode);
    const transaction = view.state.update({
      changes: { from: insertPosition, insert: str },
    });
    view.dispatch(transaction);
  }
}

export function isQuoted(s: string): boolean {
  return s.startsWith('"') && s.endsWith('"');
}

export function unquoteUnescape(s: string): string {
  if (isQuoted(s) && s.length > 1) {
    return s.slice(1, -1).replaceAll('\\"', '"');
  }
  return s;
}

export function quoteEscape(s: string): string {
  return `"${s.replaceAll('"', '\\"')}"`;
}

export function removeEscapedQuotes(text: string): string;
export function removeEscapedQuotes(text: number): number;
export function removeEscapedQuotes(text: boolean): boolean;
export function removeEscapedQuotes(text: string | number | boolean): string | number | boolean {
  if (typeof text === 'string') {
    return text.replace(/\\"|"(?!\\")/g, '"').trim();
  }
  return text;
}

export function parseNumericArg(argText: string, dictArgType: 'float' | 'integer' | 'numeric' | 'unsigned') {
  switch (dictArgType) {
    case 'float':
    case 'numeric':
      return parseFloat(argText);
  }
  return parseInt(argText);
}

export function isHexValue(argText: string) {
  return /^0x[\da-f]+$/i.test(argText);
}

export function decodeInt32Array(encoded: string[]) {
  return encoded
    .map(charAsHex => {
      const n = Number(charAsHex);
      return String.fromCodePoint((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
    })
    .join('');
}

export function encodeInt32Array(s: string) {
  const encoded: string[] = [];
  for (let i = 0; i < s.length; i += 4) {
    encoded.push(s.codePointAt(i)?.toString(16) ?? '00');
  }
  return encoded;
}
