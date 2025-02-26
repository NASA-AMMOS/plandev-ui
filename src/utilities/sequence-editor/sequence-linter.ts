import { syntaxTree } from '@codemirror/language';
import { type Diagnostic } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
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
import {
  RULE_ARGS,
  RULE_SEQUENCE_NAME,
  TOKEN_ACTIVATE,
  TOKEN_COMMAND,
  TOKEN_LOAD,
  TOKEN_REPEAT_ARG,
  TOKEN_REQUEST,
} from '../../constants/seq-n-grammar-constants';
import { TimeTypes } from '../../enums/time';
import type { GlobalType } from '../../types/global-type';
import type { ISequenceAdaptation, LibrarySequence } from '../../types/sequencing';
import { CustomErrorCodes } from '../../workers/customCodes';
import { pluralize } from '../text';
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
import { closeSuggestion, computeBlocks, openSuggestion } from './languages/seq-n/custom-folder';
import { SeqNCommandInfoMapper } from './languages/seq-n/seq-n-tree-utils';
import { TOKEN_ERROR } from './sequence-constants';
import { addDefaultArgs, addDefaultVariableArgs, isHexValue, parseNumericArg, quoteEscape } from './sequence-utils';
import { getChildrenNode, getDeepestNode, getFromAndTo } from './tree-utils';

