import { snippet, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode, Tree } from '@lezer/common';
import type { CommandDictionary, Enum, EnumMap, FswCommand, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { GlobalType } from '../../../types/global-type';
import type { LibrarySequence } from '../../../types/sequencing';
import { getNearestAncestorNodeOfType } from '../../sequence-editor/tree-utils';
import { VmlLanguage } from './vml';
import { vmlBlockLibraryToCommandDictionary } from './vmlBlockLibrary';
import {
  RULE_BODY,
  RULE_COMMON_FUNCTION,
  RULE_FUNCTION,
  RULE_FUNCTION_NAME,
  RULE_ISSUE,
  RULE_PARAMETER,
  RULE_STATEMENT,
  RULE_TIME_TAGGED_STATEMENT,
  RULE_VARIABLE_NAME,
  TOKEN_ABSOLUTE_SEQUENCE,
  TOKEN_BLOCK,
  TOKEN_END_BODY,
  TOKEN_END_MODULE,
  TOKEN_MODULE,
  TOKEN_RELATIVE_SEQUENCE,
  TOKEN_SEQUENCE,
  TOKEN_STRING_CONST,
  TOKEN_SYMBOL_CONST,
  TOKEN_TIME_CONST,
} from './vmlConstants';
import { getArgumentPosition, getVmlVariables } from './vmlTreeUtils';

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

const SEQUENCE_SNIPPETS = [TOKEN_BLOCK, TOKEN_ABSOLUTE_SEQUENCE, TOKEN_RELATIVE_SEQUENCE, TOKEN_SEQUENCE].map(
  seqType => ({
    apply: snippet(`${seqType} \${function_name}
FLAGS \${AUTOEXECUTE} \${AUTOUNLOAD} \${REENTRANT}
BODY

END_BODY`),
    label: seqType,
    type: 'function',
  }),
);

export function vmlAutoComplete(
  commandDictionary: CommandDictionary | null,
  globals: GlobalType[],
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    if (!commandDictionary) {
      return null;
    }

    const tree = syntaxTree(context.state);
    const nodeBefore = tree.resolveInner(context.pos, -1);
    const nodeCurrent = tree.resolveInner(context.pos, 0);

    const cursorLine = context.state.doc.lineAt(context.pos);
    if (nodeCurrent.name === RULE_TIME_TAGGED_STATEMENT) {
      const cursorLineTrimmed = cursorLine.text.trim();
      if (cursorLineTrimmed === '') {
        // empty line and expecting a time tagged statement
        return {
          from: context.pos,
          options: structureSnippets('R00:00:00.00 '),
        };
      }

      const timeConstToken = nodeCurrent.getChild(TOKEN_TIME_CONST);
      if (timeConstToken && context.state.sliceDoc(timeConstToken.from, timeConstToken.to) === cursorLineTrimmed) {
        // line is only a time constant
        return {
          from: context.pos,
          options: structureSnippets(''),
        };
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
    }

    if (nodeCurrent.name === TOKEN_STRING_CONST) {
      // also show if before argument
      const containingStatement = getNearestAncestorNodeOfType(nodeCurrent, [RULE_STATEMENT]);
      const functionNameNode = containingStatement?.firstChild?.getChild(RULE_FUNCTION_NAME);
      if (functionNameNode) {
        return suggestEnumArgumentCompletions(context, functionNameNode, commandDictionary, nodeCurrent);
      }
    } else if (isVariableReferenceNode(nodeCurrent)) {
      const variableOptions = getVmlVariables(context.state.sliceDoc(), tree, context.pos).map(variable => ({
        apply: variable,
        detail: 'local',
        label: variable,
        section: 'locals',
        type: 'atom',
      }));
      const options = [...variableOptions, ...globalOptions(globals)];
      return {
        filter: false,
        from: nodeCurrent.from,
        options,
        to: nodeCurrent.to,
      };
    }

    return suggestScaffoldingCompletions(context, nodeCurrent, tree);
  };
}

function isVariableReferenceNode(node: SyntaxNode): boolean {
  return (
    node.name === TOKEN_SYMBOL_CONST &&
    node.parent?.name === RULE_VARIABLE_NAME &&
    !getNearestAncestorNodeOfType(node.parent, [RULE_PARAMETER])
  );
}

function suggestScaffoldingCompletions(
  context: CompletionContext,
  nodeCurrent: SyntaxNode,
  tree: Tree,
): CompletionResult | null {
  const precedingChar = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
  const isContextInNode =
    precedingChar.trim() !== '' && nodeCurrent.from <= context.pos && context.pos <= nodeCurrent.to;
  const { from, to } = isContextInNode ? nodeCurrent : { from: context.pos, to: undefined };

  const moduleNode = tree.topNode.getChild(TOKEN_MODULE);
  const endModuleNode = tree.topNode.getChild(TOKEN_END_MODULE);
  if (!moduleNode && !endModuleNode) {
    return {
      from,
      options: [
        {
          apply: `${TOKEN_MODULE}\n\n${TOKEN_END_MODULE}\n`,
          label: 'MODULE',
          type: 'function',
        },
      ],
      to,
    };
  }

  const isWithinModule =
    moduleNode && moduleNode.to <= context.pos && endModuleNode && context.pos < endModuleNode.from;
  if (isWithinModule) {
    const moduleCompletions = suggestModuleCompletions(nodeCurrent, context, from, to);
    if (moduleCompletions) {
      return moduleCompletions;
    }
  }
  return null;
}

function suggestEnumArgumentCompletions(
  context: CompletionContext,
  functionNameNode: SyntaxNode,
  commandDictionary: CommandDictionary,
  nodeCurrent: SyntaxNode,
): CompletionResult | null {
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

  return {
    filter: false,
    from: nodeCurrent.from,
    options: enumOptions(commandDictionary.enumMap[argDef.enum_name], argDef),
    to: nodeCurrent.to,
  };
}

function suggestModuleCompletions(
  nodeCurrent: SyntaxNode,
  context: CompletionContext,
  from: number,
  to: number | undefined,
): CompletionResult | null {
  const parentFunctionNode = getNearestAncestorNodeOfType(nodeCurrent, [RULE_FUNCTION]);
  if (!parentFunctionNode) {
    // not in a function
    return {
      from,
      options: SEQUENCE_SNIPPETS,
      to,
    };
  }

  const endBodyNode = parentFunctionNode?.firstChild
    ?.getChild(RULE_COMMON_FUNCTION)
    ?.getChild(RULE_BODY)
    ?.getChild(TOKEN_END_BODY);
  const isAfterEndBody =
    endBodyNode && context.state.doc.lineAt(endBodyNode.to).number < context.state.doc.lineAt(context.pos).number;
  if (isAfterEndBody) {
    // at the end of a function
    return {
      from,
      options: SEQUENCE_SNIPPETS,
      to,
    };
  }

  return null;
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

function enumOptions(enumDef: Enum, argDef: FswCommandArgument): CompletionResult['options'] {
  return enumDef.values.map(enumValue => ({
    apply: `"${enumValue.symbol}"`,
    detail: enumValue.numeric !== null ? `${enumValue.numeric}` : undefined,
    label: enumValue.symbol,
    section: `${argDef.name} values`,
    type: 'keyword',
  }));
}

function globalOptions(globals: GlobalType[]): CompletionResult['options'] {
  return globals.map(g => ({
    apply: g.name,
    detail: 'category' in g && typeof g.category === 'string' ? g.category : 'global',
    label: g.name,
    section: 'globals, constants',
    type: 'builtin',
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
