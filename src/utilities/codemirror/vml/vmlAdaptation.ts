import { snippet, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { CommandDictionary, EnumMap, FswCommand, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { GlobalType } from '../../../types/global-type';
import type { LibrarySequence } from '../../../types/sequencing';
import { getNearestAncestorNodeOfType } from '../../sequence-editor/tree-utils';
import { VmlLanguage } from './vml';
import { vmlBlockLibraryToCommandDictionary } from './vmlBlockLibrary';
import {
  RULE_FUNCTION_NAME,
  RULE_ISSUE,
  RULE_STATEMENT,
  RULE_TIME_TAGGED_STATEMENT,
  TOKEN_STRING_CONST,
  TOKEN_TIME_CONST,
} from './vmlConstants';
import { getArgumentPosition } from './vmlTreeUtils';

function structureSnippets(timePrefix: string) {
  return [
    {
      label: 'Insert WHILE loop',
      snippetText: `${timePrefix}WHILE \${condition} DO\nR00:00:00.00 END_WHILE`,
    },
    {
      label: 'Insert FOR loop',
      snippetText: `${timePrefix}FOR i := \${start} TO \${end} STEP \${step} DO\nR00:00:00.00 END_FOR`,
    },
    {
      label: 'Insert IF conditional',
      snippetText: `${timePrefix}IF \${condition1} THEN\nR00:00:00.00 ELSE_IF \${condition2} THEN\nR00:00:00.00 ELSE\nR00:00:00.00 END_IF`,
    },
  ].map(({ label, snippetText }) => ({
    apply: snippet(snippetText),
    label,
    section: 'Command',
    type: 'function',
  }));
}

export function vmlAutoComplete(
  commandDictionary: CommandDictionary | null,
  globals: GlobalType[],
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext) => {
    if (!commandDictionary) {
      return null;
    }

    const tree = syntaxTree(context.state);
    const nodeBefore = tree.resolveInner(context.pos, -1);
    const nodeCurrent = tree.resolveInner(context.pos, 0);

    const selection = context.state.selection;
    if (selection.ranges.length === 1) {
      const cursorLine = context.state.doc.lineAt(selection.ranges[0].to);
      const cursorLineTrimmed = cursorLine.text.trim();

      if (!cursorLineTrimmed) {
        // line is empty
        return {
          from: context.pos,
          options: structureSnippets('R00:00:00.00 '),
        };
      } else if (nodeCurrent.name === RULE_TIME_TAGGED_STATEMENT) {
        const timeConstToken = nodeCurrent.getChild(TOKEN_TIME_CONST);
        if (timeConstToken) {
          if (context.state.sliceDoc(timeConstToken.from, timeConstToken.to) === cursorLineTrimmed) {
            // line is only a time constant
            return {
              from: context.pos,
              options: structureSnippets(''),
            };
          }
        }
      }
    }

    if (nodeBefore.name === RULE_ISSUE) {
      return {
        from: context.pos,
        options: commandDictionary.fswCommands.map((fswCommand: FswCommand) => ({
          apply: getStemAndDefaultArguments(commandDictionary, fswCommand),
          info: fswCommand.description,
          label: fswCommand.stem,
          section: 'Command',
          type: 'function',
        })),
      };
    } else if (nodeCurrent.name === TOKEN_STRING_CONST) {
      // also show if before argument

      const containingStatement = getNearestAncestorNodeOfType(nodeCurrent, [RULE_STATEMENT]);
      if (containingStatement) {
        const functionNameNode = containingStatement.firstChild?.getChild(RULE_FUNCTION_NAME);
        if (functionNameNode) {
          const stem = context.state.sliceDoc(functionNameNode.from, functionNameNode.to);
          const cmdDef = commandDictionary.fswCommandMap[stem];
          if (!cmdDef) {
            return null;
          }

          const argPos = getArgumentPosition(nodeCurrent);
          if (argPos === -1) {
            return null;
          }

          const argDef = cmdDef.arguments[argPos];
          if (!argDef || argDef.arg_type !== 'enum') {
            return null;
          }

          const enumOptions: CompletionResult['options'] = commandDictionary.enumMap[argDef.enum_name].values.map(
            enumValue => ({
              apply: `"${enumValue.symbol}"`,
              label: `${enumValue.symbol} (${enumValue.numeric})`,
              section: `${argDef.name} values`,
              type: 'keyword',
            }),
          );

          // 'builtin', 'atom'
          const globalOptions: CompletionResult['options'] = globals.map(g => ({
            apply: g.name,
            label: `${g.name} (GLOBAL)`,
            section: 'globals, constants',
            type: 'builtin',
          }));

          const options = [...enumOptions, ...globalOptions];

          return {
            filter: false,
            from: nodeCurrent.from,
            options,
            to: nodeCurrent.to,
          };
        }
      }
    }

    return null;
  };
}

function getStemAndDefaultArguments(commandDictionary: CommandDictionary, cmd: FswCommand): string {
  if (cmd.arguments.length) {
    return `${cmd.stem} ${cmd.arguments.map(argNode => getDefaultArgumentValue(argNode, commandDictionary.enumMap)).join(',')}`;
  }
  return cmd.stem;
}

export function getDefaultArgumentValue(argDef: FswCommandArgument, enumMap: EnumMap): string {
  switch (argDef.arg_type) {
    case 'boolean':
      return argDef.default_value ?? 'TRUE';
    case 'float':
    case 'numeric':
    case 'integer':
    case 'unsigned':
      // ignores conversion setting
      return (argDef.default_value ?? argDef.range?.min)?.toString(10) ?? '0';
    case 'enum':
      return `"${enumMap[argDef.enum_name]?.values[0]?.symbol ?? ''}"`;
    case 'var_string':
      return '""';
  }

  return '""';
}

export function parseFunctionSignatures(contents: string, workspace_id: number): LibrarySequence[] {
  return vmlBlockLibraryToCommandDictionary(contents).fswCommands.map(fswCommand => ({
    name: fswCommand.stem,
    parameters: fswCommand.arguments.map(a => {
      const type: VariableDeclaration['type'] = argTypToVariableType(a.arg_type);
      return {
        name: a.name,
        type,
      };
    }),
    tree: VmlLanguage.parser.parse(contents),
    type: 'librarySequence',
    workspace_id,
  }));
}

function argTypToVariableType(argType: FswCommandArgument['arg_type']): VariableDeclaration['type'] {
  switch (argType) {
    case 'enum':
      return 'ENUM';
    case 'unsigned':
      return 'UINT';
    case 'integer':
      return 'INT';
    case 'numeric':
    case 'float':
      return 'FLOAT';
    case 'fixed_string':
    case 'var_string':
      return 'STRING';
  }
  // 'repeat', 'boolean', 'time' types are not used
  return 'STRING';
}