const KNOWN_DIRECTIVES = [
  'LOAD_AND_GO',
  'ID',
  'IMMEDIATE',
  'HARDWARE',
  'LOCALS',
  'INPUT_PARAMS',
  'INPUT_PARAMS_BEGIN',
  'INPUT_PARAMS_END',
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

type VariableMap = {
  [name: string]: VariableDeclaration;
};

/**
 * Linter function that returns a Code Mirror extension function.
 * Can be optionally called with a command dictionary so it's available during linting.
 */
export function sequenceLinter(
  view: EditorView,
  sequenceAdaptation: ISequenceAdaptation,
  channelDictionary: ChannelDictionary | null = null,
  commandDictionary: CommandDictionary | null = null,
  parameterDictionaries: ParameterDictionary[] = [],
  librarySequences: LibrarySequence[] = [],
  globalVariables: GlobalType[],
): Diagnostic[] {
  const tree = syntaxTree(view.state);
  const treeNode = tree.topNode;
  const docText = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];

  diagnostics.push(...validateParserErrors(tree));

  // TODO: Get identify type mapping to use
  const variables: VariableDeclaration[] = [
    ...(globalVariables.map(g => ({ name: g.name, type: 'STRING' }) as const) ?? []),
  ];

  // Validate top level metadata
  diagnostics.push(...validateMetadata(treeNode));

  diagnostics.push(...validateId(treeNode, docText));

  const localsValidation = validateVariables(treeNode.getChildren('LocalDeclaration'), docText, 'LOCALS');
  variables.push(...localsValidation.variables);
  diagnostics.push(...localsValidation.diagnostics);

  const parameterValidation = validateVariables(treeNode.getChildren('ParameterDeclaration'), docText, 'INPUT_PARAMS');
  variables.push(...parameterValidation.variables);
  diagnostics.push(...parameterValidation.diagnostics);

  const variableMap: VariableMap = {};
  for (const variable of variables) {
    variableMap[variable.name] = variable;
  }

  // Validate command type mixing
  diagnostics.push(...validateCommandTypeMixing(treeNode));

  diagnostics.push(...validateCustomDirectives(treeNode, docText));

  const commandsNode = treeNode.getChild('Commands');
  if (commandsNode) {
    diagnostics.push(
      ...commandLinter(
        sequenceAdaptation,
        [
          ...commandsNode.getChildren(TOKEN_COMMAND),
          ...commandsNode.getChildren(TOKEN_LOAD), // TODO: remove in the library sequence PR because that check should validate load and activates
          ...commandsNode.getChildren(TOKEN_ACTIVATE), // TODO: remove in the library sequence PR because that check should validate load and activates
        ],
        docText,
        variableMap,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    );
    diagnostics.push(
      ...validateRequests(
        commandsNode.getChildren(TOKEN_REQUEST),
        docText,
        variableMap,
        sequenceAdaptation,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    );
    diagnostics.push(
      ...validateActivateLoad(commandsNode.getChildren(TOKEN_ACTIVATE), docText, librarySequences),
      ...validateActivateLoad(commandsNode.getChildren(TOKEN_LOAD), docText, librarySequences),
    );
  }

  diagnostics.push(
    ...immediateCommandLinter(
      [
        ...(treeNode.getChild('ImmediateCommands')?.getChildren(TOKEN_COMMAND) ?? []),
        ...(treeNode.getChild('ImmediateCommands')?.getChildren(TOKEN_LOAD) ?? []),
        ...(treeNode.getChild('ImmediateCommands')?.getChildren(TOKEN_ACTIVATE) ?? []),
      ],
      docText,
      variableMap,
      sequenceAdaptation,
      commandDictionary,
      channelDictionary,
      parameterDictionaries,
    ),
  );

  diagnostics.push(
    ...hardwareCommandLinter(
      sequenceAdaptation,
      treeNode.getChild('HardwareCommands')?.getChildren(TOKEN_COMMAND) || [],
      docText,
      commandDictionary,
      channelDictionary,
      parameterDictionaries,
    ),
  );

  diagnostics.push(...conditionalAndLoopKeywordsLinter(view.state));

  return diagnostics;
}

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

function conditionalAndLoopKeywordsLinter(state: EditorState): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const blocks = computeBlocks(state);

  if (blocks) {
    const pairs = Object.values(blocks);
    pairs.forEach(pair => {
      if (!pair.start && pair.end) {
        const stem = state.sliceDoc(pair.end.from, pair.end.to);
        diagnostics.push({
          from: pair.end.from,
          message: `${stem} must match a preceding ${openSuggestion(stem)}`,
          severity: 'error',
          to: pair.end.to,
        });
      } else if (pair.start && !pair.end) {
        const stem = state.sliceDoc(pair.start.from, pair.start.to);
        const suggestion = closeSuggestion(stem);
        diagnostics.push({
          actions: [
            {
              apply(view: EditorView) {
                if (pair.start?.parent) {
                  view.dispatch({
                    changes: {
                      from: pair.start?.parent.to,
                      insert: `\nC ${suggestion}\n`,
                    },
                  });
                }
              },
              name: `Insert ${suggestion}`,
            },
          ],
          from: pair.start.from,
          message: `Block opened by ${stem} is not closed`,
          severity: 'error',
          to: pair.start.to,
        });
      }
    });
  }

  return diagnostics;
}

function validateRequests(
  requestNodes: SyntaxNode[],
  text: string,
  variables: VariableMap,
  sequenceAdaptation: ISequenceAdaptation,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const request of requestNodes) {
    // Get the TimeTag node for the current command
    diagnostics.push(...validateTimeTags(request, text));
  }

  diagnostics.push(
    ...requestNodes.flatMap(request =>
      commandLinter(
        sequenceAdaptation,
        request.getChild('Steps')?.getChildren(TOKEN_COMMAND) ?? [],
        text,
        variables,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    ),
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
  if ((hasCommands && (hasImmediateCommands || hasHardwareCommands)) || (hasImmediateCommands && hasHardwareCommands)) {
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

export function validateVariables(inputParams: SyntaxNode[], text: string, type: 'INPUT_PARAMS' | 'LOCALS' = 'LOCALS') {
  const variables: VariableDeclaration[] = [];
  const diagnostics: Diagnostic[] = [];

  if (inputParams.length === 0) {
    return {
      diagnostics,
      variables,
    };
  }

  diagnostics.push(
    ...inputParams.slice(1).map(
      inputParam =>
        ({
          ...getFromAndTo([inputParam]),
          message: `There is a maximum of one ${type} directive per sequence`,
          severity: 'error',
        }) as const,
    ),
  );

  if (inputParams[0].getChildren('Variable').length === 0) {
    diagnostics.push({
      from: inputParams[0].from,
      message: `Missing values for ${type} directive`,
      severity: 'error',
      to: inputParams[0].to,
    });
  }

  inputParams[0].getChildren('Variable').forEach(parameter => {
    const typeNode = parameter.getChild('Type');
    const enumNode = parameter.getChild('EnumName');
    const rangeNode = parameter.getChild('Range');
    const objectNode = parameter.getChild('Object');

    const { enumName, name, range, type: variableType } = getVariableInfo(parameter, text);

    if (variableType) {
      if (['FLOAT', 'INT', 'STRING', 'UINT', 'ENUM'].includes(variableType) === false) {
        const node = typeNode ?? objectNode ?? parameter;
        const { from, to } = node;
        diagnostics.push({
          from,
          message: 'Invalid type. Must be FLOAT, INT, STRING, UINT, or ENUM.',
          severity: 'error',
          to,
        });
      } else if (variableType.toLocaleLowerCase() === 'enum' && !enumName) {
        const node = typeNode ?? objectNode ?? parameter;
        const { from, to } = node;
        diagnostics.push({
          from,
          message: '"enum_name" is required for ENUM type.',
          severity: 'error',
          to,
        });
      } else if (variableType.toLocaleLowerCase() !== 'enum' && enumName) {
        const node = enumNode ?? objectNode ?? parameter;
        const { from, to } = node;
        diagnostics.push({
          from,
          message: '"enum_name" is only required for ENUM type.',
          severity: 'error',
          to,
        });
      } else if (variableType.toLocaleLowerCase() === 'string' && range) {
        const node = rangeNode ?? objectNode ?? parameter;
        const { from, to } = node;
        diagnostics.push({
          from,
          message: '"allowable_ranges" is not required for STRING type',
          severity: 'error',
          to,
        });
      }
    }

    const variable = {
      name,
      type: variableType,
    } as VariableDeclaration;

    variables.push(variable);
  });

  return {
    diagnostics,
    variables,
  };
}

function getVariableInfo(
  parameter: SyntaxNode,
  text: string,
): {
  enumName: string | undefined;
  name: string | undefined;
  range: string | undefined;
  type: string | undefined;
  values: string | undefined;
} {
  const nameNode = parameter.getChild('Enum');
  const typeNode = parameter.getChild('Type');
  const objectNode = parameter.getChild('Object');

  if (typeNode) {
    const enumNode = parameter.getChild('EnumName');
    const rangeNode = parameter.getChild('Range');
    const valuesNode = parameter.getChild('Values');
    return {
      enumName: enumNode ? text.slice(enumNode.from, enumNode.to) : undefined,
      name: nameNode ? text.slice(nameNode.from, nameNode.to) : undefined,
      range: rangeNode ? text.slice(rangeNode.from, rangeNode.to) : undefined,
      type: typeNode ? text.slice(typeNode.from, typeNode.to) : undefined,
      values: valuesNode ? text.slice(valuesNode.from, valuesNode.to) : undefined,
    };
  } else if (objectNode) {
    const properties = objectNode.getChildren('Property');
    let range: string | undefined = undefined;
    let type: string | undefined = undefined;
    let enumName: string | undefined = undefined;
    let values: string | undefined = undefined;

    properties.forEach(property => {
      const propertyNameNode = property.getChild('PropertyName');
      const propertyValueNode = propertyNameNode?.nextSibling;

      if (propertyNameNode !== null && propertyValueNode !== null && propertyValueNode !== undefined) {
        const propertyName = text.slice(propertyNameNode.from, propertyNameNode.to);
        const propertyValue = text.slice(propertyValueNode.from, propertyValueNode.to);

        switch (propertyName.toLowerCase()) {
          case '"allowable_ranges"':
            range = propertyValue;
            break;
          case '"enum_name"':
            enumName = propertyValue.replaceAll('"', '');
            break;
          case '"type"':
            type = propertyValue.replaceAll('"', '');
            break;
          case '"allowable_values"':
            values = propertyValue;
            break;
        }
      }
    });

    return {
      enumName,
      name: nameNode ? text.slice(nameNode.from, nameNode.to) : undefined,
      range,
      type,
      values,
    };
  }

  return {
    enumName: undefined,
    name: nameNode ? text.slice(nameNode.from, nameNode.to) : undefined,
    range: undefined,
    type: undefined,
    values: undefined,
  };
}

function validateActivateLoad(node: SyntaxNode[], text: string, librarySequences: LibrarySequence[]): Diagnostic[] {
  if (node.length === 0) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  node.forEach((activate: SyntaxNode) => {
    const sequenceName = activate.getChild(RULE_SEQUENCE_NAME);
    const argNode = activate.getChild(RULE_ARGS);

    if (sequenceName === null || argNode === null) {
      return;
    }
    const library = librarySequences.find(
      sequence => sequence.name === text.slice(sequenceName.from, sequenceName.to).replace(/^"|"$/g, ''),
    );
    const argsNode = getChildrenNode(argNode);
    if (!library) {
      diagnostics.push({
        from: sequenceName.from,
        message: `Sequence doesn't exist ${text.slice(sequenceName.from, sequenceName.to)}`,
        severity: 'warning',
        to: sequenceName.to,
      });
    } else {
      const structureError = validateCommandStructure(activate, argsNode, library.parameters.length, (view: any) => {
        addDefaultVariableArgs(library.parameters.slice(argsNode.length), view, activate, new SeqNCommandInfoMapper());
      });
      if (structureError) {
        diagnostics.push(structureError);
        return;
      }

      library?.parameters.forEach((parameter, index) => {
        const arg = argsNode[index];
        switch (parameter.type) {
          case 'STRING': {
            if (arg.name !== 'String') {
              diagnostics.push({
                from: arg.from,
                message: `"${parameter.name}" must be a string`,
                severity: 'error',
                to: arg.to,
              });
            }
            break;
          }
          case 'FLOAT':
          case 'INT':
          case 'UINT':
            {
              let value = 0;
              const num = text.slice(arg.from, arg.to);
              if (parameter.type === 'FLOAT') {
                value = parseFloat(num);
              } else {
                value = parseInt(num);
              }

              if (parameter.allowable_ranges) {
                const invalidRanges = parameter.allowable_ranges.filter(range => {
                  return value < range.min || value > range.max;
                });
                if (invalidRanges.length === parameter.allowable_ranges.length) {
                  diagnostics.push({
                    from: arg.from,
                    message: `Value must be between ${parameter.allowable_ranges
                      .map(range => {
                        return `[${range.min} and ${range.max}]`;
                      })
                      .join(' or ')}`,
                    severity: 'error',
                    to: arg.to,
                  });
                }
              }

              if (parameter.type === 'UINT') {
                if (value < 0) {
                  diagnostics.push({
                    from: arg.from,
                    message: `UINT must be greater than or equal to zero`,
                    severity: 'error',
                    to: arg.to,
                  });
                }
              }
              if (arg.name !== 'Number') {
                diagnostics.push({
                  from: arg.from,
                  message: `"${parameter.name}" must be a number`,
                  severity: 'error',
                  to: arg.to,
                });
              }
            }
            break;
          case 'ENUM':
            {
              if (arg.name === 'Number' || arg.name === 'Boolean') {
                diagnostics.push({
                  from: arg.from,
                  message: `"${parameter.name}" must be an enum`,
                  severity: 'error',
                  to: arg.to,
                });
              } else if (arg.name !== 'String') {
                diagnostics.push({
                  actions: [],
                  from: argNode.from,
                  message: `Incorrect type - expected double quoted 'enum' but got ${arg.name}`,
                  severity: 'error',
                  to: argNode.to,
                });
              }
              const enumValue = text.slice(arg.from, arg.to).replace(/^"|"$/g, '');
              if (parameter.allowable_values?.indexOf(enumValue) === -1) {
                diagnostics.push({
                  from: arg.from,
                  message: `Enum should be "${parameter.allowable_values?.slice(0, MAX_ENUMS_TO_SHOW).join(' | ')}${parameter.allowable_values!.length > MAX_ENUMS_TO_SHOW ? '...' : ''}"`,
                  severity: 'error',
                  to: arg.to,
                });
              }
            }

            break;
          default:
            break;
        }
      });
    }
  });

  return diagnostics;
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
          apply(view, diagnosticsFrom, diagnosticsTo) {
            view.dispatch({ changes: { from: diagnosticsFrom, insert, to: diagnosticsTo } });
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
    apply(view: EditorView, from: number) {
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
function commandLinter(
  sequenceAdaptation: ISequenceAdaptation,
  commandNodes: SyntaxNode[] | undefined,
  text: string,
  variables: VariableMap,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
): Diagnostic[] {
  // If there are no command nodes, return an empty array of diagnostics
  if (!commandNodes) {
    return [];
  }

  // Initialize an empty array to hold diagnostics
  const diagnostics: Diagnostic[] = [];

  // Iterate over each command node
  for (const command of commandNodes) {
    // Get the TimeTag node for the current command
    diagnostics.push(...validateTimeTags(command, text));

    // TODO: remove in the library sequence PR because that check should validate
    // load and activates
    if (command.name === TOKEN_ACTIVATE || command.name === TOKEN_LOAD) {
      continue;
    }

    // Validate the command and push the generated diagnostics to the array
    diagnostics.push(
      ...validateCommand(
        command,
        text,
        'command',
        variables,
        sequenceAdaptation,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    );

    // Lint the metadata and models
    diagnostics.push(...validateMetadata(command));
    diagnostics.push(...validateModel(command));
  }

  // Return the array of diagnostics
  return diagnostics;
}

function validateTimeTags(command: SyntaxNode, text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const timeTagNode = command.getChild('TimeTag');

  // If the TimeTag node is missing, create a diagnostic
  if (!timeTagNode) {
    diagnostics.push({
      actions: [insertAction(`Insert 'C' (command complete)`, 'C '), insertAction(`Insert 'R1' (relative 1)`, 'R ')],
      from: command.from,
      message: "Missing 'Time Tag' for command",
      severity: 'error',
      to: command.to,
    });
  } else {
    // Commands can't have a ground epoch time tag
    if (command.name === TOKEN_COMMAND && timeTagNode.getChild('TimeGroundEpoch')) {
      diagnostics.push({
        actions: [],
        from: timeTagNode.from,
        message: 'Ground Epoch Time Tags are not allowed for commands',
        severity: 'error',
        to: timeTagNode.to,
      });
    }

    const timeTagAbsoluteNode = timeTagNode?.getChild('TimeAbsolute');
    const timeTagEpochNode = timeTagNode?.getChild('TimeEpoch') ?? timeTagNode.getChild('TimeGroundEpoch');
    const timeTagRelativeNode = timeTagNode?.getChild('TimeRelative');
    const timeTagBlockRelativeNode = timeTagNode?.getChild('TimeBlockRelative');

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
              message: CustomErrorCodes.UnbalancedTime(getDoyTime(new Date(getUnixEpochTime(absoluteText)))).message,
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
    } else if (timeTagRelativeNode || timeTagBlockRelativeNode) {
      let relativeText = '';
      let from = -1;
      let to = -1;

      if (timeTagRelativeNode) {
        from = timeTagRelativeNode.from;
        to = timeTagRelativeNode.to;
        relativeText = text.slice(from + 1, to).trim();
      } else if (timeTagBlockRelativeNode) {
        from = timeTagBlockRelativeNode.from;
        to = timeTagBlockRelativeNode.to;
        relativeText = text.slice(from + 1, to).trim();
      }

      const isValid =
        validateTime(relativeText, TimeTypes.RELATIVE) ||
        (validateTime(relativeText, TimeTypes.RELATIVE_SIMPLE) && !timeTagBlockRelativeNode);
      if (!isValid) {
        diagnostics.push({
          actions: [],
          from,
          message: CustomErrorCodes.InvalidRelativeTime().message,
          severity: 'error',
          to,
        });
      } else {
        if (validateTime(relativeText, TimeTypes.RELATIVE)) {
          if (isTimeMax(relativeText, TimeTypes.RELATIVE)) {
            diagnostics.push({
              actions: [],
              from,
              message: CustomErrorCodes.MaxRelativeTime().message,
              severity: 'error',
              to,
            });
          } else {
            if (!isTimeBalanced(relativeText, TimeTypes.EPOCH)) {
              diagnostics.push({
                actions: [],
                from,
                message: CustomErrorCodes.UnbalancedTime(getBalancedDuration(relativeText)).message,
                severity: 'error',
                to,
              });
            }
          }
        }
      }
    }
  }

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
  sequenceAdaptation: ISequenceAdaptation,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
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
    diagnostics.push(
      ...validateCommand(
        command,
        text,
        'immediate',
        variables,
        sequenceAdaptation,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    );

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
function hardwareCommandLinter(
  sequenceAdaptation: ISequenceAdaptation,
  commands: SyntaxNode[] | undefined,
  text: string,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
): Diagnostic[] {
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
    diagnostics.push(
      ...validateCommand(
        command,
        text,
        'hardware',
        {},
        sequenceAdaptation,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    );

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
  sequenceAdaptation: ISequenceAdaptation,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
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
  const result = validateStem(stem, stemText, type, commandDictionary);
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
      sequenceAdaptation,
      commandDictionary,
      channelDictionary,
      parameterDictionaries,
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
  commandDictionary: CommandDictionary | null,
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
  sequenceAdaptation: ISequenceAdaptation,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
): Diagnostic[] {
  // Initialize an array to store the validation errors
  let diagnostics: Diagnostic[] = [];

  const structureError = validateCommandStructure(command, argNode, dictArgs.length, (view: any) => {
    if (commandDictionary) {
      addDefaultArgs(
        commandDictionary,
        view,
        command,
        dictArgs.slice(argNode ? argNode.length : 0),
        new SeqNCommandInfoMapper(),
      );
    }
  });

  if (structureError) {
    diagnostics.push(structureError);
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
      ...validateArgument(
        dictArg,
        arg,
        command,
        text,
        stem,
        argValues.slice(0, i),
        variables,
        sequenceAdaptation,
        commandDictionary,
        channelDictionary,
        parameterDictionaries,
      ),
    );
  }

  // Return the array of validation errors
  return diagnostics;
}

/**
 * Validates the command structure.
 * @param stemNode - The SyntaxNode representing the command stem.
 * @param argsNode - The SyntaxNode representing the command arguments.
 * @param expectedArgSize - The expected number of arguments.
 * @param addDefault - The function to add default arguments.
 * @returns A Diagnostic object representing the validation error, or undefined if there is no error.
 */
function validateCommandStructure(
  stemNode: SyntaxNode,
  argsNode: SyntaxNode[] | null,
  expectedArgSize: number,
  addDefault: (view: any) => any,
): Diagnostic | undefined {
  if ((!argsNode || argsNode.length === 0) && expectedArgSize === 0) {
    return undefined;
  }
  if (argsNode && argsNode.length > expectedArgSize) {
    const extraArgs = argsNode.slice(expectedArgSize);
    const { from, to } = getFromAndTo(extraArgs);
    const commandArgs = `argument${pluralize(extraArgs.length)}`;
    return {
      actions: [
        {
          apply(view, argsFrom, argsTo) {
            view.dispatch({ changes: { from: argsFrom, to: argsTo } });
          },
          name: `Remove ${extraArgs.length} extra ${commandArgs}`,
        },
      ],
      from,
      message: `Extra ${commandArgs}, definition has ${expectedArgSize}, but ${argsNode.length} are present`,
      severity: 'error',
      to,
    };
  }
  if ((argsNode && argsNode.length < expectedArgSize) || (!argsNode && expectedArgSize > 0)) {
    const { from, to } = getFromAndTo(argsNode ?? [stemNode]);
    const commandArgs = `argument${pluralize(expectedArgSize - (argsNode?.length ?? 0))}`;
    return {
      actions: [
        {
          apply(view) {
            addDefault(view);
          },
          name: `Add default missing ${commandArgs}`,
        },
      ],
      from,
      message: `Missing ${commandArgs}, definition has ${expectedArgSize}, but ${argsNode?.length ?? 0} are present`,
      severity: 'error',
      to,
    };
  }

  return undefined;
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
  sequenceAdaptation: ISequenceAdaptation,
  commandDictionary: CommandDictionary | null,
  channelDictionary: ChannelDictionary | null,
  parameterDictionaries: ParameterDictionary[],
): Diagnostic[] {
  dictArg = getCustomArgDef(
    stemText,
    dictArg,
    precedingArgValues,
    parameterDictionaries,
    channelDictionary,
    sequenceAdaptation,
  );

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
    case 'boolean':
      if (argType !== 'Boolean') {
        diagnostics.push({
          actions: [],
          from: argNode.from,
          message: `Incorrect type - expected 'Boolean' but got ${argType}`,
          severity: 'error',
          to: argNode.to,
        });
      }
      if (['true', 'false'].includes(argText) === false) {
        diagnostics.push({
          actions: [],
          from: argNode.from,
          message: `Incorrect value - expected true or false but got ${argText}`,
          severity: 'error',
          to: argNode.to,
        });
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
        const nodeTextAsNumber = parseNumericArg(argText, dictArgType);
        if (nodeTextAsNumber < min || nodeTextAsNumber > max) {
          const message =
            max !== min
              ? `Number out of range. Range is between ${numFormat(argText, min)} and ${numFormat(argText, max)} inclusive.`
              : `Number out of range. Range is ${numFormat(argText, min)}.`;
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
              message: `Repeat argument should have at least ${minCount} value${pluralize(minCount)} but has ${
                repeatNodes.length
              }`,
              severity: 'error',
              to: argNode.to,
            });
          } else if (maxCount < repeatNodes.length) {
            diagnostics.push({
              actions: [],
              from: argNode.from,
              message: `Repeat argument should have at most ${maxCount} value${pluralize(maxCount)} but has ${
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
                  ...validateAndLintArguments(
                    repeatDef.arguments ?? [],
                    repeat,
                    command,
                    text,
                    stemText,
                    variables,
                    sequenceAdaptation,
                    commandDictionary,
                    channelDictionary,
                    parameterDictionaries,
                  ),
                );
              });
          }
        }
      }

      break;
  }
  return diagnostics;
}

function numFormat(argText: string, num: number): number | string {
  return isHexValue(argText) ? `0x${num.toString(16).toUpperCase()}` : num;
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
                apply(view, diagnosticsFrom, diagnosticsTo) {
                  view.dispatch({ changes: { from: diagnosticsFrom, insert: quoteEscape(idVal), to: diagnosticsTo } });
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
        const metadataNodeChild = metadataNodeChildren[i];

        // If there is no metadata node, add a diagnostic
        if (!metadataNodeChild) {
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
        if (metadataNodeChild.name !== templateName) {
          // Get the name of the deepest node of the metadata node
          const deepestNodeName = getDeepestNode(metadataNodeChild).name;
          // Add a diagnostic based on the name of the deepest node
          switch (deepestNodeName) {
            case 'String':
              break; // do nothing as it is a string
            case 'Number':
            case 'Enum':
            case 'Boolean':
              diagnostics.push({
                from: metadataNodeChild.from,
                message: `Incorrect type - expected 'String' but got ${deepestNodeName}`,
                severity: 'error',
                to: metadataNodeChild.to,
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
