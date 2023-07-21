import type { CommandDictionary, EnumMap, FswCommand } from '@nasa-jpl/aerie-ampcs';
import tsc from 'typescript';
import type { Diagnostic as ResponseDiagnostic } from '../../types/monaco-internal';
import { CustomErrorCodes } from '../customCodes';
import { makeDiagnostic, validateArguments } from '../workerHelpers';

/**
 * Notes for this file.
 *
 * This website is really helpful: https://ts-ast-viewer.com/
 *
 * As a rule of thumb, doing `node.forEachChildren(child => {})` gives you a cleaner set of children:
 *  - Seems to remove some somewhat extraneous nodes (those that unwrap to the same things)
 *  - "Iterates all the child nodes that are properties of the node"
 *
 * On the other hand, ".getChildren() - Returns all the children including the all the tokens (ex. OpenBraceToken, SemiColonToken etc.)"
 * This may or may not be what you want!! But it should be useful regardless.
 */

/**
 * Given some argument to a command, process it.
 * Processes a single object, string, number, or similar. Objects can have many properties, each of which is checked independently.
 * @param argument The `tsc.Expression` that this argument actually is
 * @param commandName The name of this command as a string
 * @param commandNode The command node
 * @returns
 */
function processCommandArgument(
  argument: tsc.Expression,
  commandName: string,
  commandNode: tsc.Node,
  commandDictEntry: FswCommand,
  enumMap: EnumMap,
  sourceFile: tsc.SourceFile,
): ResponseDiagnostic[] {
  if (tsc.isObjectLiteralExpression(argument)) {
    // If the arg is a string literal, we need to strip quotes
    const discoveredArgs = argument.properties.filter(tsc.isPropertyAssignment);
    const expectedArgMap = commandDictEntry.argumentMap;
    const diagnostics = validateArguments(discoveredArgs, expectedArgMap, enumMap, sourceFile);
    return diagnostics;
  } else if (tsc.isStringLiteral(argument)) {
    return [makeDiagnostic(CustomErrorCodes.UncaughtArgumentType(), sourceFile, argument)];
  } else {
    return [makeDiagnostic(CustomErrorCodes.UncaughtArgumentType(), sourceFile, argument)];
  }
}

/**
 * Validate COMMAND_NAME's arguments with the command dictionary.
 *
 * We extracts the commands by starting with the ObjectLiteralExpression and checking if the parent exist
 * in the command dictionary. If a COMMAND_NAME doesn't exist the original Monaco editor will already show
 * the error. This check only cares about commands with arguments.
 *
 * For example:
 *
 * COMMAND_NAME({arg1 : value1, arg2 : value2, ...}),
 *
 * @param {tsc.SourceFile} sourceFile - The source file to search for arguments.
 * @param {CommandDictionary} commandDict - The command dictionary containing command definitions.
 * @returns {ResponseDiagnostic[]} - An array of response diagnostics representing validation errors.
 */
function findAndValidateArguments(sourceFile: tsc.SourceFile, commandDict: CommandDictionary): ResponseDiagnostic[] {
  // ignore this check if we don't have a command dictionary
  if (!commandDict || Object.entries(commandDict).length === 0) {
    return [];
  }

  // find only commands that have arguments
  const commandsWithArguments =
    tsc.forEachChild(sourceFile, node => {
      const nodes: {
        argumentsNode: tsc.NodeArray<tsc.Expression>;
        commandDictEntry: FswCommand;
        name: string;
        tsNode: tsc.ObjectLiteralExpression;
      }[] = [];

      function visitNode(node: tsc.Node) {
        const parent = node.parent;
        if (tsc.isCallExpression(parent) && tsc.isObjectLiteralExpression(node)) {
          const expression = parent.expression;
          const command_name = tsc.isPropertyAccessExpression(expression)
            ? expression.name.getText()
            : expression.getText();
          if (commandDict.fswCommandMap[command_name]) {
            nodes.push({
              argumentsNode: parent.arguments,
              commandDictEntry: commandDict.fswCommandMap[command_name],
              name: command_name,
              tsNode: node,
            });
          }
        }
        tsc.forEachChild(node, visitNode);
      }
      tsc.forEachChild(node, visitNode);

      return nodes;
    }) ?? [];

  let diagnostics: ResponseDiagnostic[] = [];

  for (const command of commandsWithArguments) {
    const commandName = command.name;
    const this_diagnostics: ResponseDiagnostic[] = command.argumentsNode.flatMap(argument => {
      return processCommandArgument(
        argument,
        commandName,
        command.tsNode,
        command.commandDictEntry,
        commandDict.enumMap,
        sourceFile,
      );
    });

    diagnostics = [...diagnostics, ...this_diagnostics];
  }

  return diagnostics;
}

/**
 * Find validation issues with a particular file and it's command dict
 *
 * Assumptions:
 *  Command arguments will all be basic types (objects, strings, numbers, etc)
 *    -> NOT IIFEs or function executions
 *
 * @param fileName The internal name of a file, used to get the symbols
 * @param languageService The TS language service. comes from the worker
 * @param commandDict The command dict relevant to this file
 * @returns A set of diagnostics
 */
export function generateCommandArgumentDiagnostics(
  fileName: string,
  languageService: tsc.LanguageService,
  commandDict: CommandDictionary,
): ResponseDiagnostic[] {
  const program = languageService.getProgram();

  if (program === undefined) {
    return [];
  }

  const typechecker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);

  if (sourceFile === undefined) {
    return [];
  }

  const sourceFileSymbol = typechecker.getSymbolAtLocation(sourceFile)?.getDeclarations()?.[0] as
    | tsc.SourceFile
    | undefined;

  if (sourceFileSymbol === undefined) {
    return [];
  }

  return findAndValidateArguments(sourceFileSymbol, commandDict);
}
