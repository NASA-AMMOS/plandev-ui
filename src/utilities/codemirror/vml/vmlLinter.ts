import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import type { SyntaxNode, Tree } from '@lezer/common';
import type { CommandDictionary, FswCommand, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import { closest } from 'fastest-levenshtein';
import { filterNodes } from '../../sequence-editor/tree-utils';
import { VmlLanguage } from './vml';
import {
  RULE_CALL_PARAMETER,
  RULE_CALL_PARAMETERS,
  RULE_FUNCTION_NAME,
  RULE_ISSUE,
  TOKEN_DOUBLE_CONST,
  TOKEN_ERROR,
  TOKEN_HEX_CONST,
  TOKEN_INT_CONST,
  TOKEN_STRING_CONST,
  TOKEN_UINT_CONST,
} from './vmlConstants';

/**
 * Limitations
 *
 * * Variables aren't checked, defer to external engine to determine if they exist when referenced
 */

// Absolute time tags may appear in functions beginning with SEQUENCE or ABSOLUTE_SEQUENCE
// Functions beginning with BLOCK or RELATIVE_SEQUENCE may have only relative time tags.

// Limit how many grammar problems are annotated
const MAX_PARSER_ERRORS = 100;

export function vmlLinter(commandDictionary: CommandDictionary | null = null): Extension {
  return linter(view => {
    const diagnostics: Diagnostic[] = [];
    const tree = syntaxTree(view.state);
    const sequence = view.state.sliceDoc();
    diagnostics.push(...validateParserErrors(tree, sequence, view.state.toText(sequence)));
    if (!commandDictionary) {
      return diagnostics;
    }

    const parsed = VmlLanguage.parser.parse(sequence);

    diagnostics.push(...validateCommands(commandDictionary, sequence, parsed));

    return diagnostics;
  });
}

function validateCommands(commandDictionary: CommandDictionary, docText: string, parsed: Tree): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const cursor = parsed.cursor();
  do {
    const { node } = cursor;
    const tokenType = node.type.name;

    if (tokenType === RULE_ISSUE) {
      const functionNameNode = node.getChild(RULE_FUNCTION_NAME);
      if (functionNameNode) {
        const functionName = docText.slice(functionNameNode.from, functionNameNode.to);
        const commandDef = commandDictionary.fswCommandMap[functionName];
        if (!commandDef) {
          const alternative = closest(functionName, Object.keys(commandDictionary.fswCommandMap));
          const { from, to } = functionNameNode;
          diagnostics.push({
            actions: [
              {
                apply(view: EditorView, from: number, to: number) {
                  view.dispatch({
                    changes: {
                      from,
                      insert: alternative,
                      to,
                    },
                  });
                },
                name: `Change to ${alternative}`,
              },
            ],
            from,
            message: `Unknown function name ${functionName}`,
            severity: 'error',
            to,
          });
        } else {
          diagnostics.push(...validateArguments(commandDictionary, commandDef, node, functionNameNode, docText));
        }
      }
    }
  } while (cursor.next());
  return diagnostics;
}

function validateArguments(
  commandDictionary: CommandDictionary,
  commandDef: FswCommand,
  functionNode: SyntaxNode,
  functionNameNode: SyntaxNode,
  docText: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const parametersNode = functionNode.getChild(RULE_CALL_PARAMETERS)?.getChildren(RULE_CALL_PARAMETER) ?? [];
  const functionName = docText.slice(functionNameNode.from, functionNameNode.to);
  for (let i = 0; i < commandDef.arguments.length; i++) {
    const argDef: FswCommandArgument | undefined = commandDef.arguments[i];
    const argNode = parametersNode[i];

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
  const extraArgs = parametersNode.slice(commandDef.arguments.length);
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
                      apply(view: EditorView, from: number, to: number) {
                        view.dispatch({
                          changes: {
                            from,
                            insert: alternative,
                            to,
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
  for (const node of filterNodes(tree.cursor(), node => node.name === TOKEN_ERROR)) {
    const currentRegion = errorRegions.at(-1);
    if (currentRegion?.to === node.from) {
      currentRegion.to = node.to;
    } else {
      errorRegions.push({ from: node.from, to: node.to });
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
