import { syntaxTree } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { SyntaxNode, Tree } from '@lezer/common';
import type {
  ChannelDictionary,
  CommandDictionary,
  EnumMap,
  FswCommand,
  FswCommandArgument,
  HwCommand,
  ParameterDictionary,
} from '@nasa-jpl/aerie-ampcs';
import { closest, distance } from 'fastest-levenshtein';

import type { VariableDeclaration } from '@nasa-jpl/seq-json-schema/types';
import type { EditorView } from 'codemirror';
import { TimeTypes } from '../../enums/time';
import { CustomErrorCodes } from '../../workers/customCodes';
import { addDefaultArgs, quoteEscape } from '../codemirror/codemirror-utils';
import {
  getBalancedDuration,
  getDoyTime,
  getUnixEpochTime,
  isTimeBalanced,
  isTimeMax,
  parseDurationString,
  validateTime,
} from '../time';
import { getCustomArgDef } from './extension-points';
import { TOKEN_COMMAND, TOKEN_ERROR, TOKEN_REPEAT_ARG } from './sequencer-grammar-constants';
import { getChildrenNode, getDeepestNode, getFromAndTo } from './tree-utils';

const KNOWN_DIRECTIVES = [
  'LOAD_AND_GO',
  'ID',
  'IMMEDIATE',
  'HARDWARE',
  'LOCALS',
  'INPUT_PARAMS',
  'MODEL',
  'METADATA',
].map(name => `@${name}`);

const MAX_ENUMS_TO_SHOW = 20;

export function getAllEnumSymbols(enumMap: EnumMap, enumName: string): undefined | string[] {
  return enumMap[enumName]?.values.map(({ symbol }) => symbol);
}

function closestStrings(value: string, potentialMatches: string[], n: number) {
  const distances = potentialMatches.map(s => ({ distance: distance(s, value), s }));
  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, n).map(pair => pair.s);
}

type WhileOpener = {
  command: SyntaxNode;
  from: number;
  stemToClose: string;
  to: number;
  word: string;
};

type IfOpener = WhileOpener & {
  hasElse: boolean;
};

type VariableMap = {
  [name: string]: VariableDeclaration;
};

/**
 * Linter function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available during linting.
 */
