import type { CommandDictionary, FswCommand, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import tsc from 'typescript';
import type { Diagnostic as ResponseDiagnostic } from '../../types/monaco-internal';
import { findNodeByValue, stripQuotes, validateArguments } from '../workerHelpers';

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
  return processCommands(findCommands(sourceFile, commandDict), commandDict, sourceFile);
}

/**
 * Traverses the TypeScript Abstract Syntax Tree (AST) rooted at the given `node`
 * and finds all the function call expressions whose names exist in the `commandDict`.
 *
 * @param {tsc.Node} node - The root node of the TypeScript AST to traverse.
 * @param {CommandDictionary} commandDict - An object representing a dictionary of command names and their corresponding command objects.
 * @returns {Array<{
 *   argumentsNode: tsc.NodeArray<tsc.Expression>;
 *   commandDictEntry: FswCommand;
 * }>} An array of objects containing information about the found commands in the AST.
 *
 * Each object in the returned array contains:
 * - `argumentsNode`: The NodeArray of arguments for the function call.
 * - `commandDictEntry`: The command object corresponding to the found command name from `commandDict`.
 */
function findCommands(
  node: tsc.Node,
  commandDict: CommandDictionary,
): {
  argumentsNode: tsc.NodeArray<tsc.Expression>;
  commandDictEntry: FswCommand;
}[] {
  // Parse the TypeScript code into a SourceFile
  const nodes: {
    argumentsNode: tsc.NodeArray<tsc.Expression>;
    commandDictEntry: FswCommand;
  }[] = [];
  // Helper function to recursively the AST nodes
  function findCommand(node: tsc.Node) {
    if (tsc.isCallExpression(node)) {
      const expression = node.expression;
      const command_name = tsc.isPropertyAccessExpression(expression)
        ? expression.name.getText()
        : expression.getText();
      if (commandDict.fswCommandMap[command_name]) {
        const args: tsc.NodeArray<tsc.Expression> = node.arguments;
        nodes.push({
          argumentsNode: args,
          commandDictEntry: commandDict.fswCommandMap[command_name],
        });
      }
    }
    tsc.forEachChild(node, childNode => findCommand(childNode));
  }
  findCommand(node);

  return nodes;
}

/**
 * Process commands with their arguments and validate them against a command dictionary.
 *
 * @param {Array} commandsWithArguments - An array containing command information and their corresponding arguments.
 * @param {Object} commandDict - A dictionary containing information about supported commands and their expected arguments.
 * @param {Object} sourceFile - The source file from which the commands are extracted.
 * @returns {Array} - An array of response diagnostics indicating any issues found during processing and validation.
 */
function processCommands(
  commandsWithArguments: {
    argumentsNode: tsc.NodeArray<tsc.Expression>;
    commandDictEntry: FswCommand;
  }[],
  commandDict: CommandDictionary,
  sourceFile: tsc.SourceFile,
): ResponseDiagnostic[] {
  // Initialize an array to store response diagnostics.
  const diagnostics: ResponseDiagnostic[] = [];

  // Function for Processing arguments for pass-by-position
  function processByPosition(expression: tsc.Expression, argument: FswCommandArgument): ResponseDiagnostic[] {
    // Evaluate the expression to get its value.
    const evaluatedExpression = evaluateExpression(expression);

    if ('repeat' in argument) {
      // Range check repeat arguments.
      const rangeCheckErrors = validateArguments(
        expression,
        transformArray(evaluatedExpression as any[][]),
        argument,
        commandDict.enumMap,
        sourceFile,
      );

      // Parameter check for each repeat argument.
      const repeatParameterCheckErrors = (evaluatedExpression as any[][]).flatMap(repeatEntry => {
        if (argument.repeat && repeatEntry.length === argument.repeat.arguments.length) {
          return repeatEntry.map((repeatValue, repeatOrder) => {
            const valueNode = findNodeByValue(expression, repeatValue);
            if (argument.repeat) {
              const argumentErrors = validateArguments(
                valueNode ? valueNode : expression,
                stripQuotes(repeatValue.toString()),
                argument.repeat.arguments[repeatOrder],
                commandDict.enumMap,
                sourceFile,
              );
              return argumentErrors || null;
            }
            return null;
          });
        }
        return null;
      });

      return repeatParameterCheckErrors
        .concat(...[rangeCheckErrors || null])
        .filter(diagnostic => diagnostic !== null) as ResponseDiagnostic[];
    } else {
      // Validate single argument.
      const argumentErrors = validateArguments(
        expression,
        stripQuotes((evaluatedExpression as string).toString()),
        argument,
        commandDict.enumMap,
        sourceFile,
      );
      return argumentErrors ? [argumentErrors] : [];
    }
  }

  // Function to process object notation
  function processObjectArgument(
    argument: tsc.ObjectLiteralExpression,
    commandDictEntry: FswCommand,
    enumMap: any,
    sourceFile: tsc.SourceFile,
  ): ResponseDiagnostic[] {
    const objectProperties = argument.properties.filter(tsc.isPropertyAssignment);
    const expectedArgMap = commandDictEntry.argumentMap;
    const objDiagnostics: ResponseDiagnostic[] = [];

    // Iterate through the discovered arguments and validate them against the command dictionary.
    for (const objectProperty of objectProperties) {
      const clean_arg_name = stripQuotes(objectProperty.name.getText());
      const expected_argument = expectedArgMap[clean_arg_name];

      if (expected_argument === undefined) {
        continue;
      }

      let arg_val = evaluateExpression(objectProperty.initializer);

      if ('repeat' in expected_argument) {
        // Parameter check for each repeat argument.
        const parameterChecks = (arg_val as any[]).flatMap(obj => {
          return Object.entries(obj).map(([key, value]) => {
            const valueNode = findNodeByValue(objectProperty, value);
            if (expected_argument.repeat) {
              const error = validateArguments(
                valueNode ? valueNode.parent : objectProperty,
                stripQuotes(JSON.stringify(value)),
                expected_argument.repeat.argumentMap[key],
                enumMap,
                sourceFile,
              );
              return error || null;
            }
            return null;
          });
        });

        // Range check repeat arguments.
        arg_val = JSON.stringify(arg_val);
        const rangeCheckArg = validateArguments(
          objectProperty,
          arg_val as string,
          expected_argument,
          enumMap,
          sourceFile,
        );

        if (rangeCheckArg) {
          Array.prototype.push.apply(parameterChecks, [rangeCheckArg]);
        }
        objDiagnostics.push(...(parameterChecks.filter(diagnostic => diagnostic !== null) as ResponseDiagnostic[]));
      } else {
        arg_val = stripQuotes((arg_val as string).toString());
        const error = validateArguments(objectProperty, arg_val as string, expected_argument, enumMap, sourceFile);
        if (error) {
          objDiagnostics.push(error);
        }
      }
    }

    return objDiagnostics;
  }

  // Process each command with its arguments.
  for (const command of commandsWithArguments) {
    const { argumentsNode, commandDictEntry } = command;

    // Process each argument for the current command.
    const this_diagnostics = argumentsNode.flatMap((expression, order) => {
      //object notation
      if (tsc.isObjectLiteralExpression(expression)) {
        return processObjectArgument(expression, commandDictEntry, commandDict.enumMap, sourceFile);
      } else {
        // pass-by-position notation
        return processByPosition(expression, commandDictEntry.arguments[order]);
      }
    });

    diagnostics.push(...this_diagnostics);
  }

  // Return the collected response diagnostics.
  return diagnostics;
}

