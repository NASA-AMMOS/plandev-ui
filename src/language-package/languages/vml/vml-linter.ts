import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import type { SyntaxNode, Tree } from '@lezer/common';
import type { CommandDictionary, FswCommand, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import { closest } from 'fastest-levenshtein';
import { quoteEscape, unquoteUnescape } from '../../../utilities/sequence-editor/sequence-utils';
import { filterNodes, getNearestAncestorNodeOfType } from '../../../utilities/sequence-editor/tree-utils';
import type { LibrarySequenceMap } from '../../interfaces/new-adaptation-interface';
import type { GlobalType } from '../seq-n/global-types';
import { VmlLanguage } from './vml';
import {
  RULE_CALL_PARAMETER,
  RULE_CALL_PARAMETERS,
  RULE_FUNCTION_NAME,
  RULE_ISSUE,
  RULE_ISSUE_DYNAMIC,
  RULE_PARAMETER,
  RULE_SPAWN,
  RULE_TIME_TAGGED_STATEMENTS,
  RULE_VARIABLE_DECLARATION_TYPE,
  RULE_VARIABLE_NAME,
  TOKEN_DOUBLE_CONST,
  TOKEN_ERROR,
  TOKEN_HEX_CONST,
  TOKEN_INT_CONST,
  TOKEN_STRING_CONST,
  TOKEN_UINT_CONST,
} from './vml-constants';
import { getVmlVariables } from './vml-tree-utils';

/**
 * Limitations
 *
 * * Variables aren't checked, defer to external engine to determine if they exist when referenced
 */

// Absolute time tags may appear in functions beginning with SEQUENCE or ABSOLUTE_SEQUENCE
// Functions beginning with BLOCK or RELATIVE_SEQUENCE may have only relative time tags.

// Limit how many grammar problems are annotated
const MAX_PARSER_ERRORS = 10;

export function vmlLinter(
  commandDictionary: CommandDictionary | null = null,
  librarySequenceMap: LibrarySequenceMap = {},
  globals: GlobalType[] = [],
): Extension {
  return linter(view => {
    const diagnostics: Diagnostic[] = [];
    const tree = syntaxTree(view.state);
    const sequence = view.state.sliceDoc();
    diagnostics.push(...validateParserErrors(tree, sequence, view.state.toText(sequence)));
    if (!commandDictionary) {
      return diagnostics;
    }

    const parsed = VmlLanguage.parser.parse(sequence);
    diagnostics.push(...validateCommands(commandDictionary, librarySequenceMap, sequence, parsed));
    diagnostics.push(...validateGlobals(sequence, tree, globals));

    return diagnostics;
  });
}

function validateGlobals(input: string, tree: Tree, globals: GlobalType[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const globalNames: Set<string> = new Set(globals.map(g => g.name));

  // for each block, sequence, etc -- determine what variables are declared
  const declaredVariables: { [to: number]: Set<string> } = {};
  for (const filteredNode of filterNodes(tree.cursor(), node => node.name === RULE_TIME_TAGGED_STATEMENTS)) {
    declaredVariables[filteredNode.from] = new Set(getVmlVariables(input, tree, filteredNode.to));
  }

  // check all variables
  for (const filteredNode of filterNodes(tree.cursor(), node => node.name === RULE_VARIABLE_NAME)) {
    if (diagnostics.length >= 10) {
      // stop checking to avoid flood of errors if adaptation is misconfigured
      break;
    }

    if (getNearestAncestorNodeOfType(filteredNode, [RULE_PARAMETER, RULE_VARIABLE_DECLARATION_TYPE])) {
      // don't check variable declarations
      continue;
    }

    const variableReference = input.slice(filteredNode.from, filteredNode.to);
    if (globalNames.has(variableReference)) {
      // matches global
      continue;
    }

    const timeTaggedStatementsNode = getNearestAncestorNodeOfType(filteredNode, [RULE_TIME_TAGGED_STATEMENTS]);
    const variablesInScope = timeTaggedStatementsNode ? declaredVariables[timeTaggedStatementsNode.from] : new Set([]);
    if (variablesInScope.has(variableReference)) {
      // matches local
      continue;
    }

    const symbolsInScope = [...Array.from(variablesInScope), ...Array.from(globalNames)];
    const alternative = closest(variableReference, symbolsInScope);
    diagnostics.push(suggestAlternative(filteredNode, variableReference, 'symbolic reference', alternative));
  }
  return diagnostics;
}

function validateCommands(
  commandDictionary: CommandDictionary,
  librarySequenceMap: LibrarySequenceMap,
  docText: string,
  parsed: Tree,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const cursor = parsed.cursor();
  do {
    const { node } = cursor;
    const tokenType = node.type.name;
    if (tokenType === RULE_ISSUE || tokenType === RULE_ISSUE_DYNAMIC) {
      diagnostics.push(...validateIssue(node, docText, commandDictionary, tokenType));
    } else if (tokenType === RULE_SPAWN) {
      diagnostics.push(...validateSpawn(node, docText, librarySequenceMap));
    }
  } while (cursor.next());
  return diagnostics;
}

function validateIssue(
  node: SyntaxNode,
  docText: string,
  commandDictionary: CommandDictionary,
  tokenType: string,
): Diagnostic[] {
  const isDynamic = tokenType === RULE_ISSUE_DYNAMIC;
  const stemNameNode = isDynamic
    ? node.getChild(RULE_CALL_PARAMETERS)?.getChild(RULE_CALL_PARAMETER)
    : node.getChild(RULE_FUNCTION_NAME);
  if (stemNameNode) {
    const stemName = docText.slice(stemNameNode.from, stemNameNode.to);
    const commandDef = commandDictionary.fswCommandMap[unquoteUnescape(stemName)];
    if (!commandDef) {
      const closestStem = closest(stemName, Object.keys(commandDictionary.fswCommandMap));
      const alternativeStem = isDynamic ? quoteEscape(closestStem) : closestStem;
      return [suggestAlternative(stemNameNode, stemName, 'command', alternativeStem)];
    } else {
      return validateArguments(commandDictionary, commandDef, node, stemNameNode, docText, isDynamic ? 1 : 0);
    }
  }
  return [];
}

function validateSpawn(node: SyntaxNode, docText: string, librarySequenceMap: LibrarySequenceMap): Diagnostic[] {
  const spawnedNameNode = node.getChild(RULE_FUNCTION_NAME);
  if (spawnedNameNode) {
    const spawnedSeqName = docText.slice(spawnedNameNode.from, spawnedNameNode.to);
    const seqDef = librarySequenceMap[spawnedSeqName];
    if (!seqDef) {
      return [
        suggestAlternative(
          spawnedNameNode,
          spawnedSeqName,
          'sequence or block',
          closest(spawnedSeqName, Object.keys(librarySequenceMap)),
        ),
      ];
    }
  }
  return [];
}

function suggestAlternative(node: SyntaxNode, current: string, typeLabel: string, alternative: string): Diagnostic {
  const { from, to } = node;
  return {
    actions: [
      {
        apply(view: EditorView, applyFrom: number, applyTo: number) {
          view.dispatch({
            changes: {
              from: applyFrom,
              insert: alternative,
              to: applyTo,
            },
          });
        },
        name: `Change to "${alternative}"`,
      },
    ],
    from,
    message: `Unknown ${typeLabel} name "${current}"`,
    severity: 'error',
    to,
  };
}

/**
 * Validate argument types, ranges, and overall counts against what's in the dictionary.
 *
 * @param commandDictionary - ampcs formatted command dictionary
 * @param commandDef - definition of command being validated
 * @param functionNode - syntax node of the complete command - may be an invoke, invoke_dynamic, or spawn
 * @param functionNameNode - syntax node containing the name identifying the fsw command or library sequence being invoked
 * @param docText - sequence text
 * @param parameterOffset - spawn and issue structures have an explicity command_name and a list of call_parameters (arguments).
 *    issue_dynamic is different and the command_name is inserted into the first position of the argument list, subsequent items
 *    in the list are the arguments that the command takes. Presumably this is to allow the command_name to be a variable or global.
 * @returns - a list of errors and warnings when validating the command
 */
function validateArguments(
  commandDictionary: CommandDictionary,
  commandDef: FswCommand,
  functionNode: SyntaxNode,
  functionNameNode: SyntaxNode,
  docText: string,
  parameterOffset: number,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const parametersNode = functionNode.getChild(RULE_CALL_PARAMETERS)?.getChildren(RULE_CALL_PARAMETER) ?? [];
  const functionName = docText.slice(functionNameNode.from, functionNameNode.to);
  for (let i = 0; i < commandDef.arguments.length; i++) {
    const argDef: FswCommandArgument | undefined = commandDef.arguments[i];
    const argNode = parametersNode[i + (parameterOffset ?? 0)];

    if (argDef && argNode) {
      // validate expected argument
      diagnostics.push(...validateArgument(commandDictionary, argDef, argNode, docText));
    } else if (!argNode && !!argDef) {
      const { from, to } = functionNameNode;
      diagnostics.push({
        from,
        message: `${functionName} is missing argument ${argDef.name}`,
        severity: 'error',
        to,
      });
    }
  }
  const extraArgs = parametersNode.slice(parameterOffset).slice(commandDef.arguments.length);
  diagnostics.push(
    ...extraArgs.map((extraArg: SyntaxNode): Diagnostic => {
      const { from, to } = extraArg;
      return {
        from,
        message: `${functionName} has an extra argument ${docText.slice(from, to)}`,
        severity: 'error',
        to,
      };
    }),
  );
  return diagnostics;
}

function validateArgument(
  commandDictionary: CommandDictionary,
  argDef: FswCommandArgument,
  argNode: SyntaxNode,
  docText: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // could also be a variable
  const constantNode = argNode.getChild('Simple_expr')?.getChild('Constant')?.firstChild;

  if (constantNode) {
    const { from, to } = constantNode;
    switch (argDef.arg_type) {
      case 'integer':
        {
          if (![TOKEN_INT_CONST, TOKEN_UINT_CONST, TOKEN_HEX_CONST].includes(constantNode.name)) {
            return [
              {
                from,
                message: `Expected integer value`,
                severity: 'error',
                to,
              },
            ];
          } else if (argDef.range) {
            // TODO: CDL dictionary provides a conversion, HEX arguments should prefer hexadecimal
            const base = constantNode.name === TOKEN_HEX_CONST ? 16 : 10;
            const argValue = parseInt(docText.slice(argNode.from, argNode.to), base);
            if (argValue < argDef.range.min || argValue > argDef.range.max) {
              return [
                {
                  from,
                  message: `Value should be between ${argDef.range.min.toString(base)} and ${argDef.range.max.toString(base)}`,
                  severity: 'error',
                  to,
                },
              ];
            }
          }
        }
        break;
      case 'float':
        if (![TOKEN_INT_CONST, TOKEN_DOUBLE_CONST].includes(constantNode.name)) {
          return [
            {
              from,
              message: `Expected float or integer value`,
              severity: 'error',
              to,
            },
          ];
        } else if (argDef.range) {
          const argValue = parseFloat(docText.slice(argNode.from, argNode.to));
          if (argValue < argDef.range.min || argValue > argDef.range.max) {
            return [
              {
                from,
                message: `Value should be between ${argDef.range.min.toString()} and ${argDef.range.max.toString()}`,
                severity: 'error',
                to,
              },
            ];
          }
        }
        break;
      case 'fixed_string':
      case 'var_string':
        if (TOKEN_STRING_CONST !== constantNode.name) {
          return [
            {
              from,
              message: `Expected string value`,
              severity: 'error',
              to,
            },
          ];
        }
        break;
      case 'enum': {
        if (TOKEN_STRING_CONST !== constantNode.name) {
          return [
            {
              from,
              message: `Expected type ${constantNode.name} for enum argument`,
              severity: 'error',
              to,
            },
          ];
        } else {
          const enumVal = unquote(docText.slice(constantNode.from, constantNode.to));
          const enumDef = commandDictionary.enumMap[argDef.enum_name];
          if (enumDef) {
            const allowedValues = enumDef.values.map(ev => ev.symbol);
            if (!allowedValues.includes(enumVal)) {
              const alternative = `"${closest(enumVal, allowedValues)}"`;
              return [
                {
                  actions: [
                    {
                      apply(view: EditorView, applyFrom: number, applyTo: number) {
                        view.dispatch({
                          changes: {
                            from: applyFrom,
                            insert: alternative,
                            to: applyTo,
                          },
                        });
                      },
                      name: `Change to ${alternative}`,
                    },
                  ],
                  from,
                  message: `Unexpected enum value ${enumVal}`,
                  severity: 'error',
                  to,
                },
              ];
            }
          }
        }
        break;
      }
    }
  }

  return diagnostics;
}

function unquote(s: string): string {
  return s.slice(1, s.length - 1);
}

/**
 * Checks for unexpected tokens.
 *
 * @param tree
 * @returns
 */
function validateParserErrors(tree: Tree, sequence: string, text: Text): Diagnostic[] {
  const errorRegions: { from: number; to: number }[] = [];
  for (const filteredNode of filterNodes(tree.cursor(), node => node.name === TOKEN_ERROR)) {
    const currentRegion = errorRegions.at(-1);
    if (currentRegion?.to === filteredNode.from) {
      currentRegion.to = filteredNode.to;
    } else {
      errorRegions.push({ from: filteredNode.from, to: filteredNode.to });
    }

    if (errorRegions.length > MAX_PARSER_ERRORS) {
      break;
    }
  }

  return errorRegions.slice(0, MAX_PARSER_ERRORS).map(({ from, to }) => {
    const line = text.lineAt(from);
    return {
      from,
      message: `Unexpected token: "${sequence.slice(from, to)}" [Line ${line.number}, Col ${from - line.from}]`,
      severity: 'error',
      to,
    };
  });
}