export function sequenceLinter(
  channelDictionary: ChannelDictionary | null = null,
  commandDictionary: CommandDictionary | null = null,
  parameterDictionaries: ParameterDictionary[] = [],
): Extension {
  return linter(view => {
    const tree = syntaxTree(view.state);
    const treeNode = tree.topNode;
    const docText = view.state.doc.toString();
    let diagnostics: Diagnostic[] = [];

    diagnostics.push(...validateParserErrors(tree));

    // TODO: Get identify type mapping to use
    const variables: VariableDeclaration[] = [
      ...(globalThis.GLOBALS?.map(g => ({ name: g.name, type: 'STRING' }) as const) ?? []),
    ];

    // Validate top level metadata
    diagnostics.push(...validateMetadata(treeNode));

    diagnostics.push(...validateId(treeNode, docText));

    const localsValidation = validateLocals(treeNode.getChildren('LocalDeclaration'), docText);
    variables.push(...localsValidation.variables);
    diagnostics.push(...localsValidation.diagnostics);

    const parameterValidation = validateParameters(treeNode.getChildren('ParameterDeclaration'), docText);
    variables.push(...parameterValidation.variables);
    diagnostics.push(...parameterValidation.diagnostics);

    const variableMap: VariableMap = {};
    for (const variable of variables) {
      variableMap[variable.name] = variable;
    }

    // Validate command type mixing
    diagnostics.push(...validateCommandTypeMixing(treeNode));

    diagnostics.push(...validateCustomDirectives(treeNode, docText));

    diagnostics.push(
      ...commandLinter(treeNode.getChild('Commands')?.getChildren(TOKEN_COMMAND) || [], docText, variableMap),
    );

    diagnostics.push(
      ...immediateCommandLinter(
        treeNode.getChild('ImmediateCommands')?.getChildren(TOKEN_COMMAND) || [],
        docText,
        variableMap,
      ),
    );

    diagnostics.push(
      ...hardwareCommandLinter(treeNode.getChild('HardwareCommands')?.getChildren(TOKEN_COMMAND) || [], docText),
    );

    diagnostics.push(
      ...conditionalAndLoopKeywordsLinter(treeNode.getChild('Commands')?.getChildren(TOKEN_COMMAND) || [], docText),
    );

    if (globalThis.LINT !== undefined && globalThis.LINT(commandDictionary, view, treeNode) !== undefined) {
      diagnostics = [...diagnostics, ...globalThis.LINT(commandDictionary, view, treeNode)];
    }

    return diagnostics;
  });

  /**
   * Checks for unexpected tokens.
   *
   * @param tree
   * @returns
   */
  function validateParserErrors(tree: Tree) {
    const diagnostics: Diagnostic[] = [];
    const MAX_PARSER_ERRORS = 100;
    tree.iterate({
      enter: node => {
        if (node.name === TOKEN_ERROR && diagnostics.length < MAX_PARSER_ERRORS) {
          const { from, to } = node;
          diagnostics.push({
            from,
            message: `Unexpected token`,
            severity: 'error',
            to,
          });
        }
      },
    });
    return diagnostics;
  }

  function conditionalAndLoopKeywordsLinter(commandNodes: SyntaxNode[], text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const conditionalStack: IfOpener[] = [];
    const loopStack: WhileOpener[] = [];
    const conditionalKeywords = [];
    const loopKeywords = [];
    const conditionalStartingKeywords = globalThis.CONDITIONAL_KEYWORDS?.IF ?? ['CMD_IF'];
    const conditionalElseKeyword = globalThis.CONDITIONAL_KEYWORDS?.ELSE ?? 'CMD_ELSE';
    const conditionalElseIfKeywords = globalThis.CONDITIONAL_KEYWORDS?.ELSE_IF ?? ['CMD_ELSE_IF'];
    const conditionalEndingKeyword = globalThis.CONDITIONAL_KEYWORDS?.END_IF ?? 'CMD_END_IF';
    const loopStartingKeywords = globalThis.LOOP_KEYWORDS?.WHILE_LOOP ?? ['CMD_WHILE_LOOP', 'CMD_WHILE_LOOP_OR'];
    const loopEndingKeyword = globalThis.LOOP_KEYWORDS?.END_WHILE_LOOP ?? 'CMD_END_WHILE_LOOP';

    conditionalKeywords.push(conditionalElseKeyword, ...conditionalElseIfKeywords, conditionalEndingKeyword);
    loopKeywords.push(
      globalThis.LOOP_KEYWORDS?.BREAK ?? 'CMD_BREAK',
      globalThis.LOOP_KEYWORDS?.CONTINUE ?? 'CMD_CONTINUE',
      loopEndingKeyword,
    );

    for (const command of commandNodes) {
      const stem = command.getChild('Stem');
      if (stem) {
        const word = text.slice(stem.from, stem.to);

        if (conditionalStartingKeywords.includes(word)) {
          conditionalStack.push({
            command,
            from: stem.from,
            hasElse: false,
            stemToClose: conditionalEndingKeyword,
            to: stem.to,
            word,
          });
        }

        if (conditionalKeywords.includes(word)) {
          if (conditionalStack.length === 0) {
            diagnostics.push({
              from: stem.from,
              message: `${word} doesn't match a preceding ${conditionalStartingKeywords.join(', ')}.`,
              severity: 'error',
              to: stem.to,
            });
          } else if (word === conditionalElseKeyword) {
            if (!conditionalStack[conditionalStack.length - 1].hasElse) {
              conditionalStack[conditionalStack.length - 1].hasElse = true;
            } else {
              diagnostics.push({
                from: stem.from,
                message: `${word} doesn't match a preceding ${conditionalStartingKeywords.join(', ')}.`,
                severity: 'error',
                to: stem.to,
              });
            }
          } else if (word === conditionalEndingKeyword) {
            conditionalStack.pop();
          }
        }

        if (loopStartingKeywords.includes(word)) {
          loopStack.push({
            command,
            from: stem.from,
            stemToClose: loopEndingKeyword,
            to: stem.to,
            word,
          });
        }

        if (loopKeywords.includes(word)) {
          if (loopStack.length === 0) {
            diagnostics.push({
              from: stem.from,
              message: `${word} doesn't match a preceding ${loopStartingKeywords.join(', ')}.`,
              severity: 'error',
              to: stem.to,
            });
          }

          if (word === loopEndingKeyword) {
            loopStack.pop();
          }
        }
      }
    }

    // Anything left on the stack is unclosed
    diagnostics.push(
      ...[...loopStack, ...conditionalStack].map(block => {
        return {
          actions: [
            {
              apply(view: EditorView, _from: number, _to: number) {
                view.dispatch({
                  changes: {
                    from: block.command.to,
                    insert: `\nC ${block.stemToClose}\n`,
                  },
                });
              },
              name: `Insert ${block.stemToClose}`,
            },
          ],
          from: block.from,
          message: `Unclosed ${block.word}`,
          severity: 'error',
          to: block.to,
        } as const;
      }),
    );

    return diagnostics;
  }

  /**
   * Validates that a syntax node does not mix different command types.
   *
   * @param {SyntaxNode} node - The syntax node to validate.
   * @return {Diagnostic[]} An array of diagnostics.
   */
  function validateCommandTypeMixing(node: SyntaxNode): Diagnostic[] {
    // Get the child nodes for Commands, ImmediateCommands, and HardwareCommands.
    const commands = node.getChild('Commands');
    const immediateCommands = node.getChild('ImmediateCommands');
    const hardwareCommands = node.getChild('HardwareCommands');
    const lgo = commands?.getChild('LoadAndGoDirective') ?? null;

    // Check if each command type exists and has at least one child node.
    const hasCommands = commands !== null && (commands?.getChildren(TOKEN_COMMAND).length > 0 || lgo !== null);
    const hasImmediateCommands = immediateCommands !== null;
    const hasHardwareCommands = hardwareCommands !== null;

    const diagnostics: Diagnostic[] = [];

    // Get the start.
    const { from, to } = getFromAndTo([commands, immediateCommands, hardwareCommands]);

    // If there is a mix of command types, push a diagnostic.
    if (
      (hasCommands && (hasImmediateCommands || hasHardwareCommands)) ||
      (hasImmediateCommands && hasHardwareCommands)
    ) {
      if (lgo) {
        diagnostics.push({
          from,
          message: `Directive 'LOAD_AND_GO' cannot be used with 'Immediate Commands' or 'Hardware Commands'.`,
          severity: 'error',
          to,
        });
      }
      diagnostics.push({
        from,
        message: 'Cannot mix different command types in one Sequence.',
        severity: 'error',
        to,
      });
    }
    return diagnostics;
  }

  function validateLocals(locals: SyntaxNode[], text: string) {
    const variables: VariableDeclaration[] = [];
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(
      ...locals.slice(1).map(
        local =>
          ({
            ...getFromAndTo([local]),
            message: 'There is a maximum of one @LOCALS directive per sequence',
            severity: 'error',
          }) as const,
      ),
    );
    locals.forEach(local => {
      let child = local.firstChild;
      while (child) {
        if (child.name !== 'Enum') {
          diagnostics.push({
            from: child.from,
            message: `@LOCALS values are required to be Enums`,
            severity: 'error',
            to: child.to,
          });
        } else {
          variables.push({
            name: text.slice(child.from, child.to),
            // TODO - hook to check mission specific nomenclature
            type: 'STRING',
          });
        }
        child = child.nextSibling;
      }
    });
    return {
      diagnostics,
      variables,
    };
  }

  function validateParameters(inputParams: SyntaxNode[], text: string) {
    const variables: VariableDeclaration[] = [];
    const diagnostics: Diagnostic[] = [];
    diagnostics.push(
      ...inputParams.slice(1).map(
        inputParam =>
          ({
            ...getFromAndTo([inputParam]),
            message: 'There is a maximum of @INPUT_PARAMS directive per sequence',
            severity: 'error',
          }) as const,
      ),
    );
    inputParams.forEach(inputParam => {
      let child = inputParam.firstChild;
      while (child) {
        if (child.name !== 'Enum') {
          diagnostics.push({
            from: child.from,
            message: `@INPUT_PARAMS values are required to be Enums`,
            severity: 'error',
            to: child.to,
          });
        } else {
          variables.push({
            name: text.slice(child.from, child.to),
            // TODO - hook to check mission specific nomenclature
            type: 'STRING',
          });
        }
        child = child.nextSibling;
      }
    });
    return {
      diagnostics,
      variables,
    };
  }

  function validateCustomDirectives(node: SyntaxNode, text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    node.getChildren('GenericDirective').forEach(directiveNode => {
      const child = directiveNode.firstChild;
      // use first token as directive, preserve remainder of line
      const { from, to } = { ...getFromAndTo([directiveNode]), ...(child ? { to: child.from } : {}) };
      const custom = text.slice(from, to).trim();
      const guess = closest(custom, KNOWN_DIRECTIVES);
      const insert = guess + (child ? ' ' : '\n');
      diagnostics.push({
        actions: [
          {
            apply(view, from, to) {
              view.dispatch({ changes: { from, insert, to } });
            },
            name: `Change to ${guess}`,
          },
        ],
        from,
        message: `Unknown Directive ${custom}, did you mean ${guess}`,
        severity: 'error',
        to,
      });
    });
    return diagnostics;
  }

  function insertAction(name: string, insert: string) {
    return {
      apply(view: EditorView, from: number, _to: number) {
        view.dispatch({ changes: { from, insert } });
      },
      name,
    };
  }

  /**
   * Function to generate diagnostics based on Commands section in the parse tree.
   *
   * @param {SyntaxNode[] | undefined} commandNodes - nodes representing commands
   * @param {string} text - the text to validate against
   * @return {Diagnostic[]} an array of diagnostics
   */
  function commandLinter(commandNodes: SyntaxNode[] | undefined, text: string, variables: VariableMap): Diagnostic[] {
    // If there are no command nodes, return an empty array of diagnostics
    if (!commandNodes) {
      return [];
    }

    // Initialize an empty array to hold diagnostics
    const diagnostics: Diagnostic[] = [];

    // Iterate over each command node
    for (const command of commandNodes) {
      // Get the TimeTag node for the current command
      const timeTagNode = command.getChild('TimeTag');

      // If the TimeTag node is missing, create a diagnostic
      if (!timeTagNode) {
        diagnostics.push({
          actions: [
            insertAction(`Insert 'C' (command complete)`, 'C '),
            insertAction(`Insert 'R1' (relative 1)`, 'R '),
          ],
          from: command.from,
          message: "Missing 'Time Tag' for command",
          severity: 'error',
          to: command.to,
        });
      } else {
        const timeTagAbsoluteNode = timeTagNode.getChild('TimeAbsolute');
        const timeTagEpochNode = timeTagNode.getChild('TimeEpoch');
        const timeTagRelativeNode = timeTagNode.getChild('TimeRelative');

        if (timeTagAbsoluteNode) {
          const absoluteText = text.slice(timeTagAbsoluteNode.from + 1, timeTagAbsoluteNode.to).trim();

          const isValid = validateTime(absoluteText, TimeTypes.ABSOLUTE);
          if (!isValid) {
            diagnostics.push({
              actions: [],
              from: timeTagAbsoluteNode.from,
              message: CustomErrorCodes.InvalidAbsoluteTime().message,
              severity: 'error',
              to: timeTagAbsoluteNode.to,
            });
          } else {
            if (isTimeMax(absoluteText, TimeTypes.ABSOLUTE)) {
              diagnostics.push({
                actions: [],
                from: timeTagAbsoluteNode.from,
                message: CustomErrorCodes.MaxAbsoluteTime().message,
                severity: 'error',
                to: timeTagAbsoluteNode.to,
              });
            } else {
              if (!isTimeBalanced(absoluteText, TimeTypes.ABSOLUTE)) {
                diagnostics.push({
                  actions: [],
                  from: timeTagAbsoluteNode.from,
                  message: CustomErrorCodes.UnbalancedTime(getDoyTime(new Date(getUnixEpochTime(absoluteText))))
                    .message,
                  severity: 'warning',
                  to: timeTagAbsoluteNode.to,
                });
              }
            }
          }
        } else if (timeTagEpochNode) {
          const epochText = text.slice(timeTagEpochNode.from + 1, timeTagEpochNode.to).trim();
          const isValid = validateTime(epochText, TimeTypes.EPOCH) || validateTime(epochText, TimeTypes.EPOCH_SIMPLE);
          if (!isValid) {
            diagnostics.push({
              actions: [],
              from: timeTagEpochNode.from,
              message: CustomErrorCodes.InvalidEpochTime().message,
              severity: 'error',
              to: timeTagEpochNode.to,
            });
          } else {
            if (validateTime(epochText, TimeTypes.EPOCH)) {
              if (isTimeMax(epochText, TimeTypes.EPOCH)) {
                diagnostics.push({
                  actions: [],
                  from: timeTagEpochNode.from,
                  message: CustomErrorCodes.MaxEpochTime(parseDurationString(epochText, 'seconds').isNegative).message,
                  severity: 'error',
                  to: timeTagEpochNode.to,
                });
              } else {
                if (!isTimeBalanced(epochText, TimeTypes.EPOCH)) {
                  diagnostics.push({
                    actions: [],
                    from: timeTagEpochNode.from,
                    message: CustomErrorCodes.UnbalancedTime(getBalancedDuration(epochText)).message,
                    severity: 'warning',
                    to: timeTagEpochNode.to,
                  });
                }
              }
            }
          }
        } else if (timeTagRelativeNode) {
          const relativeText = text.slice(timeTagRelativeNode.from + 1, timeTagRelativeNode.to).trim();
          const isValid =
            validateTime(relativeText, TimeTypes.RELATIVE) || validateTime(relativeText, TimeTypes.RELATIVE_SIMPLE);
          if (!isValid) {
            diagnostics.push({
              actions: [],
              from: timeTagRelativeNode.from,
              message: CustomErrorCodes.InvalidRelativeTime().message,
              severity: 'error',
              to: timeTagRelativeNode.to,
            });
          } else {
            if (validateTime(relativeText, TimeTypes.RELATIVE)) {
              if (isTimeMax(relativeText, TimeTypes.RELATIVE)) {
                diagnostics.push({
                  actions: [],
                  from: timeTagRelativeNode.from,
                  message: CustomErrorCodes.MaxRelativeTime().message,
                  severity: 'error',
                  to: timeTagRelativeNode.to,
                });
              } else {
                if (!isTimeBalanced(relativeText, TimeTypes.EPOCH)) {
                  diagnostics.push({
                    actions: [],
                    from: timeTagRelativeNode.from,
                    message: CustomErrorCodes.UnbalancedTime(getBalancedDuration(relativeText)).message,
                    severity: 'error',
                    to: timeTagRelativeNode.to,
                  });
                }
              }
            }
          }
        }
      }

      // Validate the command and push the generated diagnostics to the array
      diagnostics.push(...validateCommand(command, text, 'command', variables));

      // Lint the metadata and models
      diagnostics.push(...validateMetadata(command));
      diagnostics.push(...validateModel(command));
    }

    // Return the array of diagnostics
    return diagnostics;
  }

  /**
   * Function to generate diagnostics for immediate commands in the parse tree.
   *
   * @param {SyntaxNode[] | undefined} commandNodes - Array of command nodes or undefined.
   * @param {string} text - Text of the sequence.
   * @return {Diagnostic[]} Array of diagnostics.
   */
  function immediateCommandLinter(
    commandNodes: SyntaxNode[] | undefined,
    text: string,
    variables: VariableMap,
  ): Diagnostic[] {
    // If there are no command nodes, return the empty array
    if (!commandNodes) {
      return [];
    }
    // Initialize an array to hold diagnostics

    const diagnostics: Diagnostic[] = [];

    // Iterate over each command node
    for (const command of commandNodes) {
      // Get the TimeTag node for the current command
      const timeTagNode = command.getChild('TimeTag');

      // If the TimeTag node exists, create a diagnostic
      if (timeTagNode) {
        diagnostics.push({
          actions: [],
          from: command.from,
          message: "Immediate commands can't have a time tag",
          severity: 'error',
          to: command.to,
        });
      }

      // Validate the command and push the generated diagnostics to the array
      diagnostics.push(...validateCommand(command, text, 'immediate', variables));

      // Lint the metadata
      diagnostics.push(...validateMetadata(command));

      // immediate commands don't have models
      const modelsNode = command.getChild('Models');
      if (modelsNode) {
        diagnostics.push({
          from: modelsNode.from,
          message: "Immediate commands can't have models",
          severity: 'error',
          to: modelsNode.to,
        });
      }
    }

    // Return the array of diagnostics
    return diagnostics;
  }

  /**
   * Function to generate diagnostics based on HardwareCommands section in the parse tree.
   *
   * @param {SyntaxNode[] | undefined} commands - nodes representing hardware commands
   * @param {string} text - the text to validate against
   * @return {Diagnostic[]} an array of diagnostics
   */
  function hardwareCommandLinter(commands: SyntaxNode[] | undefined, text: string): Diagnostic[] {
    // Initialize an empty array to hold diagnostics
    const diagnostics: Diagnostic[] = [];

    // If there are no command nodes, return an empty array of diagnostics
    if (!commands) {
      return diagnostics;
    }

    // Iterate over each command node
    for (const command of commands) {
      // Get the TimeTag node for the current command
      const timeTag = command.getChild('TimeTag');

      // If the TimeTag node exists, create a diagnostic
      if (timeTag) {
        // Push a diagnostic to the array indicating that time tags are not allowed for hardware commands
        diagnostics.push({
          actions: [],
          from: command.from,
          message: 'Time tag is not allowed for hardware commands',
          severity: 'error',
          to: command.to,
        });
      }

      // Validate the command and push the generated diagnostics to the array
      diagnostics.push(...validateCommand(command, text, 'hardware', {}));

      // Lint the metadata
      diagnostics.push(...validateMetadata(command));

      // hardware commands don't have models
      const modelsNode = command.getChild('Models');
      if (modelsNode) {
        diagnostics.push({
          actions: [],
          from: modelsNode.from,
          message: "Immediate commands can't have models",
          severity: 'error',
          to: modelsNode.to,
        });
      }
    }

    // Return the array of diagnostics
    return diagnostics;
  }

  /**
   * Validates a command by validating its stem and arguments.
   *
   * @param command - The SyntaxNode representing the command.
   * @param text - The text of the whole command.
   * @returns An array of Diagnostic objects representing the validation errors.
   */
  function validateCommand(
    command: SyntaxNode,
    text: string,
    type: 'command' | 'immediate' | 'hardware' = 'command',
    variables: VariableMap,
  ): Diagnostic[] {
    // If the command dictionary is not initialized, return an empty array of diagnostics.
    if (!commandDictionary) {
      return [];
    }

    // Get the stem node of the command.
    const stem = command.getChild('Stem');
    // If the stem node is null, return an empty array of diagnostics.
    if (stem === null) {
      return [];
    }

    const stemText = text.slice(stem.from, stem.to);

    // Initialize an array to store the diagnostic errors.
    const diagnostics: Diagnostic[] = [];

    // Validate the stem of the command.
    const result = validateStem(stem, stemText, type);
    // No command dictionary return [].
    if (result === null) {
      return [];
    }

    // Stem was invalid.
    else if (typeof result === 'object' && 'message' in result) {
      diagnostics.push(result);
      return diagnostics;
    }

    const argNode = command.getChild('Args');
    const dictArgs = (result as FswCommand).arguments ?? [];

    // Lint the arguments of the command.
    diagnostics.push(
      ...validateAndLintArguments(
        dictArgs,
        argNode ? getChildrenNode(argNode) : null,
        command,
        text,
        stemText,
        variables,
      ),
    );

    // Return the array of diagnostics.
    return diagnostics;
  }

  /**
   * Validates the stem of a command.
   * @param stem - The SyntaxNode representing the stem of the command.
   * @param stemText - The command name
   * @param type - The type of command (default: 'command').
   * @returns A Diagnostic if the stem is invalid, a FswCommand if the stem is valid, or null if the command dictionary is not initialized.
   */
  function validateStem(
    stem: SyntaxNode,
    stemText: string,
    type: 'command' | 'immediate' | 'hardware' = 'command',
  ): Diagnostic | FswCommand | HwCommand | null {
    if (commandDictionary === null) {
      return null;
    }
    const { fswCommandMap, fswCommands, hwCommandMap, hwCommands } = commandDictionary;

    const dictionaryCommand: FswCommand | HwCommand | null = fswCommandMap[stemText]
      ? fswCommandMap[stemText]
      : hwCommandMap[stemText]
        ? hwCommandMap[stemText]
        : null;

    if (!dictionaryCommand) {
      const ALL_STEMS = [...fswCommands.map(cmd => cmd.stem), ...hwCommands.map(cmd => cmd.stem)];
      return {
        actions: closestStrings(stemText.toUpperCase(), ALL_STEMS, 3).map(guess => ({
          apply(view, from, to) {
            view.dispatch({ changes: { from, insert: guess, to } });
          },
          name: `Change to ${guess}`,
        })),
        from: stem.from,
        message: `Command '${stemText}' not found`,
        severity: 'error',
        to: stem.to,
      };
    }

    switch (type) {
      case 'command':
      case 'immediate':
        if (!fswCommandMap[stemText]) {
          return {
            from: stem.from,
            message: 'Command must be a fsw command',
            severity: 'error',
            to: stem.to,
          };
        }
        break;
      case 'hardware':
        if (!hwCommandMap[stemText]) {
          return {
            from: stem.from,
            message: 'Command must be a hardware command',
            severity: 'error',
            to: stem.to,
          };
        }
        break;
    }

    return dictionaryCommand;
  }

  /**
   * Validates and lints the command arguments based on the dictionary of command arguments.
   * @param dictArgs - The dictionary of command arguments.
   * @param argNode - The SyntaxNode representing the arguments of the command.
   * @param command - The SyntaxNode representing the command.
   * @param text - The text of the document.
   * @returns An array of Diagnostic objects representing the validation errors.
   */
  function validateAndLintArguments(
    dictArgs: FswCommandArgument[],
    argNode: SyntaxNode[] | null,
    command: SyntaxNode,
    text: string,
    stem: string,
    variables: VariableMap,
  ): Diagnostic[] {
    // Initialize an array to store the validation errors
    let diagnostics: Diagnostic[] = [];

    // Validate argument presence based on dictionary definition
    if (dictArgs.length > 0) {
      if (!argNode || argNode.length === 0) {
        diagnostics.push({
          actions: [],
          from: command.from,
          message: 'The command is missing arguments.',
          severity: 'error',
          to: command.to,
        });
        return diagnostics;
      }

      if (argNode.length > dictArgs.length) {
        const extraArgs = argNode.slice(dictArgs.length);
        const { from, to } = getFromAndTo(extraArgs);
        diagnostics.push({
          actions: [
            {
              apply(view, from, to) {
                view.dispatch({ changes: { from, to } });
              },
              name: `Remove ${extraArgs.length} extra argument${extraArgs.length > 1 ? 's' : ''}`,
            },
          ],
          from,
          message: `Extra arguments, definition has ${dictArgs.length}, but ${argNode.length} are present`,
          severity: 'error',
          to,
        });
        return diagnostics;
      } else if (argNode.length < dictArgs.length) {
        const { from, to } = getFromAndTo(argNode);
        const pluralS = dictArgs.length > argNode.length + 1 ? 's' : '';
        diagnostics.push({
          actions: [
            {
              apply(view, _from, _to) {
                if (commandDictionary) {
                  addDefaultArgs(commandDictionary, view, command, dictArgs.slice(argNode.length));
                }
              },
              name: `Add default missing argument${pluralS}`,
            },
          ],
          from,
          message: `Missing argument${pluralS}, definition has ${argNode.length}, but ${dictArgs.length} are present`,
          severity: 'error',
          to,
        });
        return diagnostics;
      }
    } else if (argNode && argNode.length > 0) {
      const { from, to } = getFromAndTo(argNode);
      diagnostics.push({
        actions: [
          {
            apply(view, from, to) {
              view.dispatch({ changes: { from, to } });
            },
            name: `Remove argument${argNode.length > 1 ? 's' : ''}`,
          },
        ],
        from: from,
        message: 'The command should not have arguments',
        severity: 'error',
        to: to,
      });
      return diagnostics;
    }

    // don't check any further as there are no arguments in the command dictionary
    if (dictArgs.length === 0) {
      return diagnostics;
    }

    const argValues = argNode?.map(arg => text.slice(arg.from, arg.to)) ?? [];

    // grab the first argument node
    // let node = argNode?.firstChild ?? null;

    // Iterate through the dictionary of command arguments
    for (let i = 0; i < dictArgs.length; i++) {
      const dictArg = dictArgs[i]; // Get the current dictionary argument
      const arg = argNode?.[i]; // Get the current argument node
      // Check if there are no more argument nodes
      if (!arg) {
        // Push a diagnostic error for missing argument
        diagnostics.push({
          actions: [],
          from: command.from,
          message: `Missing argument #${i + 1}, '${dictArg.name}' of type '${dictArg.arg_type}'`,
          severity: 'error',
          to: command.to,
        });
        break;
      }

      // Validate and lint the current argument node
      diagnostics = diagnostics.concat(
        ...validateArgument(dictArg, arg, command, text, stem, argValues.slice(0, i), variables),
      );
    }

    // Return the array of validation errors
    return diagnostics;
  }

  /**
+ * Validates the given FSW command argument against the provided syntax node,
+ * and generates diagnostics if the validation fails.
+ *
+ * @param dictArg The FSW command argument to validate.
+ * @param argNode The syntax node to validate against.
+ * @param command The command node containing the argument node.
+ * @param text The full text of the document.
+ * @returns An array of diagnostics generated during the validation.
+ */
  function validateArgument(
    dictArg: FswCommandArgument,
    argNode: SyntaxNode,
    command: SyntaxNode,
    text: string,
    stemText: string,
    precedingArgValues: string[],
    variables: VariableMap,
  ): Diagnostic[] {
    dictArg = getCustomArgDef(stemText, dictArg, precedingArgValues, parameterDictionaries, channelDictionary);

    const diagnostics: Diagnostic[] = [];

    const dictArgType = dictArg.arg_type;
    const argType = argNode.name;
    const argText = text.slice(argNode.from, argNode.to);

    switch (dictArgType) {
      case 'enum':
        if (argType === 'Enum') {
          if (!variables[argText]) {
            // TODO -- potentially check that variable types match usage
            diagnostics.push({
              from: argNode.from,
              message: `Unrecognized variable name ${argText}`,
              severity: 'error',
              to: argNode.to,
            });
          }
        } else if (argType !== 'String') {
          diagnostics.push({
            actions: [],
            from: argNode.from,
            message: `Incorrect type - expected double quoted 'enum' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        } else {
          if (commandDictionary) {
            const symbols = getAllEnumSymbols(commandDictionary?.enumMap, dictArg.enum_name) ?? dictArg.range ?? [];
            const unquotedArgText = argText.replace(/^"|"$/g, '');
            if (!symbols.includes(unquotedArgText)) {
              const guess = closest(unquotedArgText.toUpperCase(), symbols);
              diagnostics.push({
                actions: [
                  {
                    apply(view, from, to) {
                      view.dispatch({ changes: { from, insert: `"${guess}"`, to } });
                    },
                    name: `Change to ${guess}`,
                  },
                ],
                from: argNode.from,
                message: `Enum should be "${symbols.slice(0, MAX_ENUMS_TO_SHOW).join(' | ')}${symbols.length > MAX_ENUMS_TO_SHOW ? ' ...' : ''}"\n`,
                severity: 'error',
                to: argNode.to,
              });
              break;
            }
          }
        }
        break;
      case 'float':
      case 'integer':
      case 'numeric':
      case 'unsigned':
        if (argType === 'Number') {
          if (dictArg.range === null) {
            break;
          }
          const { max, min } = dictArg.range;
          const nodeTextAsNumber = parseFloat(argText);

          if (nodeTextAsNumber < min || nodeTextAsNumber > max) {
            const message =
              max !== min
                ? `Number out of range. Range is between ${min} and ${max} inclusive.`
                : `Number out of range. Range is ${min}.`;
            diagnostics.push({
              actions:
                max === min
                  ? [
                      {
                        apply(view, from, to) {
                          view.dispatch({ changes: { from, insert: `${min}`, to } });
                        },
                        name: `Change to ${min}`,
                      },
                    ]
                  : [],
              from: argNode.from,
              message,
              severity: 'error',
              to: argNode.to,
            });
          }
        } else if (argType === 'Enum') {
          if (!variables[argText]) {
            diagnostics.push({
              from: argNode.from,
              message: `Unrecognized variable name ${argText}`,
              severity: 'error',
              to: argNode.to,
            });
          }
        } else {
          diagnostics.push({
            from: argNode.from,
            message: `Incorrect type - expected 'Number' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        }
        break;
      case 'fixed_string':
      case 'var_string':
        if (argType === 'Enum') {
          if (!variables[argText]) {
            const insert = closest(argText, Object.keys(variables));
            diagnostics.push({
              actions: [
                {
                  apply(view, from, to) {
                    view.dispatch({ changes: { from, insert, to } });
                  },
                  name: `Change to ${insert}`,
                },
              ],
              from: argNode.from,
              message: `Unrecognized variable name ${argText}`,
              severity: 'error',
              to: argNode.to,
            });
          }
        } else if (argType !== 'String') {
          diagnostics.push({
            from: argNode.from,
            message: `Incorrect type - expected 'String' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        }
        break;
      case 'repeat':
        if (argType !== TOKEN_REPEAT_ARG) {
          diagnostics.push({
            from: argNode.from,
            message: `Incorrect type - expected '${TOKEN_REPEAT_ARG}' but got ${argType}`,
            severity: 'error',
            to: argNode.to,
          });
        } else {
          const repeatNodes = argNode.getChildren('Arguments');
          const repeatDef = dictArg.repeat;
          if (repeatDef) {
            const repeatLength = repeatDef.arguments.length;
            const minSets = repeatDef.min ?? 0;
            const maxSets = repeatDef.max ?? Infinity;
            const minCount = repeatLength * minSets;
            const maxCount = repeatLength * maxSets;
            if (minCount > repeatNodes.length) {
              diagnostics.push({
                actions: [],
                from: argNode.from,
                message: `Repeat argument should have at least ${minCount} value${minCount !== 0 ? 's' : ''} but has ${
                  repeatNodes.length
                }`,
                severity: 'error',
                to: argNode.to,
              });
            } else if (maxCount < repeatNodes.length) {
              diagnostics.push({
                actions: [],
                from: argNode.from,
                message: `Repeat argument should have at most ${maxCount} value${maxCount !== 0 ? 's' : ''} but has ${
                  repeatNodes.length
                }`,
                severity: 'error',
                to: argNode.to,
              });
            } else if (repeatNodes.length % repeatLength !== 0) {
              const allowedValues: number[] = [];
              for (let i = minSets; i <= Math.min(maxSets, minSets + 2); i++) {
                allowedValues.push(i * repeatLength);
              }
              let showEllipses = false;
              if (allowedValues.length) {
                const lastVal = allowedValues[allowedValues.length - 1];
                if (maxCount > lastVal) {
                  if (maxCount > lastVal + repeatLength) {
                    showEllipses = true;
                  }
                  allowedValues.push(maxCount);
                }
              }
              const valStrings = allowedValues.map(i => i.toString());
              if (showEllipses) {
                valStrings.splice(allowedValues.length - 1, 0, '...');
              }

              diagnostics.push({
                actions: [],
                from: argNode.from,
                message: `Repeat argument should have [${valStrings.join(', ')}] values`,
                severity: 'error',
                to: argNode.to,
              });
            } else {
              repeatNodes
                .reduce<SyntaxNode[][]>((acc, node, i) => {
                  const chunkIndex = Math.floor(i / repeatLength);
                  if (!acc[chunkIndex]) {
                    acc[chunkIndex] = [];
                  }
                  acc[chunkIndex].push(node);
                  return acc;
                }, [])
                .forEach((repeat: SyntaxNode[]) => {
                  // check individual args
                  diagnostics.push(
                    ...validateAndLintArguments(repeatDef.arguments ?? [], repeat, command, text, stemText, variables),
                  );
                });
            }
          }
        }

        break;
    }
    return diagnostics;
  }

  function validateId(commandNode: SyntaxNode, text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const idNodes = commandNode.getChildren('IdDeclaration');
    if (idNodes.length) {
      const idNode = idNodes[0];
      const idValNode = idNode.firstChild;
      if (idValNode?.name === 'Enum' || idValNode?.name === 'Number') {
        const { from, to } = getFromAndTo([idValNode]);
        const idVal = text.slice(from, to);
        diagnostics.push({
          actions: idValNode
            ? [
                {
                  apply(view, from, to) {
                    view.dispatch({ changes: { from, insert: quoteEscape(idVal), to } });
                  },
                  name: `Quote ${idVal}`,
                },
              ]
            : [],
          from,
          message: `@ID directives must include double quoted string e.g. '@ID "sequence.name"'`,
          severity: 'error',
          to,
        });
      } else if (!idValNode) {
        diagnostics.push({
          ...getFromAndTo([idNode]),
          message: `@ID directives must include a double quoted string e.g. '@ID "sequence.name"`,
          severity: 'error',
        });
      }
    }
    diagnostics.push(
      ...idNodes.slice(1).map(
        idNode =>
          ({
            ...getFromAndTo([idNode]),
            message: 'Only one @ID directive is allowed per sequence',
            severity: 'error',
          }) as const,
      ),
    );
    return diagnostics;
  }

  /**
   * Validates the metadata of a command node and returns an array of diagnostics.
   * @param commandNode - The command node to validate.
   * @returns An array of diagnostic objects.
   */
  function validateMetadata(commandNode: SyntaxNode): Diagnostic[] {
    // Get the metadata node of the command node
    const metadataNode = commandNode.getChild('Metadata');
    // If there is no metadata node, return an empty array
    if (!metadataNode) {
      return [];
    }
    // Get the metadata entry nodes of the metadata node
    const metadataEntry = metadataNode.getChildren('MetaEntry');
    // If there are no metadata entry nodes, return an empty array
    if (!metadataEntry) {
      return [];
    }

    const diagnostics: Diagnostic[] = [];

    // Iterate over each metadata entry node
    metadataEntry.forEach(entry => {
      // Get the children nodes of the metadata entry node
      const metadataNodeChildren = getChildrenNode(entry);

      if (metadataNodeChildren.length > 2) {
        diagnostics.push({
          actions: [],
          from: entry.from,
          message: `Should only have a 'key' and a 'value'`,
          severity: 'error',
          to: entry.to,
        });
      } else {
        // Define the template for metadata nodes
        const metadataTemplate = ['Key', 'Value'];
        // Iterate over each template node
        for (let i = 0; i < metadataTemplate.length; i++) {
          // Get the name of the template node
          const templateName = metadataTemplate[i];
          // Get the metadata node of the current template node
          const metadataNode = metadataNodeChildren[i];

          // If there is no metadata node, add a diagnostic
          if (!metadataNode) {
            diagnostics.push({
              actions: [],
              from: entry.from,
              message: `Missing ${templateName}`,
              severity: 'error',
              to: entry.to,
            });
            break;
          }

          // If the name of the metadata node is not the template node name
          if (metadataNode.name !== templateName) {
            // Get the name of the deepest node of the metadata node
            const deepestNodeName = getDeepestNode(metadataNode).name;
            // Add a diagnostic based on the name of the deepest node
            switch (deepestNodeName) {
              case 'String':
                break; // do nothing as it is a string
              case 'Number':
              case 'Enum':
              case 'Boolean':
                diagnostics.push({
                  from: metadataNode.from,
                  message: `Incorrect type - expected 'String' but got ${deepestNodeName}`,
                  severity: 'error',
                  to: metadataNode.to,
                });
                break;
              default:
                diagnostics.push({
                  from: entry.from,
                  message: `Missing ${templateName}`,
                  severity: 'error',
                  to: entry.to,
                });
            }
          }
        }
      }
    });

    return diagnostics;
  }

  function validateModel(commandNode: SyntaxNode): Diagnostic[] {
    const models = commandNode.getChild('Models')?.getChildren('Model');
    if (!models) {
      return [];
    }

    const diagnostics: Diagnostic[] = [];

    models.forEach(model => {
      const modelChildren = getChildrenNode(model);
      if (modelChildren.length > 3) {
        diagnostics.push({
          from: model.from,
          message: `Should only have 'Variable', 'value', and 'Offset'`,
          severity: 'error',
          to: model.to,
        });
      } else {
        const modelTemplate = ['Variable', 'Value', 'Offset'];
        for (let i = 0; i < modelTemplate.length; i++) {
          const templateName = modelTemplate[i];
          const modelNode = modelChildren[i];
          if (!modelNode) {
            diagnostics.push({
              from: model.from,
              message: `Missing ${templateName}`,
              severity: 'error',
              to: model.to,
            });
          }

          if (modelNode.name !== templateName) {
            const deepestNodeName = getDeepestNode(modelNode).name;
            if (deepestNodeName === TOKEN_ERROR) {
              diagnostics.push({
                from: model.from,
                message: `Missing ${templateName}`,
                severity: 'error',
                to: model.to,
              });
              break;
            } else {
              if (templateName === 'Variable' || templateName === 'Offset') {
                if (deepestNodeName !== 'String') {
                  diagnostics.push({
                    from: modelNode.from,
                    message: `Incorrect type - expected 'String' but got ${deepestNodeName}`,
                    severity: 'error',
                    to: modelNode.to,
                  });
                  break;
                }
              } else {
                // Value
                if (deepestNodeName !== 'Number' && deepestNodeName !== 'String' && deepestNodeName !== 'Boolean') {
                  diagnostics.push({
                    from: modelNode.from,
                    message: `Incorrect type - expected 'Number', 'String', or 'Boolean' but got ${deepestNodeName}`,
                    severity: 'error',
                    to: modelNode.to,
                  });
                  break;
                }
              }
            }
          }
        }
      }
    });

    return diagnostics;
  }
}