/**
 * Transforms a 2-dimensional array into a JSON string representation of an array of objects.
 * Each object in the resulting array is composed of pairs of consecutive elements from the input array,
 * where the keys are generated based on the index of the element pairs.
 *
 * @param {any[][]} inputArray - The 2-dimensional array to be transformed.
 * @returns {string} - A JSON string representation of the resulting array of objects.
 */
function transformArray(inputArray: any[][]): string {
  const result: any[] = [];

  inputArray.forEach((item, index) => {
    const arg1Key = `arg${index * 2 + 1}`;
    const arg2Key = `arg${index * 2 + 2}`;
    const transformedItem: any = {};

    transformedItem[arg1Key] = item[0];
    transformedItem[arg2Key] = item[1];

    result.push(transformedItem);
  });

  return JSON.stringify(result);
}

/**
 * Evaluates a TypeScript expression recursively and returns the result.
 * The function supports various expression types, including literals, arrays, objects, and binary expressions.
 *
 * @param {tsc.Expression} expression - The TypeScript expression to evaluate.
 * @returns {unknown} - The evaluated result of the expression.
 */
function evaluateExpression(expression: tsc.Expression): unknown {
  //evaluate expressions recursively
  const evaluate = (expr: tsc.Expression): unknown => {
    if (tsc.isNumericLiteral(expr) || tsc.isPrefixUnaryExpression(expr) || tsc.isStringLiteral(expr)) {
      return expr.getText();
    }

    if (tsc.isArrayLiteralExpression(expr)) {
      return expr.elements.map(element => evaluate(element));
    }

    if (tsc.isObjectLiteralExpression(expr)) {
      const properties: Record<string, unknown> = {};
      for (const property of expr.properties) {
        if (tsc.isPropertyAssignment(property)) {
          const propertyName = property.name.getText();
          properties[propertyName] = evaluate(property.initializer);
        }
      }
      return properties;
    }

    if (tsc.isBinaryExpression(expr)) {
      const left = evaluate(expr.left);
      const right = evaluate(expr.right);
      // ignore binary operations for now
      // just return the text
      //
      switch (expr.operatorToken.kind) {
        case tsc.SyntaxKind.PlusToken:
          return `${left}+${right}`;
        case tsc.SyntaxKind.MinusToken:
          return `${left}-${right}`;
        case tsc.SyntaxKind.AsteriskToken:
          return `${left}*${right}`;
        case tsc.SyntaxKind.SlashToken:
          return `${left}/${right}`;
        // Add more cases for other binary operators as needed
      }
    }

    if (tsc.isParenthesizedExpression(expr)) {
      return evaluate(expr.expression);
    }

    // Handle other types of expressions as needed

    // return if expression isn't supported
    return expression.getText();
  };

  return evaluate(expression);
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
