import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSection,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode, Tree } from '@lezer/common';
import type {
  CommandDictionary,
  Enum,
  EnumMap,
  FswCommand,
  FswCommandArgument,
  HwCommand,
} from '@nasa-jpl/aerie-ampcs';
import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import { SequenceTypes } from '../../../../enums/sequencing';
import type { GlobalType } from '../../../../types/global-type';
import { type LibrarySequence, type LibrarySequenceMap } from '../../../../types/sequencing';
import { isFswCommand, unquoteUnescape } from '../../sequence-utils';
import { getNearestAncestorNodeOfType } from '../../tree-utils';
import { VmlLanguage } from './vml';
import { librarySequenceToFswCommand, vmlBlockLibraryToCommandDictionary } from './vml-block-library';
import {
  RULE_BODY,
  RULE_CALL_PARAMETER,
  RULE_CALL_PARAMETERS,
  RULE_COMMON_FUNCTION,
  RULE_END_LINES,
  RULE_FUNCTION,
  RULE_FUNCTION_NAME,
  RULE_ISSUE,
  RULE_ISSUE_DYNAMIC,
  RULE_OPTIONAL_STATIC_VARIABLE_SECTION,
  RULE_PARAMETER,
  RULE_SPAWN,
  RULE_STATEMENT,
  RULE_VARIABLE_NAME,
  TOKEN_END_BODY,
  TOKEN_END_MODULE,
  TOKEN_MODULE,
  TOKEN_SYMBOL_CONST,
} from './vml-constants';
import { emptyFileOptions, SEQUENCE_SNIPPETS, structureSnippets } from './vml-snippets';
import { getArgumentPosition, getVmlVariables } from './vml-tree-utils';

const SECTION_LOCAL_VARIABLES: CompletionSection = {
  name: 'Local Variables',
  rank: 10,
};
const SECTION_FSW_COMMANDS: CompletionSection = {
  name: 'Flight Software Commands',
  rank: 10,
};
const SECTION_GLOBALS: CompletionSection = {
  name: 'Globals',
  rank: 1000,
};
const SECTION_HARDWARE_COMMANDS: CompletionSection = {
  name: 'Hardware Commands',
  rank: 1000,
};

export function vmlAutoComplete(
  commandDictionary: CommandDictionary | null,
  globals: GlobalType[],
  librarySequenceMap: LibrarySequenceMap,
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    const tree = syntaxTree(context.state);
    const leftNode = tree.resolveInner(context.pos, -1);
    const rightNode = tree.resolveInner(context.pos, 1);
    const nodes = [leftNode];
    if (rightNode !== leftNode) {
      nodes.push(rightNode);
    }
    for (const node of nodes) {
      if (commandDictionary) {
        const options = suggestDictionaryCompletions(
          context,
          node,
          tree,
          commandDictionary,
          globals,
          librarySequenceMap,
        );
        if (options) {
          const { from, to } = node;
          return {
            filter: context.pos !== node.from, // filter if cursor not at start
            from,
            options,
            to,
          };
        }
      }
    }
    for (const node of nodes) {
      const result = suggestDefaultCompletions(context, node, tree);
      if (result) {
        return result;
      }
    }
    return null;
  };
}

function suggestDictionaryCompletions(
  context: CompletionContext,
  node: SyntaxNode,
  tree: Tree,
  commandDictionary: CommandDictionary,
  globals: GlobalType[],
  librarySequenceMap: LibrarySequenceMap,
): Completion[] | null {
  if (isStatementNode(context, node)) {
    return suggestTimeTaggedCompletions(context, tree, globals);
  } else if (isVariableReferenceNode(node)) {
    return suggestVariableReferenceCompletions(context, tree, globals);
  } else if (isSpawnSequenceNameNode(node)) {
    return suggestSpawnSequenceNameCompletions(librarySequenceMap);
  } else if (isIssueFunctionNameNode(node)) {
    return suggestIssueCompletions(context, node, commandDictionary);
  } else if (isCallParameter(node)) {
    return suggestCallParameterCompletions(context, node, commandDictionary, librarySequenceMap);
  }

  return null;
}

function suggestTimeTaggedCompletions(context: CompletionContext, tree: Tree, globals: GlobalType[]): Completion[] {
  const structs: Completion[] = structureSnippets('');
  const variableCompletions = suggestVariableReferenceCompletions(context, tree, globals);
  return [...structs, ...(variableCompletions ?? [])];
}

function isStatementNode(context: CompletionContext, node: SyntaxNode): boolean {
  // if only token after time, unclear if assignment or starting ISSUE, SPAWN, etc.
  const statementNode = getNearestAncestorNodeOfType(node, [RULE_STATEMENT]);
  return (
    !!statementNode &&
    statementNode.from === node.from &&
    context.state.sliceDoc(node.to, statementNode.to).trim() === ''
  );
}

function suggestIssueCompletions(
  context: CompletionContext,
  node: SyntaxNode,
  commandDictionary: CommandDictionary,
): Completion[] {
  const restOfLine = context.state.sliceDoc(node.to, context.state.doc.lineAt(node.to).to);
  const addArguments = restOfLine.trim() === '';
  return getStemOptions(commandDictionary, false, addArguments);
}

