import type { SyntaxNode } from '@lezer/common';
import type {
  CommandDictionary,
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
} from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import { TOKEN_REPEAT_ARG } from '../../constants/seq-n-grammar-constants';
import { fswCommandArgDefault } from '../sequence-editor/command-dictionary';

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

export type StringArg = FswCommandArgumentVarString | FswCommandArgumentFixedString;

export type NumberArg =
  | FswCommandArgumentFloat
  | FswCommandArgumentInteger
  | FswCommandArgumentNumeric
  | FswCommandArgumentUnsigned;

export type ArgTextDef = {
  argDef?: FswCommandArgument;
  children?: ArgTextDef[];
  node?: SyntaxNode;
  parentArgDef?: FswCommandArgumentRepeat;
  text?: string;
};

export function addDefaultArgs(
  commandDictionary: CommandDictionary,
  view: EditorView,
  commandNode: SyntaxNode,
  argDefs: FswCommandArgument[],
) {
  let insertPosition: undefined | number = undefined;
  const str = ' ' + argDefs.map(argDef => fswCommandArgDefault(argDef, commandDictionary.enumMap)).join(' ');
  const argsNode = commandNode.getChild('Args');
  const stemNode = commandNode.getChild('Stem');
  if (stemNode) {
    insertPosition = argsNode?.to ?? stemNode.to;
    if (insertPosition !== undefined) {
      const transaction = view.state.update({
        changes: { from: insertPosition, insert: str },
      });
      view.dispatch(transaction);
    }
  } else if (commandNode.name === TOKEN_REPEAT_ARG) {
    insertPosition = commandNode.to - 1;
    if (insertPosition !== undefined) {
      const transaction = view.state.update({
        changes: { from: insertPosition, insert: str },
      });
      view.dispatch(transaction);
    }
  }
}

export function getMissingArgDefs(argInfoArray: ArgTextDef[]) {
  return argInfoArray
    .filter((argInfo): argInfo is { argDef: FswCommandArgument } => !argInfo.node && !!argInfo.argDef)
    .map(argInfo => argInfo.argDef);
}

export function isQuoted(s: string) {
  return s.startsWith('"') && s.endsWith('"');
}

export function unquoteUnescape(s: string) {
  if (isQuoted(s) && s.length > 1) {
    return s.slice(1, -1).replaceAll('\\"', '"');
  }
  return s;
}

export function quoteEscape(s: string) {
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