function suggestSpawnSequenceNameCompletions(librarySequenceMap: LibrarySequenceMap): Completion[] {
  return Object.values(librarySequenceMap).map(
    (sequence): Completion => ({
      detail: 'library sequence',
      label: sequence.name,
      type: 'function',
    }),
  );
}

function suggestCallParameterCompletions(
  context: CompletionContext,
  node: SyntaxNode,
  commandDictionary: CommandDictionary,
  librarySequenceMap: LibrarySequenceMap,
): Completion[] | null {
  if (isIssueDynamicCommandNameNode(node)) {
    return getStemOptions(commandDictionary, true, false);
  }

  const cmdDef = getFswCommand(context, node, commandDictionary, librarySequenceMap);

  if (!cmdDef) {
    return null;
  }

  const argPos = getArgumentPosition(node);

  const argDef = cmdDef.arguments[argPos];
  if (!argDef) {
    return null;
  }

  const options: Completion[] = [];
  if (argDef.arg_type === 'enum') {
    options.push(...enumOptions(commandDictionary.enumMap[argDef.enum_name], argDef));
  } else if (argDef.arg_type === 'var_string' || argDef.arg_type === 'fixed_string') {
    options.push({
      apply: `"${argDef.name}"`,
      label: argDef.name,
    });
  }

  if (options.length === 0) {
    return null;
  }

  return options;
}

function getStemOptions(commandDictionary: CommandDictionary, isDynamic: boolean, withArgs: boolean): Completion[] {
  function toCompletion(cmd: FswCommand | HwCommand, section: CompletionSection | undefined): Completion {
    let apply: string | undefined = undefined;
    if (withArgs && isFswCommand(cmd)) {
      apply = getStemAndDefaultArguments(commandDictionary, cmd, isDynamic);
    } else if (isDynamic) {
      apply = `"${cmd.stem}"`;
    }
    return {
      apply,
      detail: cmd.description.slice(0, 50),
      label: cmd.stem,
      section,
    };
  }
  return [
    ...commandDictionary.fswCommands.map(cmd => toCompletion(cmd, SECTION_FSW_COMMANDS)),
    ...commandDictionary.hwCommands.map(cmd => toCompletion(cmd, SECTION_HARDWARE_COMMANDS)),
  ];
}

/**
 *
 * @param node
 * @returns boolean - if this is the first call parameter node of an issue dynamic
 */
function isIssueDynamicCommandNameNode(node: SyntaxNode): boolean {
  const issueDynamicNameNode = getNearestAncestorNodeOfType(node, [RULE_ISSUE_DYNAMIC])
    ?.getChild(RULE_CALL_PARAMETERS)
    ?.getChild(RULE_CALL_PARAMETER);

  return !!issueDynamicNameNode && issueDynamicNameNode.from === node.from && issueDynamicNameNode.to === node.to;
}

function getFswCommand(
  context: CompletionContext,
  node: SyntaxNode,
  commandDictionary: CommandDictionary,
  librarySequenceMap: LibrarySequenceMap,
): FswCommand | null {
  const spawnFunctionNameNode = getNearestAncestorNodeOfType(node, [RULE_SPAWN])?.getChild(RULE_FUNCTION_NAME);
  if (spawnFunctionNameNode) {
    const seqName: string = context.state.sliceDoc(spawnFunctionNameNode.from, spawnFunctionNameNode.to);
    const seq = librarySequenceMap[seqName];
    return seq ? librarySequenceToFswCommand(seq) : null;
  }

  const issueFunctionNameNode = getNearestAncestorNodeOfType(node, [RULE_ISSUE])?.getChild(RULE_FUNCTION_NAME);
  if (issueFunctionNameNode) {
    const cmdName: string = context.state.sliceDoc(issueFunctionNameNode.from, issueFunctionNameNode.to);
    return commandDictionary.fswCommandMap[cmdName] ?? null;
  }

  const issueDynamicNameNode = getNearestAncestorNodeOfType(node, [RULE_ISSUE_DYNAMIC])
    ?.getChild(RULE_CALL_PARAMETERS)
    ?.getChild(RULE_CALL_PARAMETER);
  if (issueDynamicNameNode) {
    const cmdName: string = unquoteUnescape(context.state.sliceDoc(issueDynamicNameNode.from, issueDynamicNameNode.to));
    return commandDictionary.fswCommandMap[cmdName] ?? null;
  }

  return null;
}

function suggestVariableReferenceCompletions(
  context: CompletionContext,
  tree: Tree,
  globals: GlobalType[],
): Completion[] {
  const variableOptions: Completion[] = getVmlVariables(context.state.sliceDoc(), tree, context.pos).map(variable => ({
    detail: 'local',
    label: variable,
    section: SECTION_LOCAL_VARIABLES,
    type: 'atom',
  }));
  return [...variableOptions, ...globalOptions(globals)];
}

function isVariableReferenceNode(node: SyntaxNode): boolean {
  return (
    node.name === TOKEN_SYMBOL_CONST &&
    node.parent?.name === RULE_VARIABLE_NAME &&
    !getNearestAncestorNodeOfType(node.parent, [RULE_PARAMETER])
  );
}

function isCallParameter(node: SyntaxNode): boolean {
  return !!getNearestAncestorNodeOfType(node.parent, [RULE_CALL_PARAMETER]);
}

function isSpawnSequenceNameNode(node: SyntaxNode): boolean {
  const functionNameNode = getNearestAncestorNodeOfType(node.parent, [RULE_FUNCTION_NAME]);
  return functionNameNode?.parent?.name === RULE_SPAWN;
}

function isIssueFunctionNameNode(node: SyntaxNode): boolean {
  const functionNameNode = getNearestAncestorNodeOfType(node.parent, [RULE_FUNCTION_NAME]);
  return functionNameNode?.parent?.name === RULE_ISSUE;
}

function suggestDefaultCompletions(context: CompletionContext, node: SyntaxNode, tree: Tree): CompletionResult | null {
  const cursorLine = context.state.doc.lineAt(context.pos);
  const cursorLineTrimmed = cursorLine.text.trim();
  const inSymbolToken = node.name === TOKEN_SYMBOL_CONST;
  const inWhiteSpace = !!getNearestAncestorNodeOfType(node, [RULE_END_LINES]) || cursorLineTrimmed === '';
  if (!inSymbolToken && !inWhiteSpace) {
    return null;
  }

  const { from, to } = inSymbolToken ? node : { from: context.pos, to: undefined };

  const moduleNode = tree.topNode.getChild(TOKEN_MODULE);
  const endModuleNode = tree.topNode.getChild(TOKEN_END_MODULE);
  if (!moduleNode && !endModuleNode) {
    return {
      from,
      options: emptyFileOptions(),
      to,
    };
  }

  if (!endModuleNode && !getNearestAncestorNodeOfType(node, [RULE_FUNCTION, RULE_OPTIONAL_STATIC_VARIABLE_SECTION])) {
    return {
      from,
      options: [
        {
          label: 'END_MODULE',
          type: 'function',
        },
      ],
    };
  }

  const isWithinModule =
    moduleNode && moduleNode.to <= context.pos && endModuleNode && context.pos < endModuleNode.from;
  if (isWithinModule) {
    return suggestModuleCompletions(node, context);
  }
  return null;
}

function suggestModuleCompletions(nodeCurrent: SyntaxNode, context: CompletionContext): CompletionResult | null {
  const parentFunctionNode = getNearestAncestorNodeOfType(nodeCurrent, [RULE_FUNCTION]);
  const bodyNode = parentFunctionNode?.firstChild?.getChild(RULE_COMMON_FUNCTION)?.getChild(RULE_BODY);
  const endNode = bodyNode?.getChild(TOKEN_END_BODY);
  const isAfterEndBody =
    endNode && context.state.doc.lineAt(endNode.to).number < context.state.doc.lineAt(context.pos).number;

  if (!parentFunctionNode || isAfterEndBody) {
    // not in a function or in whitespace at the end of a function
    return {
      from: context.pos,
      options: SEQUENCE_SNIPPETS,
    };
  }

  return null;
}

function getStemAndDefaultArguments(commandDictionary: CommandDictionary, cmd: FswCommand, isDynamic: boolean): string {
  const argValues: string[] = cmd.arguments.map(argNode => getDefaultArgumentValue(argNode, commandDictionary.enumMap));
  if (isDynamic) {
    return [`"${cmd.stem}"`, ...argValues].join(',');
  }
  return `${cmd.stem} ${argValues.join(',')}`.trim();
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
      return `"${enumMap[argDef.enum_name]?.values[0]?.symbol ?? argDef.enum_name}"`;
    case 'var_string':
      return `"${argDef.name}"`;
  }

  return '""';
}

export function parseFunctionSignatures(contents: string, workspaceId: number): LibrarySequence[] {
  return vmlBlockLibraryToCommandDictionary(contents).fswCommands.map(
    (fswCommand): LibrarySequence => ({
      name: fswCommand.stem,
      parameters: fswCommand.arguments.map((arg: FswCommandArgument) => {
        return {
          name: arg.name,
          type: argTypToVariableType(arg.arg_type),
        };
      }),
      tree: VmlLanguage.parser.parse(contents),
      type: SequenceTypes.LIBRARY,
      workspace_id: workspaceId,
    }),
  );
}

function enumOptions(enumDef: Enum, argDef: FswCommandArgument): Completion[] {
  return enumDef.values.map(
    (enumValue): Completion => ({
      apply: `"${enumValue.symbol}"`,
      detail: enumValue.numeric !== null ? `${enumValue.numeric}` : undefined,
      label: enumValue.symbol,
      section: `${argDef.name} values`,
      type: 'keyword',
    }),
  );
}

function globalOptions(globals: GlobalType[]): Completion[] {
  return globals.map(
    (g): Completion => ({
      detail: 'category' in g && typeof g.category === 'string' ? g.category : 'global',
      label: g.name,
      section: SECTION_GLOBALS,
      type: 'builtin',
    }),
  );
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
